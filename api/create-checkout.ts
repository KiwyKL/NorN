import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia' as any,
});

// Productos configurados
const PRODUCTS = [
    { id: 'santa_call_1', priceId: process.env.STRIPE_PRICE_1_CALL, calls: 1 },
    { id: 'santa_call_3', priceId: process.env.STRIPE_PRICE_3_CALLS, calls: 3 },
    { id: 'santa_call_5', priceId: process.env.STRIPE_PRICE_5_CALLS, calls: 5 },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('🛒 Create checkout request received');
        console.log('Environment check:', {
            hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
            hasAppUrl: !!process.env.APP_URL,
            priceIds: {
                price1: process.env.STRIPE_PRICE_1_CALL,
                price3: process.env.STRIPE_PRICE_3_CALLS,
                price5: process.env.STRIPE_PRICE_5_CALLS,
            }
        });

        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Missing productId' });
        }

        console.log('Product requested:', productId);

        const product = PRODUCTS.find(p => p.id === productId);
        if (!product || !product.priceId) {
            console.error('Product not found or missing price ID:', { productId, product });
            return res.status(400).json({ error: 'Invalid product or price not configured' });
        }

        console.log('Creating Stripe session for:', product);

        // Get the actual origin from the request
        const origin = req.headers.origin || req.headers.referer?.split('?')[0].replace(/\/$/, '') || process.env.APP_URL || 'https://nor-n.vercel.app';
        console.log('Using origin for redirects:', origin);

        // Crear sesión de Stripe Checkout
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: product.priceId,
                    quantity: 1,
                },
            ],
            success_url: `${origin}?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}?canceled=true`,
            metadata: {
                productId: product.id,
                calls: product.calls.toString(),
            },
        });

        console.log('✅ Session created:', session.id);

        return res.status(200).json({
            sessionId: session.id,
            url: session.url,
        });

    } catch (error: any) {
        console.error('❌ Stripe checkout error:', error);
        console.error('Error details:', {
            message: error.message,
            type: error.type,
            code: error.code,
        });
        return res.status(500).json({
            error: 'Failed to create checkout session',
            message: error.message,
            details: error.toString(),
        });
    }
}
