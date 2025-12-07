import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const apiKey = process.env.GEMINI_API_KEY;

    return res.status(200).json({
        status: 'ok',
        message: 'Configuration Test',
        hasKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        keyPrefix: apiKey ? apiKey.substring(0, 4) : 'none',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
}
