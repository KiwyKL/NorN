const functions = require('firebase-functions');
const { google } = require('googleapis');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Environment variables
const API_SECRET = process.env.API_SECRET;
const SHEET_ID = process.env.SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.SERVICE_ACCOUNT_PRIVATE_KEY;

// Initialize Google Sheets API with Service Account
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: SERVICE_ACCOUNT_EMAIL,
        private_key: SERVICE_ACCOUNT_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

exports.submitLead = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // Verify API Key
    const apiKey = req.get('x-api-key');
    if (!apiKey || apiKey !== API_SECRET) {
        console.error('Invalid API key');
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    // Validate request
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { name, email, country, phone, source, timestamp, metadata } = req.body;

        // Validate required fields
        if (!email || !source || !timestamp) {
            res.status(400).json({ error: 'Missing required fields: email, source, timestamp' });
            return;
        }

        // Prepare row data
        const row = [
            timestamp,
            name || '',
            email,
            country || '',
            phone || '',
            source,
            metadata ? JSON.stringify(metadata) : ''
        ];

        // Append to Google Sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:G',
            valueInputOption: 'RAW',
            resource: {
                values: [row]
            }
        });

        console.log('Lead saved successfully:', { email, source });
        res.status(200).json({ success: true, message: 'Lead saved' });
    } catch (error) {
        console.error('Error saving lead:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});
