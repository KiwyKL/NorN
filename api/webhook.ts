import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const sig = req.headers['stripe-signature'];

    if (!sig) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    try {
        // Verificar firma del webhook
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            webhookSecret
        );
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Manejar el evento
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;

            console.log('✅ Payment successful!', {
                sessionId: session.id,
                metadata: session.metadata,
            });

            // Aquí normalmente guardarías en base de datos
            // Por ahora, solo logueamos
            // En el cliente, manejaremos esto vía URL params

            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    // Retornar 200 para confirmar recepción
    return res.status(200).json({ received: true });
}

// Configuración especial para webhooks de Stripe
export const config = {
    api: {
        bodyParser: false,
    },
};
