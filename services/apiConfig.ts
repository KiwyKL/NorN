// API Configuration
// Use Vercel proxy in production, local testing otherwise

// Detect if we're in a Capacitor/mobile build
const isCapacitor = !!(window as any).Capacitor;
const isProduction = import.meta.env.PROD || isCapacitor;

export const API_BASE_URL = isProduction
    ? 'https://nor-n.vercel.app'
    : 'http://localhost:5173'; // Vite default dev port

export const API_ENDPOINTS = {
    generateContent: `${API_BASE_URL}/api/generate-content`,
    generateImage: `${API_BASE_URL}/api/generate-image`,
    transcribeAudio: `${API_BASE_URL}/api/transcribe-audio`,
    analyzeImage: `${API_BASE_URL}/api/analyze-image`,
    liveToken: `${API_BASE_URL}/api/live-token`,
    createCheckout: `${API_BASE_URL}/api/create-checkout`,
};
