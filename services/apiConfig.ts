/**
 * API Configuration
 * 
 * This file centralizes API key configuration for production builds.
 * The key is checked from environment variables first, then falls back to the configured value.
 */

// Try to get from environment variable (dev builds with .env.local)
const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Production API key (embedded for builds without .env.local)
const PRODUCTION_API_KEY = 'AIzaSyDXMe8bsSHJcmjKWpfR6svKih7nC-PSIGw';

// Use environment variable if available, otherwise use production key
export const GEMINI_API_KEY = envApiKey || PRODUCTION_API_KEY;

// Validate that we have a key
if (!GEMINI_API_KEY) {
    console.error('❌ CRITICAL ERROR: No Gemini API key configured');
    throw new Error('Gemini API key is required but not configured');
}

// Log configuration status (but not the actual key)
console.log('✅ Gemini API configured:', GEMINI_API_KEY ? '***' + GEMINI_API_KEY.slice(-4) : 'MISSING');

export default GEMINI_API_KEY;
