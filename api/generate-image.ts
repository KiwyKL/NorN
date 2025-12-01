import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: prompt,
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio || '1:1'
                }
            }
        });

        // Extract image from response
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return res.status(200).json({
                    imageData: part.inlineData.data,
                    mimeType: part.inlineData.mimeType
                });
            }
        }

        return res.status(500).json({ error: 'No image generated in response' });

    } catch (error: any) {
        console.error('Generate image error:', error);
        return res.status(500).json({
            error: 'Failed to generate image',
            message: error.message
        });
    }
}
