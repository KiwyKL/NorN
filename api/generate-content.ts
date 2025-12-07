import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Initialize SDK with API key from environment
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

        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY is missing');
            return res.status(500).json({ error: 'Server configuration error: API key missing' });
        }

        // Use stable model 'gemini-1.5-flash' to avoid 500 errors from experimental models
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

        // Log detailed error for debugging
        if (error.response) {
            console.error('API Response Error:', JSON.stringify(error.response, null, 2));
        }

        return res.status(500).json({
            error: 'Failed to generate content',
            message: error.message || 'Unknown error',
            details: error.toString()
        });
    }
}
