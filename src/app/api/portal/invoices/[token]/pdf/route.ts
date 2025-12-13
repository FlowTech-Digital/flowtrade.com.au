// DEPRECATED: Server-side PDF generation is not supported on CloudFlare Workers
// PDF generation has been migrated to client-side using jsPDF
// See: src/lib/pdf/downloadInvoicePDF.ts for the new implementation
//
// This route is kept as a stub to prevent 404 errors but returns an error message
// directing users to use the client-side download button instead.

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Log the attempt for monitoring
  const { token } = await params;
  console.log(`PDF API route called for token: ${token?.substring(0, 8)}... - redirecting to client-side generation`);

  return NextResponse.json(
    { 
      error: 'Server-side PDF generation is not available.',
      message: 'Please use the "Download PDF" button on the invoice page to generate your PDF.',
      reason: 'PDF generation has been moved to client-side for CloudFlare compatibility.'
    },
    { status: 501 }
  );
}
