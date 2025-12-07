import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Robust image generation endpoint.
 * Tries multiple image generation models with correct endpoint formats:
 * - `:generateImage` for Imagen models
 * - `:generateContent` for multimodal Gemini models
 * 
 * If all fail, returns useFallback: true so client uses canvas.
 */

const PRIMARY_IMAGE_MODEL = process.env.IMAGE_MODEL_PRIMARY || "imagen-4.0-generate";
const FALLBACK_IMAGE_MODELS = process.env.IMAGE_MODEL_FALLBACK
    ? process.env.IMAGE_MODEL_FALLBACK.split(",").map(s => s.trim()).filter(Boolean)
    : ["gemini-2.5-flash-preview-image"];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Try :generateImage endpoint (for Imagen models)
async function callGenerateImage(apiKey: string, model: string, payload: any) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImage`;
    console.log(`🎨 Trying :generateImage on ${model}`);

    try {
        const r = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify(payload),
        });
        const body = await r.json().catch(() => null);
        return { ok: r.ok, status: r.status, body };
    } catch (err) {
        return { ok: false, status: 500, body: { error: String(err) } };
    }
}

// Try :predict endpoint (alternative format for some models)
async function callPredict(apiKey: string, model: string, prompt: string, aspectRatio: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;
    console.log(`🎨 Trying :predict on ${model}`);

    const payload = {
        instances: [{ prompt }],
        parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio || '1:1'
        }
    };

    try {
        const r = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify(payload),
        });
        const body = await r.json().catch(() => null);
        return { ok: r.ok, status: r.status, body };
    } catch (err) {
        return { ok: false, status: 500, body: { error: String(err) } };
    }
}

// Extract image data from various response formats
function extractImageData(body: any): string | null {
    if (!body) return null;

    // Format 1: Direct imageData
    if (body.imageData) return body.imageData;

    // Format 2: images[].b64_json
    if (Array.isArray(body.images) && typeof body.images[0]?.b64_json === "string") {
        return body.images[0].b64_json;
    }

    // Format 3: artifacts[].base64
    if (Array.isArray(body.artifacts) && typeof body.artifacts[0]?.base64 === "string") {
        return body.artifacts[0].base64;
    }

    // Format 4: predictions[].bytesBase64Encoded (Imagen format)
    if (body.predictions?.[0]?.bytesBase64Encoded) {
        return body.predictions[0].bytesBase64Encoded;
    }
    if (body.predictions?.[0]?.image?.bytesBase64Encoded) {
        return body.predictions[0].image.bytesBase64Encoded;
    }

    // Format 5: generatedImages[].image.imageBytes
    if (body.generatedImages?.[0]?.image?.imageBytes) {
        return body.generatedImages[0].image.imageBytes;
    }

    return null;
}

async function attemptModel(apiKey: string, model: string, prompt: string, aspectRatio: string): Promise<{ success: boolean, imageData?: string, model?: string, status?: number, body?: any }> {
    // Try :generateImage first
    const payload1 = {
        prompt: String(prompt),
        imageConfig: { aspectRatio },
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
    };

    let result = await callGenerateImage(apiKey, model, payload1);

    if (result.ok) {
        const imageData = extractImageData(result.body);
        if (imageData) {
            console.log(`✅ Success with :generateImage on ${model}`);
            return { success: true, imageData, model };
        }
    }

    // If :generateImage returns 404, try :predict
    if (result.status === 404) {
        result = await callPredict(apiKey, model, prompt, aspectRatio);

        if (result.ok) {
            const imageData = extractImageData(result.body);
            if (imageData) {
                console.log(`✅ Success with :predict on ${model}`);
                return { success: true, imageData, model };
            }
        }
    }

    // If rate limited
    if (result.status === 429) {
        console.log(`⚠️ ${model} rate limited`);
        return { success: false, status: 429, body: result.body };
    }

    // 5xx error - retry once
    if (result.status >= 500 && result.status < 600) {
        console.log(`⚠️ ${model} returned ${result.status}, retrying...`);
        await delay(500);
        result = await callGenerateImage(apiKey, model, payload1);
        if (result.ok) {
            const imageData = extractImageData(result.body);
            if (imageData) {
                return { success: true, imageData, model };
            }
        }
    }

    console.log(`❌ ${model} failed: ${result.status}`);
    return { success: false, status: result.status, body: result.body };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, aspectRatio = '1:1' } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY is missing');
            return res.status(200).json({
                imageData: null,
                useFallback: true,
                error: 'API key missing'
            });
        }

        // Models to try in order
        const models = [PRIMARY_IMAGE_MODEL, ...FALLBACK_IMAGE_MODELS];
        const triedModels: string[] = [];

        for (const model of models) {
            triedModels.push(model);
            const result = await attemptModel(apiKey, model, prompt, aspectRatio);

            if (result.success && result.imageData) {
                return res.status(200).json({
                    imageData: result.imageData,
                    mimeType: 'image/png',
                    providerModel: model
                });
            }

            // If rate limited and no more models, return error
            if (result.status === 429) {
                const more = models.some(m => !triedModels.includes(m));
                if (!more) {
                    return res.status(200).json({
                        imageData: null,
                        useFallback: true,
                        error: 'Provider quota exceeded',
                        triedModels
                    });
                }
                await delay(500);
                continue;
            }
        }

        // All models failed
        console.log(`❌ All image models failed. Tried: ${triedModels.join(', ')}`);
        return res.status(200).json({
            imageData: null,
            useFallback: true,
            triedModels,
            note: 'All image generation models failed, client should use canvas fallback'
        });

    } catch (error: any) {
        console.error('❌ Generate image error:', error);
        return res.status(200).json({
            imageData: null,
            useFallback: true,
            error: error.message
        });
    }
}
