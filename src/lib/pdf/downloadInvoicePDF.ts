'use client';

import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import InvoicePDF, { type Invoice, type InvoiceLineItem, type BusinessInfo } from './InvoicePDF';

export type { Invoice, InvoiceLineItem, BusinessInfo };

interface DownloadInvoicePDFOptions {
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
  businessInfo?: BusinessInfo;
  filename?: string;
}

/**
 * Generate and download an invoice PDF client-side
 * Uses @react-pdf/renderer's browser-compatible pdf() function
 */
export async function downloadInvoicePDF(options: DownloadInvoicePDFOptions): Promise<void> {
  const { invoice, lineItems, businessInfo, filename } = options;

  try {
    // Create the PDF document element
    const element = createElement(InvoicePDF, { invoice, lineItems, businessInfo });
    
    // Generate PDF blob in browser
    const blob = await pdf(element).toBlob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${invoice.invoice_number}.pdf`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw new Error('Failed to generate invoice PDF. Please try again.');
  }
}
