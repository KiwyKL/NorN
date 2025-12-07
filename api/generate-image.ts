import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
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
            return res.status(500).json({ error: 'Server configuration error: API key missing' });
        }

        // Use Imagen 3 via REST API
        const modelName = 'imagen-3.0-generate-001';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

        console.log(`🎨 Calling Imagen API (${modelName})...`);

        const body = {
            instances: [
                { prompt: prompt }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: aspectRatio || '1:1'
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Imagen API Error:', response.status, errorText);

            // If API fails, return useFallback: true so client uses Canvas
            return res.status(200).json({
                imageData: null,
                useFallback: true,
                error: errorText
            });
        }

        const data = await response.json();

        // Extract image from response (Imagen 3 format)
        // Usually data.predictions[0].bytesBase64Encoded or similar
        // Let's check the format. For v1beta/models/imagen-3.0-generate-001:predict
        // Response: { predictions: [ { bytesBase64Encoded: "..." } ] }

        const base64Image = data.predictions?.[0]?.bytesBase64Encoded || data.predictions?.[0]?.image?.bytesBase64Encoded;

        if (base64Image) {
            console.log('✅ Image generated successfully');
            return res.status(200).json({
                imageData: base64Image,
                mimeType: 'image/png'
            });
        } else {
            console.error('❌ No image data in response:', JSON.stringify(data).substring(0, 200));
            return res.status(200).json({
                imageData: null,
                useFallback: true
            });
        }

    } catch (error: any) {
        console.error('❌ Generate image error:', error);
        // Fallback on error
        return res.status(200).json({
            imageData: null,
            useFallback: true,
            error: error.message
        });
    }
}
