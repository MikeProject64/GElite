
'use client'

export const PIXEL_ID = '3232172553603431'

export const pageview = () => {
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'PageView')
  }
}

// https://developers.facebook.com/docs/facebook-pixel/advanced/
export const event = (name: string, options = {}) => {
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', name, options)
  }
}
