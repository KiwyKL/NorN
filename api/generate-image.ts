import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Simplified image generation endpoint.
 * Tries Imagen models only with correct :predict format.
 */

const API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

    const { prompt, aspectRatio = '1:1' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    console.log('🎨 Image generation request:', { promptLength: prompt.length, aspectRatio });

    // Try Imagen models with :predict endpoint
    const models = ['imagen-4.0-fast-generate-001', 'imagen-4.0-generate-001'];

    for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;

        const payload = {
            instances: [{ prompt: String(prompt) }],
            parameters: {
                sampleCount: 1,
                aspectRatio: aspectRatio
            }
        };

        console.log(`🎨 Trying ${model}...`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': API_KEY
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => null);

            console.log(`Response from ${model}:`, response.status, data ? Object.keys(data) : 'null');

            if (!response.ok) {
                console.warn(`❌ ${model} returned ${response.status}:`, JSON.stringify(data).substring(0, 200));

                if (response.status === 404) {
                    continue; // Try next model
                }

                if (response.status === 429) {
                    return res.status(429).json({
                        error: 'Rate limited',
                        model,
                        providerBody: data
                    });
                }

                // Other errors - return for debugging
                return res.status(502).json({
                    error: 'Provider error',
                    model,
                    providerStatus: response.status,
                    providerBody: data
                });
            }

            // Success - extract image
            let imageData: string | null = null;

            // Format 1: predictions[].bytesBase64Encoded
            if (data?.predictions?.[0]?.bytesBase64Encoded) {
                imageData = data.predictions[0].bytesBase64Encoded;
                console.log('✅ Found image in predictions[0].bytesBase64Encoded');
            }
            // Format 2: predictions[].image.bytesBase64Encoded
            else if (data?.predictions?.[0]?.image?.bytesBase64Encoded) {
                imageData = data.predictions[0].image.bytesBase64Encoded;
                console.log('✅ Found image in predictions[0].image.bytesBase64Encoded');
            }
            // Format 3: generatedImages[0].image.imageBytes
            else if (data?.generatedImages?.[0]?.image?.imageBytes) {
                imageData = data.generatedImages[0].image.imageBytes;
                console.log('✅ Found image in generatedImages[0].image.imageBytes');
            }

            if (imageData) {
                console.log(`✅ Image generated with ${model}, size: ${imageData.length}`);
                return res.status(200).json({
                    imageData,
                    providerModel: model,
                    mimeType: 'image/png'
                });
            }

            // 200 but no image - return provider body for debugging
            console.warn(`⚠️ ${model} returned 200 but no image. Keys:`, Object.keys(data || {}));
            return res.status(200).json({
                imageData: null,
                providerModel: model,
                providerBody: data,
                note: 'Provider returned 200 but no image data found'
            });

        } catch (error: any) {
            console.error(`❌ Error calling ${model}:`, error.message);
            continue; // Try next model
        }
    }

    // All models failed
    console.error('❌ All image models failed');
    return res.status(502).json({
        error: 'All image models failed',
        triedModels: models
    });
}
