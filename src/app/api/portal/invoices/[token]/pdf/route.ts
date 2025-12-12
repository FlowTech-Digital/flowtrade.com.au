import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client with service role (bypasses RLS for portal access)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10;
  
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// Extract first IP from x-forwarded-for header
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',');
    const firstIp = parts[0]?.trim();
    if (firstIp && /^[\d.:a-fA-F]+$/.test(firstIp)) {
      return firstIp;
    }
  }
  return 'unknown';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const ip = getClientIp(request);
    
    // Rate limiting
    if (!checkRateLimit(`pdf:${ip}`)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = getSupabaseClient();

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'invoice')
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Check if expired or revoked
    if (tokenData.is_revoked || new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This link has expired or been revoked' },
        { status: 403 }
      );
    }

    // Fetch invoice to get PDF URL
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, pdf_url')
      .eq('id', tokenData.resource_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Log PDF download - fire and forget
    if (ip !== 'unknown') {
      supabase.from('portal_access_logs').insert({
        token_id: tokenData.id,
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || 'unknown',
        action: 'download_invoice_pdf'
      }).then(({ error }) => {
        if (error) console.error('Access log error (non-fatal):', error);
      });
    }

    // If PDF URL exists, redirect to it
    if (invoice.pdf_url) {
      return NextResponse.redirect(invoice.pdf_url);
    }

    // If no PDF URL, return error (portal users can't generate PDFs)
    return NextResponse.json(
      { error: 'PDF not available. Please contact the business.' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Invoice PDF download error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
