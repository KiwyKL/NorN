import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Generate ephemeral tokens for Gemini Live API
 * 
 * For security, the Live API WebSocket connection should use ephemeral tokens
 * instead of the API key. This endpoint generates short-lived tokens.
 * 
 * Note: This is a placeholder. Google's actual ephemeral token API should be
 * integrated here when available/documented.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // For now, we'll return the API key directly
        // TODO: Replace with actual ephemeral token generation when Google provides the API

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Return token with 5 minute expiration
        return res.status(200).json({
            token: apiKey,
            expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
            warning: 'Using API key as token - implement ephemeral tokens for production'
        });

    } catch (error: any) {
        console.error('Generate token error:', error);
        return res.status(500).json({
            error: 'Failed to generate token',
            message: error.message
        });
    }
}
