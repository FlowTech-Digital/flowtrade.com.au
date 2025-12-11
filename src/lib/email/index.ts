// FlowTrade Email Service - Resend Integration
// Handles quote email sending with professional templates

import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

export { resend }

// Email configuration
export const EMAIL_CONFIG = {
  // Using Resend's test domain until flowtrade.com.au is verified
  // After verification, change to: 'quotes@flowtrade.com.au'
  fromDomain: 'onboarding@resend.dev',
  replyTo: 'hello@flowtechdigital.com.au',
  
  // Production settings (uncomment after domain verification)
  // fromDomain: 'quotes@flowtrade.com.au',
  // replyTo: 'support@flowtrade.com.au',
}
