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
        const { imageData, prompt } = req.body;

        if (!imageData) {
            return res.status(400).json({ error: 'Missing image data' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: imageData } },
                    { text: prompt || "Read this letter to Santa and summarize what the child wants." }
                ]
            }
        });

        return res.status(200).json({
            text: response.text || ''
        });

    } catch (error: any) {
        console.error('Analyze image error:', error);
        return res.status(500).json({
            error: 'Failed to analyze image',
            message: error.message
        });
    }
}
