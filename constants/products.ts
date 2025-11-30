// Product definitions for Google Play Billing

export interface Product {
    id: string;           // SKU in Google Play Console
    name: string;         // Display name
    description: string;  // Description
    price: string;        // Display price (USD)
    calls: number;        // Number of calls included
    badge?: string;       // Optional badge (e.g., "Best Value")
}

export const PRODUCTS: Product[] = [
    {
        id: 'santa_call_1',
        name: '1 Call',
        description: 'One magical call with Santa',
        price: '$3.99',
        calls: 1
    },
    {
        id: 'santa_call_3',
        name: '3 Calls',
        description: 'Three calls with Santa',
        price: '$9.99',
        calls: 3,
        badge: 'Popular'
    },
    {
        id: 'santa_call_5',
        name: '5 Calls',
        description: 'Five calls with Santa',
        price: '$14.99',
        calls: 5,
        badge: 'Best Value'
    }
];

// Helper to get product by ID
export const getProductById = (id: string): Product | undefined => {
    return PRODUCTS.find(p => p.id === id);
};

// Helper to check if user has purchased a product
export const hasPurchased = (productId: string): boolean => {
    try {
        const purchases = JSON.parse(localStorage.getItem('purchases') || '[]');
        return purchases.includes(productId);
    } catch {
        return false;
    }
};

// Helper to record purchase
export const recordPurchase = (productId: string): void => {
    try {
        const purchases = JSON.parse(localStorage.getItem('purchases') || '[]');
        if (!purchases.includes(productId)) {
            purchases.push(productId);
            localStorage.setItem('purchases', JSON.stringify(purchases));
        }
    } catch (e) {
        console.error('Failed to record purchase', e);
    }
};

// Helper to get available calls
export const getAvailableCalls = (): number => {
    try {
        return parseInt(localStorage.getItem('availableCalls') || '0', 10);
    } catch {
        return 0;
    }
};

// Helper to add calls
export const addCalls = (count: number): void => {
    try {
        const current = getAvailableCalls();
        localStorage.setItem('availableCalls', (current + count).toString());
    } catch (e) {
        console.error('Failed to add calls', e);
    }
};

// Helper to use a call
export const useCall = (): boolean => {
    try {
        const available = getAvailableCalls();
        if (available > 0) {
            localStorage.setItem('availableCalls', (available - 1).toString());
            return true;
        }
        return false;
    } catch {
        return false;
    }
};
