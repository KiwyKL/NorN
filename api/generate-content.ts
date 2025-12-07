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
        const { model, prompt, systemInstruction } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY is missing');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Use direct REST API to avoid SDK issues
        // gemini-1.5-flash is stable and fast
        const modelName = 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const contents = [];

        // Add system instruction if present (as a system part or user part depending on API support, 
        // but for simple chat, prepending to history or using system_instruction field is best)
        // v1beta supports system_instruction
        const body: any = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        };

        if (systemInstruction) {
            body.system_instruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        console.log(`📝 Calling Gemini API (${modelName})...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Gemini API Error:', response.status, errorText);
            throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Extract text from response
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        console.log('✅ Content generated successfully');

        return res.status(200).json({
            text: text,
            candidates: data.candidates
        });

    } catch (error: any) {
        console.error('❌ Generate content error:', error);
        return res.status(500).json({
            error: 'Failed to generate content',
            message: error.message || 'Unknown error',
            details: error.toString()
        });
    }
}
