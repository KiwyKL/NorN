import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Robust analyze-image endpoint for OCR / letter analysis.
 * Tries multiple models and endpoint formats.
 * Accepts { imageData: "<base64>", prompt?: "..." }
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseRetry(providerBody: any): number | null {
    try {
        const details = providerBody?.details;
        if (!Array.isArray(details)) return null;
        for (const d of details) {
            if (d["@type"]?.includes("RetryInfo") && d.retryDelay) {
                const m = String(d.retryDelay).match(/([0-9]+)s/);
                if (m) return parseInt(m[1], 10);
            }
        }
    } catch (e) { }
    return null;
}

// Try generateContent with vision (multimodal)
async function tryGenerateContent(apiKey: string, model: string, imageData: string, prompt: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body = {
        contents: [{
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: imageData } },
                { text: prompt }
            ],
            role: 'user'
        }],
        generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024
        }
    };

    console.log(`🔍 Trying vision analysis with ${model}`);

    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify(body)
        });

        const data = await r.json().catch(() => null);
        return { ok: r.ok, status: r.status, body: data };
    } catch (err) {
        return { ok: false, status: 500, body: { error: String(err) } };
    }
}

// Extract text from response
function extractText(body: any): string {
    if (body?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return body.candidates[0].content.parts[0].text;
    }
    if (body?.predictions?.[0]?.outputs?.[0]?.text) {
        return body.predictions[0].outputs[0].text;
    }
    if (body?.output?.text) {
        return body.output.text;
    }
    // Deep search for text
    const find = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        if (typeof obj.text === 'string') return obj.text;
        for (const k of Object.keys(obj)) {
            const t = find(obj[k]);
            if (t) return t;
        }
        return null;
    };
    return find(body) || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server misconfiguration: missing GEMINI_API_KEY' });
    }

    const { imageData, prompt = "Read this letter to Santa and summarize what the child wants." } = req.body;
    if (!imageData) {
        return res.status(400).json({ error: 'Missing imageData (base64)' });
    }

    // Vision-capable models to try
    const models = ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    const triedModels: string[] = [];

    for (const model of models) {
        triedModels.push(model);
        const result = await tryGenerateContent(GEMINI_API_KEY, model, imageData, prompt);

        if (result.ok) {
            const text = extractText(result.body);
            console.log(`✅ Vision analysis succeeded with ${model}`);
            return res.status(200).json({
                text,
                providerModel: model,
                providerBody: text ? undefined : result.body
            });
        }

        // Handle rate limiting
        if (result.status === 429 || result.body?.error?.status === 'RESOURCE_EXHAUSTED') {
            const retry = parseRetry(result.body) ?? 60;
            const more = models.some(m => !triedModels.includes(m));
            if (!more) {
                res.setHeader('Retry-After', String(retry));
                return res.status(429).json({
                    error: 'Provider quota exceeded',
                    retryAfterSeconds: retry,
                    triedModels
                });
            }
            console.log(`⚠️ ${model} rate limited, trying next...`);
            await delay(500);
            continue;
        }

        // 404 - model doesn't support this, try next
        if (result.status === 404) {
            console.log(`❌ ${model} returned 404, trying next...`);
            continue;
        }

        // 5xx - retry once
        if (result.status >= 500 && result.status < 600) {
            console.log(`⚠️ ${model} returned ${result.status}, retrying...`);
            await delay(500);
            const retry = await tryGenerateContent(GEMINI_API_KEY, model, imageData, prompt);
            if (retry.ok) {
                const text = extractText(retry.body);
                return res.status(200).json({ text, providerModel: model });
            }
        }

        console.log(`❌ ${model} failed with status ${result.status}`);
    }

    // All models failed
    return res.status(502).json({
        error: 'All provider attempts failed for analyze-image',
        triedModels
    });
}
