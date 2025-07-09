
'use server';

// This is the Measurement ID and Secret for the Google Analytics 4 API.
const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET;

interface EventParams {
    [key: string]: any;
}

interface GTagEvent {
    name: string;
    params: EventParams;
}

/**
 * Sends an event to Google Analytics 4 using the Measurement Protocol.
 * This is intended for server-side event tracking.
 * @param {GTagEvent} event - The event object to send.
 */
export async function event({ name, params }: GTagEvent) {
    if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
        console.warn("Google Analytics server-side tracking is not configured. Missing Measurement ID or API Secret.");
        return;
    }

    try {
        await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`, {
            method: 'POST',
            body: JSON.stringify({
                // A unique identifier for a client. In a web context, this is the client ID.
                // In a server-side context, you might need to manage this ID or use a user ID.
                // For simplicity, we'll use a placeholder. In a real app, this should be consistent per user.
                client_id: 'server-side-placeholder',
                events: [{
                    name,
                    params,
                }],
            }),
        });

    } catch (error) {
        console.error("Error sending GA4 event from server:", error);
    }
};

