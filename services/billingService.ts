import { Capacitor } from '@capacitor/core';
import { PRODUCTS, Product, addCalls, recordPurchase, getAvailableCalls } from '../constants/products';

/**
 * Billing Service para Google Play
 * 
 * NOTA: Esta es una implementación MOCK para desarrollo.
 * Cuando subas a Google Play, necesitarás implementar el código nativo real.
 * 
 * Ver: docs/CONFIGURACION_PAGOS.md para instrucciones completas
 */

class BillingService {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('🏪 Initializing Billing Service...');

        // En producción, aquí contactarías Google Play Billing
        // Por ahora, modo mock para testing
        if (!Capacitor.isNativePlatform()) {
            console.warn('⚠️ Running in MOCK mode - purchases will be simulated');
        }

        this.initialized = true;
        console.log('✅ Billing Service ready');
    }

    /**
     * Obtener productos disponibles
     */
    async getProducts(): Promise<Product[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Retornar productos definidos
        // En producción, Google Play proveerá precios reales por región
        return PRODUCTS;
    }

    /**
     * Comprar un producto
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
            console.log(`🛒 Purchasing: ${product.name} (${product.calls} calls)`);

            if (Capacitor.isNativePlatform()) {
                // TODO: Implementar Google Play Billing nativo
                // Por ahora, simulamos compra exitosa
                console.log('⚠️ MOCK: Simulating purchase...');
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // Agregar llamadas al balance
            addCalls(product.calls);

            // Registrar compra
            recordPurchase(productId);

            console.log(`✅ Purchase successful! +${product.calls} calls`);
            return true;

        } catch (error) {
            console.error('❌ Purchase failed:', error);
            return false;
        }
    }

    /**
     * Restaurar compras previas
     */
    async restorePurchases(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        console.log('🔄 Restoring purchases...');

        // En producción, consultarías Google Play por compras existentes
        // Por ahora, solo mostramos mensaje
        console.log('ℹ️ No purchases to restore in MOCK mode');
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
