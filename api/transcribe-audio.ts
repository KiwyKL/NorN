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
        const { audioData, mimeType } = req.body;

        if (!audioData) {
            return res.status(400).json({ error: 'Missing audio data' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: mimeType || 'audio/webm', data: audioData } },
                        { text: "Transcribe this audio exactly. Return ONLY the transcribed text, nothing else." }
                    ]
                }
            ]
        });

        return res.status(200).json({
            text: response.text || ''
        });

    } catch (error: any) {
        console.error('Transcribe audio error:', error);
        return res.status(500).json({
            error: 'Failed to transcribe audio',
            message: error.message
        });
    }
}
