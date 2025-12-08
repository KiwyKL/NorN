import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

/**
 * Image generation using the EXACT format that worked before
 * Model: gemini-2.5-flash-image (Nano Banana)
 */

const API_KEY = process.env.GEMINI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!API_KEY) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

    const { prompt, aspectRatio = '1:1' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    console.log('🎨 Image generation with gemini-2.5-flash-image (SDK format)');

    try {
        // Initialize SDK client (same as client-side)
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        // Use EXACT same format as working backup
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: prompt,  // Direct string, not array
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio
                }
            }
        });

        console.log('✅ Response received');

        // Extract image from response (same as backup)
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                    console.log('✅ Image found, size:', part.inlineData.data.length);
                    return res.status(200).json({
                        imageData: part.inlineData.data,
                        providerModel: 'gemini-2.5-flash-image',
                        mimeType: part.inlineData.mimeType || 'image/png'
                    });
                }
            }
        }

        // No image found
        console.warn('⚠️ No image in response');
        return res.status(200).json({
            imageData: null,
            providerModel: 'gemini-2.5-flash-image',
            note: 'No image found in response',
            responseKeys: response ? Object.keys(response) : []
        });

    } catch (error: any) {
        console.error('❌ Error:', error.message);

        // Return detailed error for debugging
        return res.status(502).json({
            error: 'Provider error',
            model: 'gemini-2.5-flash-image',
            detail: error.message,
            errorType: error.constructor.name
        });
    }
}
