// FlowTrade Email Service - Resend Integration
// Handles quote/invoice email sending with professional templates

import { Resend } from 'resend'

// Lazily initialise Resend client on first use so `next build` page-data
// collection doesn't require RESEND_API_KEY at build time
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export { getResend }

// Email configuration - Production (flowtrade.com.au verified)
export const EMAIL_CONFIG = {
  fromDomain: 'quotes@flowtrade.com.au',
  replyTo: 'support@flowtrade.com.au',
}
