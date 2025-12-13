'use client';

import type { ReactElement } from 'react';
import type { Invoice, InvoiceLineItem, BusinessInfo } from './InvoicePDF';

export type { Invoice, InvoiceLineItem, BusinessInfo };

interface DownloadInvoicePDFOptions {
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
  businessInfo?: BusinessInfo;
  filename?: string;
}

/**
 * Generate and download an invoice PDF client-side
 * Uses dynamic import to ensure @react-pdf/renderer only loads in browser
 */
export async function downloadInvoicePDF(options: DownloadInvoicePDFOptions): Promise<void> {
  const { invoice, lineItems, businessInfo, filename } = options;

  try {
    // Dynamic imports to ensure browser-only loading
    const [{ pdf }, { createElement }, { default: InvoicePDF }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('react'),
      import('./InvoicePDF'),
    ]);

    // Create the PDF document element with type assertion for @react-pdf/renderer compatibility
    const element = createElement(InvoicePDF, { invoice, lineItems, businessInfo }) as ReactElement<any>;
    
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
