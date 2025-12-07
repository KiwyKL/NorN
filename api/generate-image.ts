import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Robust image generation endpoint.
 * Tries multiple image generation models in order:
 * 1. imagen-4.0-generate (user has access per rate limits)
 * 2. gemini-2.0-flash-exp with image generation via generateContent
 * 
 * If all fail, returns useFallback: true so client uses canvas.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Try Imagen API format
async function tryImagenModel(apiKey: string, model: string, prompt: string, aspectRatio: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;

    const body = {
        instances: [{ prompt }],
        parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio || '1:1'
        }
    };

    console.log(`🎨 Trying Imagen model: ${model}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        console.log(`❌ Imagen ${model} failed: ${response.status}`);
        return { ok: false, status: response.status, data };
    }

    // Extract image from Imagen response format
    const base64Image = data?.predictions?.[0]?.bytesBase64Encoded
        || data?.predictions?.[0]?.image?.bytesBase64Encoded;

    if (base64Image) {
        console.log(`✅ Imagen ${model} succeeded`);
        return { ok: true, imageData: base64Image, model };
    }

    console.log(`❌ Imagen ${model}: no image data in response`);
    return { ok: false, status: 200, data, noImage: true };
}

// Try Gemini multimodal model for image generation
async function tryGeminiImageGeneration(apiKey: string, model: string, prompt: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // For Gemini image generation, we use a specific prompt format
    const body = {
        contents: [{
            parts: [{ text: `Generate an image: ${prompt}` }],
            role: 'user'
        }],
        generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048
        }
    };

    console.log(`🎨 Trying Gemini model for image: ${model}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        console.log(`❌ Gemini ${model} failed: ${response.status}`);
        return { ok: false, status: response.status, data };
    }

    // Check if response contains inline image data
    const inlineData = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (inlineData?.inlineData?.data) {
        console.log(`✅ Gemini ${model} generated image`);
        return { ok: true, imageData: inlineData.inlineData.data, model };
    }

    // No image data - Gemini might not support image generation with this model
    console.log(`❌ Gemini ${model}: no image data in response`);
    return { ok: false, status: 200, data, noImage: true };
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
        const { prompt, aspectRatio } = req.body;

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

        // Models to try in order (based on user's rate limits table)
        const imagenModels = [
            'imagen-4.0-generate',           // User has access (2/70 RPD)
            'gemini-2.5-flash-preview-image' // Multimodal (8/2K RPD)
        ];

        const triedModels: string[] = [];

        // Try Imagen models first
        for (const model of imagenModels) {
            triedModels.push(model);
            const result = await tryImagenModel(apiKey, model, prompt, aspectRatio || '1:1');

            if (result.ok && result.imageData) {
                return res.status(200).json({
                    imageData: result.imageData,
                    mimeType: 'image/png',
                    providerModel: model
                });
            }

            // If rate limited, wait a bit and try next
            if (result.status === 429) {
                console.log(`⚠️ ${model} rate limited, trying next...`);
                await delay(500);
                continue;
            }
        }

        // Try Gemini multimodal as fallback
        const geminiModels = ['gemini-2.0-flash-exp'];
        for (const model of geminiModels) {
            triedModels.push(model);
            const result = await tryGeminiImageGeneration(apiKey, model, prompt);

            if (result.ok && result.imageData) {
                return res.status(200).json({
                    imageData: result.imageData,
                    mimeType: 'image/png',
                    providerModel: model
                });
            }
        }

        // All models failed - return fallback
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
