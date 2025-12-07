import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Ultra-robust image generation endpoint.
 * Deep searches for image data in any format the provider returns.
 */

const API_KEY = process.env.GEMINI_API_KEY;
const PRIMARY = process.env.IMAGE_MODEL_PRIMARY || "imagen-4.0-generate";
const FALLBACKS = process.env.IMAGE_MODEL_FALLBACK
    ? process.env.IMAGE_MODEL_FALLBACK.split(",").map(s => s.trim())
    : ["gemini-2.5-flash-preview-image"];

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callModel(model: string, payload: any) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImage`;
    console.log(`🎨 Calling ${model}:generateImage`);

    try {
        const r = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": API_KEY!
            },
            body: JSON.stringify(payload)
        });
        const body = await r.json().catch(() => null);
        return { ok: r.ok, status: r.status, body };
    } catch (err) {
        return { ok: false, status: 500, body: { error: String(err) } };
    }
}

function isBase64(str: any): boolean {
    if (typeof str !== 'string') return false;
    // Heuristic: long base64 strings (avoid false positives)
    return /^[A-Za-z0-9+/=\s]+$/.test(str) && str.length > 100;
}

function isImageUrl(str: any): boolean {
    if (typeof str !== 'string') return false;
    return /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(str)
        || /^https?:\/\/.+\/artifacts\/.+$/i.test(str)
        || str.includes('googleusercontent.com');
}

// Recursively scan object for base64 or image URLs
function findImageData(obj: any, path: string[] = []): { type: 'base64' | 'url', value: string, path: string[] } | null {
    if (!obj || (typeof obj !== 'object' && typeof obj !== 'string')) return null;

    if (typeof obj === 'string') {
        const s = obj.trim();
        // Data URL
        if (s.startsWith('data:image/')) {
            const b64 = s.split(',')[1];
            return { type: 'base64', value: b64, path };
        }
        if (isBase64(s)) {
            return { type: 'base64', value: s, path };
        }
        if (isImageUrl(s)) {
            return { type: 'url', value: s, path };
        }
        return null;
    }

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            const found = findImageData(obj[i], path.concat(`[${i}]`));
            if (found) return found;
        }
        return null;
    }

    // Prioritize common image keys
    const priorityKeys = ['imageData', 'b64_json', 'base64', 'b64', 'bytesBase64Encoded', 'image', 'imageBytes', 'image_uri', 'imageUri', 'data'];
    for (const key of priorityKeys) {
        if (key in obj) {
            const found = findImageData(obj[key], path.concat(key));
            if (found) return found;
        }
    }

    // Deep-scan all other keys
    for (const key of Object.keys(obj)) {
        if (priorityKeys.includes(key)) continue; // Already checked
        const found = findImageData(obj[key], path.concat(key));
        if (found) return found;
    }

    return null;
}

async function fetchUrlToBase64(url: string): Promise<string | null> {
    console.log(`📥 Fetching image URL: ${url.substring(0, 100)}...`);
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
        const ab = await r.arrayBuffer();
        return Buffer.from(ab).toString('base64');
    } catch (e: any) {
        console.warn('fetchUrlToBase64 failed:', e.message || e);
        return null;
    }
}

async function tryModels(models: string[], payload: any): Promise<any> {
    for (const m of models) {
        const out = await callModel(m, payload);
        if (!out) continue;

        if (out.ok) {
            console.log(`✅ ${m} returned 200, searching for image data...`);
            // Try to find any image in the provider body
            const img = findImageData(out.body);

            if (img) {
                console.log(`🔍 Found image at path: ${img.path.join('.')}`);
                if (img.type === 'base64') {
                    return { success: true, model: m, imageData: img.value, providerBody: out.body, imagePath: img.path };
                }
                if (img.type === 'url') {
                    const b64 = await fetchUrlToBase64(img.value);
                    if (b64) {
                        return { success: true, model: m, imageData: b64, providerBody: out.body, imagePath: img.path, imageUrl: img.value };
                    }
                    return { success: false, model: m, status: 200, providerBody: out.body, note: 'image URL returned but could not be fetched' };
                }
            }

            // OK but no image found - log body keys for debugging
            console.warn(`⚠️ ${m} returned 200 but no image found. Body keys:`, Object.keys(out.body || {}));
            return { success: false, model: m, status: 200, providerBody: out.body, note: 'ok but no image found' };
        }

        if (out.status === 404) {
            console.warn(`❌ ${m} returned 404 (not found or not supported)`);
            continue;
        }

        if (out.status === 429) {
            console.warn(`⚠️ ${m} returned 429 (quota exceeded)`);
            return { success: false, model: m, status: 429, providerBody: out.body };
        }

        if (out.status >= 500) {
            console.warn(`⚠️ ${m} returned ${out.status}, retrying once...`);
            await delay(400);
            const r2 = await callModel(m, payload);
            if (r2.ok) {
                const img = findImageData(r2.body);
                if (img?.type === 'base64') {
                    return { success: true, model: m, imageData: img.value, providerBody: r2.body };
                }
                if (img?.type === 'url') {
                    const b64 = await fetchUrlToBase64(img.value);
                    if (b64) return { success: true, model: m, imageData: b64, providerBody: r2.body, imageUrl: img.value };
                }
            }
            continue;
        }
    }
    return { success: false };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server misconfiguration: missing GEMINI_API_KEY' });
    }

    const { prompt, base64Image, aspectRatio = '1:1' } = req.body;
    if (!prompt && !base64Image) {
        return res.status(400).json({ error: 'Missing prompt or image' });
    }

    const models = [PRIMARY, ...FALLBACKS];
    const payloads: any[] = [];
    const basePayload = { prompt: String(prompt || ''), imageConfig: { aspectRatio } };

    if (base64Image) {
        payloads.push({ ...basePayload, image: base64Image });
        payloads.push({ ...basePayload, imageData: base64Image });
        payloads.push({ ...basePayload, contextImages: [{ image: base64Image }] });
    } else {
        payloads.push(basePayload);
    }

    // Try payloads and models
    for (const p of payloads) {
        const out = await tryModels(models, p);

        if (out.success) {
            return res.status(200).json({
                imageData: out.imageData,
                providerModel: out.model,
                imagePath: out.imagePath,
                imageUrl: out.imageUrl ?? null
            });
        }

        // If provider returned 429
        if (out.status === 429) {
            const retryMatch = JSON.stringify(out.providerBody || {}).match(/([0-9]+)s/);
            const retry = retryMatch ? parseInt(retryMatch[1], 10) : 60;
            res.setHeader('Retry-After', String(retry));
            return res.status(429).json({
                error: 'Provider quota exceeded',
                retryAfterSeconds: retry,
                providerBody: out.providerBody
            });
        }

        // If ok but no image -> return providerBody for debugging
        if (out.status === 200 && out.providerBody) {
            console.warn('Model returned 200 but no image found. providerBody keys:', Object.keys(out.providerBody));
            return res.status(200).json({
                imageData: null,
                providerModel: out.model,
                providerBody: out.providerBody,
                note: out.note
            });
        }
    }

    return res.status(502).json({
        error: 'Image generation failed for all models/payloads',
        triedModels: models
    });
}
