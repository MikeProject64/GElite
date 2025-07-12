
'use server';

// This file is for server-side event tracking for Meta Pixel via the Conversion API.
// NOTE: For this to work, you need to set META_PIXEL_ID and META_ACCESS_TOKEN
// in your environment variables.

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

interface EventParams {
    [key: string]: any;
}

/**
 * Sends an event to the Meta Pixel Conversion API.
 * This is intended for server-side event tracking.
 * @param {string} eventName - The name of the event to send (e.g., 'Purchase', 'Lead').
 * @param {EventParams} userData - User data for matching (e.g., email, phone).
 * @param {EventParams} customData - Custom data for the event (e.g., value, currency).
 */
export async function event(eventName: string, customData: EventParams = {}, userData: EventParams = {}) {
    if (!PIXEL_ID || !ACCESS_TOKEN) {
        console.warn("Meta Pixel server-side tracking is not configured. Missing PIXEL_ID or ACCESS_TOKEN.");
        return;
    }

    const eventData = {
        data: [
            {
                event_name: eventName,
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                user_data: {
                    ...userData,
                    // It's recommended to hash user data for privacy.
                    // For simplicity, we are sending it in plaintext.
                    // Example: em: [sha256(email)],
                },
                custom_data: customData,
            },
        ],
    };

    try {
        await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
        });
    } catch (error) {
        console.error("Error sending Meta Pixel event from server:", error);
    }
}
