import { loadStripe } from '@stripe/stripe-js';
import { PRODUCTS, Product, addCalls, recordPurchase, getAvailableCalls } from '../constants/products';
import { API_ENDPOINTS } from './apiConfig';

/**
 * Billing Service para Stripe (Web)
 * 
 * Maneja pagos a través de Stripe Checkout
 */

// Inicializar Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

class BillingService {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('🏪 Initializing Stripe Billing...');

        // Verificar que tenemos la clave
        if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
            console.warn('⚠️ STRIPE_PUBLISHABLE_KEY not found');
        }

        // Verificar success/cancel en URL
        this.handleRedirect();

        this.initialized = true;
        console.log('✅ Stripe Billing ready');
    }

    /**
     * Manejar redirect después de checkout
     */
    private handleRedirect() {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('success') === 'true') {
            const sessionId = urlParams.get('session_id');
            console.log('✅ Payment successful!', sessionId);

            // Limpiar URL
            window.history.replaceState({}, '', window.location.pathname);

            // Mostrar éxito
            alert('¡Pago exitoso! Tus llamadas han sido agregadas. 🎅');
        }

        if (urlParams.get('canceled') === 'true') {
            console.log('❌ Payment canceled');
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    /**
     * Obtener productos disponibles
     */
    async getProducts(): Promise<Product[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        return PRODUCTS;
    }

    /**
     * Comprar un producto (redirige a Stripe Checkout)
     */
    async purchase(productId: string): Promise<boolean> {
        if (!this.initialized) {
            await this.initialize();
        }

        const product = PRODUCTS.find(p => p.id === productId);
        if (!product) {
            console.error('❌ Product not found:', productId);
            return false;
        }

        try {
            console.log(`🛒 Creating checkout session for: ${product.name}`);

            // Llamar API para crear sesión de checkout
            const response = await fetch(API_ENDPOINTS.createCheckout, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create checkout');
            }

            const { url } = await response.json();

            // Redirigir a Stripe Checkout
            window.location.href = url;

            // Nota: El pago se completará en otra ventana/tab
            // La lógica de agregar llamadas se manejará cuando el usuario regrese
            // vía handleRedirect() y los URL params

            // Por ahora, agregamos las llamadas optimísticamente
            // (En producción real, esto se haría vía webhook de Stripe)
            setTimeout(() => {
                addCalls(product.calls);
                recordPurchase(productId);
            }, 1000);

            return true;

        } catch (error) {
            console.error('❌ Purchase failed:', error);
            alert('Error al procesar el pago. Por favor intenta de nuevo.');
            return false;
        }
    }

    /**
     * Restaurar compras previas (no aplicable en web)
     */
    async restorePurchases(): Promise<void> {
        console.log('ℹ️ Restore purchases not needed in web version');
    }

    /**
     * Obtener llamadas disponibles
     */
    getAvailableCalls(): number {
        return getAvailableCalls();
    }
}

// Export singleton
export const billingService = new BillingService();
