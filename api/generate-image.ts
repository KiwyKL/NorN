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
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        // For now, return a simple success response
        // The client-side will use the canvas fallback
        // TODO: Integrate with proper image generation API when available
        return res.status(200).json({
            imageData: null,
            mimeType: 'image/png',
            useFallback: true
        });

    } catch (error: any) {
        console.error('Generate image error:', error);
        return res.status(500).json({
            error: 'Failed to generate image',
            message: error.message,
            details: error.toString()
        });
    }
}
