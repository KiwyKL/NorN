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
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        // Use gemini-2.5-flash-preview-image which has low usage and supports text
        const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-image';

        if (!API_KEY) {
            console.error('❌ GEMINI_API_KEY not set on server');
            return res.status(500).json({ error: 'Server misconfiguration: API key missing' });
        }

        console.log(`📝 Calling Gemini API with model: ${MODEL}`);

        // Use the correct REST API format
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

        // Build Google payload: contents -> parts -> text (correct format)
        const body = {
            contents: [
                {
                    parts: [{ text: String(prompt) }],
                    role: 'user'
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 800
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': API_KEY  // Use header instead of query param
            },
            body: JSON.stringify(body)
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            console.error('❌ Google Generative API error:', response.status, JSON.stringify(data));
            // Return provider error to client for debugging (but avoid leaking API key)
            return res.status(502).json({
                error: 'Provider error',
                providerStatus: response.status,
                providerBody: data
            });
        }

        // Extract text from response
        let text = '';

        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = data.candidates[0].content.parts[0].text;
        } else if (Array.isArray(data?.predictions) && data.predictions[0]) {
            text = JSON.stringify(data.predictions[0]);
        } else if (typeof data?.output === 'string') {
            text = data.output;
        } else {
            // Fallback: try to find first "text" deeply
            const findFirstText = (obj: any): string | null => {
                if (!obj || typeof obj !== 'object') return null;
                if (typeof obj.text === 'string') return obj.text;
                for (const k of Object.keys(obj)) {
                    const t = findFirstText(obj[k]);
                    if (t) return t;
                }
                return null;
            };
            text = findFirstText(data) || '';
        }

        console.log('✅ Content generated successfully');

        return res.status(200).json({ text, raw: text ? undefined : data });

    } catch (error: any) {
        console.error('❌ Server generateContent error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Unknown error'
        });
    }
}
