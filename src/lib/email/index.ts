// FlowTrade Email Service - Resend Integration
// Handles quote/invoice email sending with professional templates

import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

export { resend }

// Email configuration - Production (flowtrade.com.au verified)
export const EMAIL_CONFIG = {
  fromDomain: 'quotes@flowtrade.com.au',
  replyTo: 'support@flowtrade.com.au',
}
