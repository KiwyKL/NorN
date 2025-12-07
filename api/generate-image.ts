import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Robust image generation endpoint.
 * Uses correct endpoints for each model type:
 * - Gemini models: :generateContent with image output
 * - Imagen models: :predict
 */

const API_KEY = process.env.GEMINI_API_KEY;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Call Gemini model for image generation via generateContent
async function callGeminiImageGen(model: string, prompt: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    console.log(`🎨 Calling ${model}:generateContent for image`);

    const payload = {
        contents: [{
            parts: [{ text: prompt }],
            role: 'user'
        }],
        generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 0.9
        }
    };

    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY!
            },
            body: JSON.stringify(payload)
        });
        const body = await r.json().catch(() => null);
        return { ok: r.ok, status: r.status, body };
    } catch (err) {
        return { ok: false, status: 500, body: { error: String(err) } };
    }
}

// Call Imagen model via :predict endpoint
async function callImagenPredict(model: string, prompt: string, aspectRatio: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;
    console.log(`🎨 Calling ${model}:predict`);

    const payload = {
        instances: [{ prompt }],
        parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio || '1:1'
        }
    };

    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY!
            },
            body: JSON.stringify(payload)
        });
        const body = await r.json().catch(() => null);
        return { ok: r.ok, status: r.status, body };
    } catch (err) {
        return { ok: false, status: 500, body: { error: String(err) } };
    }
}

// Deep search for image data in response
function findImageData(obj: any): string | null {
    if (!obj) return null;

    // Check Gemini format: candidates[].content.parts[].inlineData.data
    if (obj.candidates?.[0]?.content?.parts) {
        for (const part of obj.candidates[0].content.parts) {
            if (part.inlineData?.data) {
                console.log('🔍 Found image in inlineData');
                return part.inlineData.data;
            }
        }
    }

    // Check Imagen format: predictions[].bytesBase64Encoded
    if (obj.predictions?.[0]?.bytesBase64Encoded) {
        console.log('🔍 Found image in predictions.bytesBase64Encoded');
        return obj.predictions[0].bytesBase64Encoded;
    }

    // Check other common formats
    if (obj.imageData) return obj.imageData;
    if (obj.image?.bytesBase64Encoded) return obj.image.bytesBase64Encoded;
    if (obj.images?.[0]?.b64_json) return obj.images[0].b64_json;

    // Deep search as fallback
    const search = (o: any): string | null => {
        if (!o || typeof o !== 'object') return null;
        for (const key of Object.keys(o)) {
            const val = o[key];
            if (typeof val === 'string' && val.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(val)) {
                console.log(`🔍 Found base64 at key: ${key}`);
                return val;
            }
            const found = search(val);
            if (found) return found;
        }
        return null;
    };

    return search(obj);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

    const { prompt, aspectRatio = '1:1' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const triedModels: string[] = [];
    let lastProviderBody: any = null;

    // 1. Try Gemini image generation model first
    const geminiModel = 'gemini-2.0-flash-exp-image-generation';
    triedModels.push(geminiModel);

    const geminiResult = await callGeminiImageGen(geminiModel, prompt);
    console.log(`Gemini ${geminiModel} response:`, geminiResult.status);

    if (geminiResult.ok) {
        const imageData = findImageData(geminiResult.body);
        if (imageData) {
            console.log('✅ Gemini image generation succeeded');
            return res.status(200).json({
                imageData,
                providerModel: geminiModel,
                mimeType: 'image/png'
            });
        }
        lastProviderBody = geminiResult.body;
        console.warn('⚠️ Gemini returned 200 but no image found');
    } else if (geminiResult.status !== 404) {
        lastProviderBody = geminiResult.body;
        console.warn(`⚠️ Gemini returned ${geminiResult.status}`);
    }

    // 2. Try Imagen models
    const imagenModels = ['imagen-4.0-generate-001', 'imagen-4.0-fast-generate-001'];

    for (const model of imagenModels) {
        triedModels.push(model);

        const result = await callImagenPredict(model, prompt, aspectRatio);
        console.log(`Imagen ${model} response:`, result.status);

        if (result.ok) {
            const imageData = findImageData(result.body);
            if (imageData) {
                console.log('✅ Imagen generation succeeded');
                return res.status(200).json({
                    imageData,
                    providerModel: model,
                    mimeType: 'image/png'
                });
            }
            lastProviderBody = result.body;
            console.warn('⚠️ Imagen returned 200 but no image found');
        } else if (result.status === 429) {
            return res.status(429).json({
                error: 'Rate limited',
                triedModels,
                providerBody: result.body
            });
        } else if (result.status !== 404) {
            lastProviderBody = result.body;
            console.warn(`⚠️ Imagen ${model} returned ${result.status}`);
        }
    }

    // All failed - return with debug info
    console.error('❌ All image models failed');
    return res.status(502).json({
        error: 'Image generation failed for all models',
        triedModels,
        providerBody: lastProviderBody
    });
}
