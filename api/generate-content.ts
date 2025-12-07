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
        console.log('📝 Generate content request received');

        const { model, prompt, systemInstruction } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY is missing in environment variables');
            return res.status(500).json({ error: 'Server configuration error: API key missing' });
        }

        // Use a stable model for production web release
        // gemini-1.5-flash is generally very fast and stable
        const modelToUse = 'gemini-1.5-flash';
        console.log(`Using model: ${modelToUse}`);

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

        // Return a fallback response instead of 500 if possible, or detailed error
        return res.status(500).json({
            error: 'Failed to generate content',
            message: error.message || 'Unknown error',
            details: error.toString()
        });
    }
}
