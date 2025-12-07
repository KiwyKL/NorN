import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Robust generateContent endpoint.
 * - Env vars expected:
 *    GEMINI_API_KEY
 *    GEMINI_MODEL (optional) -> preferred model
 *    MODEL_WHITELIST (optional) -> comma-separated models you prefer (high priority)
 *
 * Behavior:
 * 1) Try GEMINI_MODEL if present.
 * 2) If provider returns NOT_FOUND (model doesn't support generateContent for v1beta),
 *    call ListModels and pick a model whose supportedMethods includes "generateContent".
 * 3) Try chosen model(s) in order, handling 429/5xx with retries.
 */

const DEFAULT_GENERATION_CONFIG = {
    temperature: 0.7,
    maxOutputTokens: 800
};

const parseRetrySecondsFromProvider = (providerBody: any): number | null => {
    try {
        if (!providerBody?.details) return null;
        for (const d of providerBody.details) {
            if (d["@type"]?.includes("RetryInfo") && d.retryDelay) {
                const s = d.retryDelay;
                const m = s.match(/([0-9]+)(?:\.[0-9]+)?s/);
                if (m) return parseInt(m[1], 10);
            }
        }
    } catch (e) { }
    return null;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function listModels(apiKey: string) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models";
    const r = await fetch(url, { headers: { "x-goog-api-key": apiKey } });
    if (!r.ok) {
        const pb = await r.json().catch(() => null);
        const err: any = new Error("ListModels failed");
        err.providerStatus = r.status;
        err.providerBody = pb;
        throw err;
    }
    const data = await r.json();
    return data;
}

async function tryGenerateWithModel(apiKey: string, model: string, prompt: string, generationConfig?: any) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const body = {
        contents: [
            { parts: [{ text: String(prompt) }], role: "user" }
        ],
        generationConfig: generationConfig || DEFAULT_GENERATION_CONFIG
    };

    const r = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
        },
        body: JSON.stringify(body),
    });

    const providerBody = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, providerBody };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: "Server misconfiguration: missing GEMINI_API_KEY" });

    const preferred = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : [];
    const whitelist = process.env.MODEL_WHITELIST ? process.env.MODEL_WHITELIST.split(",").map(s => s.trim()).filter(Boolean) : [];

    // build initial candidate list: preferred first, then whitelist
    let candidates = [...new Set([...preferred, ...whitelist])].filter(Boolean);

    // If no candidates provided, use known working models
    if (candidates.length === 0) {
        candidates = ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"];
    }

    let triedModels: string[] = [];

    // Helper to extract text from response
    const extractText = (providerBody: any): string => {
        if (providerBody?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return providerBody.candidates[0].content.parts[0].text;
        }
        if (Array.isArray(providerBody?.predictions) && providerBody.predictions[0]) {
            return JSON.stringify(providerBody.predictions[0]);
        }
        // deep find text
        const find = (obj: any): string | null => {
            if (!obj || typeof obj !== "object") return null;
            if (typeof obj.text === "string") return obj.text;
            for (const k of Object.keys(obj)) {
                const t = find(obj[k]);
                if (t) return t;
            }
            return null;
        };
        return find(providerBody) || "";
    };

    // Helper to attempt a single model with small retry on 5xx
    const attemptModel = async (model: string) => {
        triedModels.push(model);
        console.log(`📝 Trying model: ${model}`);

        try {
            const { ok, status, providerBody } = await tryGenerateWithModel(API_KEY, model, prompt);

            if (ok) {
                const text = extractText(providerBody);
                console.log(`✅ Success with model: ${model}`);
                return { success: true, text, providerModel: model, providerBody };
            }

            // handle specific provider errors
            if (status === 404) {
                console.log(`❌ Model ${model} returned 404 (not found or not supported)`);
                return { success: false, code: 404, providerBody };
            }

            if (status === 429 || providerBody?.error?.status === "RESOURCE_EXHAUSTED") {
                const retrySec = parseRetrySecondsFromProvider(providerBody) ?? 60;
                console.log(`⚠️ Model ${model} rate limited, retry after ${retrySec}s`);
                return { success: false, code: 429, retryAfter: retrySec, providerBody };
            }

            if (status >= 500 && status < 600) {
                // try a single quick retry
                console.log(`⚠️ Model ${model} returned ${status}, retrying once...`);
                await delay(500);
                const r2 = await tryGenerateWithModel(API_KEY, model, prompt);
                if (r2.ok) {
                    const txt = extractText(r2.providerBody);
                    return { success: true, text: txt, providerModel: model, providerBody: r2.providerBody };
                }
                return { success: false, code: status, providerBody };
            }

            console.log(`❌ Model ${model} returned ${status}`);
            return { success: false, code: status, providerBody };
        } catch (err: any) {
            console.error(`❌ Error with model ${model}:`, err);
            return { success: false, code: 500, providerBody: { error: String(err) } };
        }
    };

    try {
        // Try candidates in order
        for (const m of candidates) {
            const out = await attemptModel(m);
            if (out.success) {
                return res.status(200).json({ text: out.text, providerModel: out.providerModel });
            }

            // If 429 and no more candidates, inform client
            if (out.code === 429) {
                const more = candidates.some(c => !triedModels.includes(c));
                if (!more) {
                    res.setHeader("Retry-After", String(out.retryAfter));
                    return res.status(429).json({
                        error: "Provider quota exceeded",
                        retryAfterSeconds: out.retryAfter,
                        triedModels
                    });
                }
                continue;
            }
            // other errors -> continue to next candidate
        }

        // If no candidate succeeded, try to call ListModels and find alternatives
        console.log("📋 Calling ListModels to find available models...");
        try {
            const listResponse = await listModels(API_KEY);
            const modelsArr = Array.isArray(listResponse?.models) ? listResponse.models : [];

            // Filter models that support generateContent
            const availableGenerateModels = modelsArr
                .filter((m: any) => {
                    const methods = m?.supportedGenerationMethods || m?.supportedMethods || [];
                    return methods.includes("generateContent");
                })
                .map((m: any) => m?.name?.replace("models/", "").trim())
                .filter(Boolean);

            console.log(`📋 Found ${availableGenerateModels.length} models supporting generateContent`);

            // Try each available model
            for (const model of availableGenerateModels) {
                if (triedModels.includes(model)) continue;
                const out = await attemptModel(model);
                if (out.success) {
                    return res.status(200).json({ text: out.text, providerModel: out.providerModel });
                }
                if (out.code === 429) {
                    res.setHeader("Retry-After", String(out.retryAfter));
                    return res.status(429).json({
                        error: "Provider quota exceeded",
                        retryAfterSeconds: out.retryAfter,
                        triedModels
                    });
                }
            }
        } catch (listErr) {
            console.error("❌ ListModels failed:", listErr);
        }

        // nothing worked
        return res.status(502).json({
            error: "No available provider model could generate content",
            triedModels,
            note: "All tried models returned errors. Check GEMINI_API_KEY and model availability."
        });
    } catch (err: any) {
        console.error("❌ generateContent handler error:", err);
        return res.status(500).json({ error: "Internal server error", detail: String(err) });
    }
}
