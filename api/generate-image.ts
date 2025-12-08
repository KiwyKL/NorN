import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Image generation using gemini-2.5-flash-preview-image
 * This is a multimodal Gemini model that can generate images
 */

const API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    console.log('🎨 Image generation request with gemini-2.5-flash-preview-image');

    const model = 'gemini-2.5-flash-preview-image';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Try format for image generation with Gemini
    const payload = {
        contents: [{
            parts: [{
                text: `Generate an image: ${prompt}`
            }]
        }],
        generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048
        }
    };

    console.log(`🎨 Calling ${model}:generateContent...`);

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

        console.log(`Response from ${model}:`, response.status);

        if (!response.ok) {
            console.error(`❌ Error:`, JSON.stringify(data).substring(0, 500));
            return res.status(502).json({
                error: 'Provider error',
                model,
                providerStatus: response.status,
                providerBody: data
            });
        }

        console.log('Response structure:', data ? Object.keys(data) : 'null');

        // Try to extract image from various possible formats
        let imageData: string | null = null;

        // Format 1: candidates[].content.parts[].inlineData.data
        if (data?.candidates?.[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                    imageData = part.inlineData.data;
                    console.log('✅ Found image in inlineData.data');
                    break;
                }
            }
        }

        // Format 2: candidates[].content.parts[].blob
        if (!imageData && data?.candidates?.[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.blob?.data) {
                    imageData = part.blob.data;
                    console.log('✅ Found image in blob.data');
                    break;
                }
            }
        }

        // Format 3: Direct in response
        if (!imageData && data?.imageData) {
            imageData = data.imageData;
            console.log('✅ Found image in imageData');
        }

        if (imageData) {
            console.log(`✅ Image generated, size: ${imageData.length}`);
            return res.status(200).json({
                imageData,
                providerModel: model,
                mimeType: 'image/png'
            });
        }

        // Check if text response (model doesn't support image generation)
        const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
            console.warn(`⚠️ Model returned text instead of image: ${textResponse.substring(0, 100)}`);
        }

        // 200 but no image - return provider body for debugging
        console.warn(`⚠️ ${model} returned 200 but no image. Response:`, JSON.stringify(data).substring(0, 500));
        return res.status(200).json({
            imageData: null,
            providerModel: model,
            providerBody: data,
            note: 'Provider returned 200 but no image data found'
        });

    } catch (error: any) {
        console.error(`❌ Error:`, error.message);
        return res.status(500).json({
            error: 'Internal server error',
            detail: error.message
        });
    }
}
