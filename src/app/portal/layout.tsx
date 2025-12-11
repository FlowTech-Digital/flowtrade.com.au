// FlowTrade Customer Portal Layout
// Phase 5.1: Foundation
// No authentication required - token-based access

import { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Customer Portal | FlowTrade',
  description: 'View and manage your quotes, invoices, and job status',
  robots: 'noindex, nofollow', // Don't index portal pages
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
