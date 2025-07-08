
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Google Ads Conversion Tracking ---
// NOTE: This is your Google Analytics 4 Measurement ID.
export const GA_TRACKING_ID = 'G-RHYYBST6H5';

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (typeof window.gtag !== 'function') return;
  window.gtag("config", GA_TRACKING_ID, {
    page_path: url,
  });
};

type GTagEvent = {
  action: string;
  params: {
    [key: string]: any;
  };
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, params }: GTagEvent) => {
  if (typeof window.gtag !== 'function') return;
  window.gtag("event", action, params);
};
