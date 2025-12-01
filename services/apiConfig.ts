// API Configuration
// Use Vercel proxy in production, local testing otherwise
export const API_BASE_URL = import.meta.env.PROD
    ? 'https://your-project.vercel.app' // Will be updated after Vercel deployment
    : 'http://localhost:5000'; // Local Vite dev server

export const API_ENDPOINTS = {
    generateContent: `${API_BASE_URL}/api/generate-content`,
    generateImage: `${API_BASE_URL}/api/generate-image`,
    transcribeAudio: `${API_BASE_URL}/api/transcribe-audio`,
    analyzeImage: `${API_BASE_URL}/api/analyze-image`,
    liveToken: `${API_BASE_URL}/api/live-token`,
};
