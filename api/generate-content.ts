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
        console.log('📝 Generate content request');
        console.log('Has API key:', !!process.env.GEMINI_API_KEY);

        const { model, prompt, systemInstruction } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY not configured');
            return res.status(500).json({ error: 'API key not configured' });
        }

        const modelToUse = model || 'gemini-2.0-flash-exp';
        console.log('Using model:', modelToUse);

        const response = await ai.models.generateContent({
            model: modelToUse,
            contents: prompt,
            config: systemInstruction ? { systemInstruction } : undefined
        });

        console.log('✅ Content generated successfully');

        return res.status(200).json({
            text: response.text || '',
            candidates: response.candidates
        });

    } catch (error: any) {
        console.error('❌ Generate content error:', error);
        console.error('Error details:', {
            message: error.message,
            type: error.type,
            code: error.code,
        });
        return res.status(500).json({
            error: 'Failed to generate content',
            message: error.message,
            details: error.toString()
        });
    }
}
