export interface LeadData {
    name?: string;
    email: string;
    country?: string;
    phone?: string;
    source: 'chat' | 'letter' | 'call' | 'giveaway';
    platform?: 'Android' | 'iOS' | 'Web';
    timestamp: string;
    metadata?: Record<string, any>;
}

const LEADS_STORAGE_KEY = 'santa_app_leads';

// n8n Webhook Configuration
const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// Import platform detection
import { getPlatform } from '../utils/platform';

export const submitLead = async (data: LeadData): Promise<void> => {
    // 1. Validation
    if (!data.email) {
        console.warn("Attempted to submit lead without email");
        return;
    }

    // Add platform detection
    const enrichedData = {
        ...data,
        platform: getPlatform()
    };

    // 2. Log to Console (for dev)
    console.log("📝 LEAD COLLECTED:", enrichedData);

    // 3. Save to LocalStorage (Backup/Fallback)
    try {
        const existingLeadsStr = localStorage.getItem(LEADS_STORAGE_KEY);
        const leads: LeadData[] = existingLeadsStr ? JSON.parse(existingLeadsStr) : [];
        leads.push(enrichedData);
        localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    } catch (e) {
        console.error("Failed to save lead to localStorage", e);
    }

    // 4. Send to n8n Webhook
    if (WEBHOOK_URL) {
        try {
            await sendToWebhook(enrichedData);
        } catch (e) {
            console.error("Failed to send lead to n8n:", e);
        }
    } else {
        console.warn("⚠️ n8n Webhook not configured. Add VITE_N8N_WEBHOOK_URL to .env");
    }
};

const sendToWebhook = async (data: LeadData): Promise<void> => {
    const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook Error: ${response.status} - ${errorText}`);
    }

    console.log("✅ Lead sent to Google Sheets via n8n");
};

export const getStoredLeads = (): LeadData[] => {
    try {
        const str = localStorage.getItem(LEADS_STORAGE_KEY);
        return str ? JSON.parse(str) : [];
    } catch {
        return [];
    }
};

export const downloadLeadsCSV = (): void => {
    const leads = getStoredLeads();
    if (leads.length === 0) {
        alert("No leads collected yet!");
        return;
    }

    // CSV Header
    const headers = ['Name', 'Email', 'Country', 'Phone', 'Source', 'Platform', 'Timestamp', 'Metadata'];

    // CSV Rows
    const rows = leads.map(lead => [
        lead.name || '',
        lead.email,
        lead.country || '',
        lead.phone || '',
        lead.source,
        lead.platform || '',
        lead.timestamp,
        lead.metadata ? JSON.stringify(lead.metadata).replace(/"/g, '""') : '' // Escape quotes
    ]);

    // Combine
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create Blob and Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `santa_app_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
