import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Create Supabase client inside handler (edge runtime requires this)
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Helper functions
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getStatusColor(status: string): [number, number, number] {
  switch (status.toLowerCase()) {
    case 'accepted':
      return [34, 197, 94]; // Green
    case 'sent':
      return [59, 130, 246]; // Blue
    case 'expired':
      return [239, 68, 68]; // Red
    case 'draft':
    default:
      return [156, 163, 175]; // Gray
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = getSupabaseClient();

  try {
    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('portal_tokens')
      .select('*')
      .eq('token', token)
      .eq('token_type', 'quote')
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'not_found', message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if token is expired or revoked
    if (new Date(tokenData.expires_at) < new Date() || tokenData.is_revoked) {
      return NextResponse.json(
        { error: 'invalid', message: 'This link is no longer valid' },
        { status: 410 }
      );
    }

    // Get quote with all necessary relations
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(
          id, first_name, last_name, company_name, email, phone,
          street_address, suburb, state, postcode
        )
      `)
      .eq('id', tokenData.resource_id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'not_found', message: 'Quote not found' },
        { status: 404 }
      );
    }

    // Get line items
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('item_order');

    if (lineItemsError) {
      console.error('Error fetching line items:', lineItemsError);
    }

    // Get organization info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, abn, email, phone, address, logo_url')
      .eq('id', quote.org_id)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
    }

    // Log the PDF download
    await supabase.from('portal_access_logs').insert({
      token_id: tokenData.id,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
      action: 'download_quote_pdf'
    });

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colors
    const primaryColor: [number, number, number] = [59, 130, 246];
    const textColor: [number, number, number] = [31, 41, 55];
    const lightGray: [number, number, number] = [156, 163, 175];
    const greenColor: [number, number, number] = [34, 197, 94];
    
    let yPos = 20;
    const businessNameX = 20;
    
    // Header - Business name and Quote title
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.text(org?.name || 'Business', businessNameX, yPos);
    
    doc.setFontSize(28);
    doc.setTextColor(...textColor);
    doc.text('QUOTE', pageWidth - 20, yPos, { align: 'right' });
    
    yPos += 10;
    
    // Business details
    doc.setFontSize(10);
    doc.setTextColor(...lightGray);
    if (org?.abn) {
      doc.text(`ABN: ${org.abn}`, businessNameX, yPos);
      yPos += 5;
    }
    if (org?.email) {
      doc.text(org.email, businessNameX, yPos);
      yPos += 5;
    }
    if (org?.phone) {
      doc.text(org.phone, businessNameX, yPos);
      yPos += 5;
    }
    if (org?.address) {
      doc.text(org.address, businessNameX, yPos);
      yPos += 5;
    }
    
    yPos += 10;
    
    // Quote details (right side)
    const quoteDetailsY = 35;
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text(`Quote #: ${quote.quote_number}`, pageWidth - 20, quoteDetailsY, { align: 'right' });
    if (quote.version > 1) {
      doc.text(`Version: ${quote.version}`, pageWidth - 20, quoteDetailsY + 6, { align: 'right' });
    }
    doc.text(`Date: ${formatDate(quote.created_at)}`, pageWidth - 20, quoteDetailsY + (quote.version > 1 ? 12 : 6), { align: 'right' });
    doc.text(`Valid Until: ${formatDate(quote.valid_until)}`, pageWidth - 20, quoteDetailsY + (quote.version > 1 ? 18 : 12), { align: 'right' });
    
    // Status badge
    const statusY = quoteDetailsY + (quote.version > 1 ? 26 : 20);
    const statusText = quote.status.toUpperCase();
    const statusColor = getStatusColor(quote.status);
    doc.setFillColor(...statusColor);
    doc.roundedRect(pageWidth - 45, statusY - 4, 25, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(statusText, pageWidth - 32.5, statusY + 1, { align: 'center' });
    
    yPos = Math.max(yPos, 75);
    
    // Customer section
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('Customer', 20, yPos);
    yPos += 7;
    
    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    const customerName = quote.customer?.company_name || 
      `${quote.customer?.first_name || ''} ${quote.customer?.last_name || ''}`.trim();
    doc.text(customerName, 20, yPos);
    yPos += 5;
    
    doc.setFontSize(10);
    doc.setTextColor(...lightGray);
    if (quote.customer?.email) {
      doc.text(quote.customer.email, 20, yPos);
      yPos += 5;
    }
    if (quote.customer?.phone) {
      doc.text(quote.customer.phone, 20, yPos);
      yPos += 5;
    }
    
    // Customer address
    const addressParts = [
      quote.customer?.street_address,
      [quote.customer?.suburb, quote.customer?.state, quote.customer?.postcode].filter(Boolean).join(' ')
    ].filter((part): part is string => typeof part === 'string' && part.length > 0);
    
    addressParts.forEach((line: string) => {
      doc.text(line, 20, yPos);
      yPos += 5;
    });
    
    yPos += 5;
    
    // Job Site section
    if (quote.job_site_address) {
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('Job Site', 20, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      const siteLines = doc.splitTextToSize(quote.job_site_address, 80);
      doc.text(siteLines, 20, yPos);
      yPos += siteLines.length * 5 + 5;
    }
    
    // Job Description
    if (quote.job_description) {
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('Job Description', 20, yPos);
      yPos += 7;
      
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      const descLines = doc.splitTextToSize(quote.job_description, pageWidth - 40);
      doc.text(descLines, 20, yPos);
      yPos += descLines.length * 5 + 10;
    }
    
    // Line items table
    const items = lineItems || [];
    const requiredItems = items.filter((item: { is_optional: boolean }) => !item.is_optional);
    const optionalItems = items.filter((item: { is_optional: boolean }) => item.is_optional);
    
    // Required items table
    if (requiredItems.length > 0) {
      const tableData = requiredItems.map((item: { 
        item_type: string; 
        description: string; 
        quantity: number; 
        unit: string; 
        unit_price: number; 
        line_total: number 
      }) => [
        capitalizeFirst(item.item_type),
        item.description,
        item.quantity.toString(),
        item.unit,
        formatCurrency(item.unit_price),
        formatCurrency(item.line_total)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 9,
          textColor: textColor
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      });
      
      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }
    
    // Optional items table
    if (optionalItems.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text('Optional Items', 20, yPos);
      yPos += 7;
      
      const optionalTableData = optionalItems.map((item: { 
        item_type: string; 
        description: string; 
        quantity: number; 
        unit: string; 
        unit_price: number; 
        line_total: number 
      }) => [
        capitalizeFirst(item.item_type),
        item.description,
        item.quantity.toString(),
        item.unit,
        formatCurrency(item.unit_price),
        formatCurrency(item.line_total)
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Type', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
        body: optionalTableData,
        theme: 'striped',
        headStyles: {
          fillColor: [156, 163, 175],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 9,
          textColor: textColor,
          fontStyle: 'italic'
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' }
        },
        margin: { left: 20, right: 20 }
      });
      
      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }
    
    yPos += 5;
    
    // Totals section
    const totalsX = pageWidth - 70;
    
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, yPos);
    doc.text(formatCurrency(quote.subtotal), pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;
    
    doc.text(`GST (${quote.tax_rate}%):`, totalsX, yPos);
    doc.text(formatCurrency(quote.gst_amount), pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;
    
    // Total with background
    doc.setFillColor(243, 244, 246);
    doc.rect(totalsX - 5, yPos - 5, pageWidth - totalsX + 5 - 15, 12, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', totalsX, yPos + 3);
    doc.text(formatCurrency(quote.total), pageWidth - 20, yPos + 3, { align: 'right' });
    
    yPos += 20;
    
    // Deposit section
    if (quote.deposit_required && (quote.deposit_amount || quote.deposit_percentage)) {
      doc.setFillColor(236, 253, 245);
      doc.rect(20, yPos - 5, pageWidth - 40, 20, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...greenColor);
      doc.text('Deposit Required', 25, yPos + 3);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const depositText = quote.deposit_percentage 
        ? `${quote.deposit_percentage}% deposit (${formatCurrency(quote.deposit_amount || 0)}) required to commence work`
        : `${formatCurrency(quote.deposit_amount || 0)} deposit required to commence work`;
      doc.text(depositText, 25, yPos + 11);
      
      yPos += 25;
    }
    
    // Customer notes
    if (quote.customer_notes) {
      doc.setFontSize(10);
      doc.setTextColor(...lightGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Notes:', 20, yPos);
      yPos += 5;
      doc.setTextColor(...textColor);
      
      const splitNotes = doc.splitTextToSize(quote.customer_notes, pageWidth - 40);
      doc.text(splitNotes, 20, yPos);
      yPos += splitNotes.length * 5 + 10;
    }
    
    // Terms and conditions
    if (quote.terms_and_conditions) {
      if (yPos > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(10);
      doc.setTextColor(...lightGray);
      doc.text('Terms & Conditions:', 20, yPos);
      yPos += 5;
      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      
      const splitTerms = doc.splitTextToSize(quote.terms_and_conditions, pageWidth - 40);
      doc.text(splitTerms, 20, yPos);
    }
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    doc.text('Thank you for considering our services!', pageWidth / 2, footerY, { align: 'center' });
    
    // Get PDF as array buffer
    const pdfOutput = doc.output('arraybuffer');
    
    // Return PDF response
    return new NextResponse(pdfOutput, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.quote_number}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
