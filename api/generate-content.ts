import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
        const { model, prompt, systemInstruction } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        const modelToUse = model || 'gemini-2.0-flash-exp';

        const response = await ai.models.generateContent({
            model: modelToUse,
            contents: prompt,
            config: systemInstruction ? { systemInstruction } : undefined
        });

        return res.status(200).json({
            text: response.text || '',
            candidates: response.candidates
        });

    } catch (error: any) {
        console.error('Generate content error:', error);
        return res.status(500).json({
            error: 'Failed to generate content',
            message: error.message
        });
    }
}
