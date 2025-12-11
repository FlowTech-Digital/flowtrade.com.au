'use client';

// FlowTrade Portal Layout Component
// Phase 5.1: Foundation
// Provides branded wrapper for all portal views

import React from 'react';
import Image from 'next/image';

interface PortalLayoutProps {
  children: React.ReactNode;
  organization?: {
    name: string;
    logo_url?: string | null;
    primary_color?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  customerName?: string;
}

const defaultOrganization = {
  name: 'FlowTrade',
  logo_url: null,
  primary_color: '#2563eb',
  email: null,
  phone: null,
};

export function PortalLayout({ children, organization, customerName }: PortalLayoutProps) {
  const org = organization || defaultOrganization;
  const primaryColor = org.primary_color || '#2563eb';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header 
        className="bg-white shadow-sm border-b"
        style={{ borderBottomColor: primaryColor }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {org.logo_url ? (
                <Image
                  src={org.logo_url}
                  alt={org.name}
                  width={40}
                  height={40}
                  className="rounded"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-semibold text-gray-900">{org.name}</h1>
                <p className="text-xs text-gray-500">Customer Portal</p>
              </div>
            </div>
            {customerName && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome,</p>
                <p className="font-medium text-gray-900">{customerName}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              {org.email && (
                <a 
                  href={`mailto:${org.email}`}
                  className="hover:text-gray-700"
                >
                  {org.email}
                </a>
              )}
              {org.email && org.phone && (
                <span className="mx-2">•</span>
              )}
              {org.phone && (
                <a 
                  href={`tel:${org.phone}`}
                  className="hover:text-gray-700"
                >
                  {org.phone}
                </a>
              )}
            </div>
            <div className="text-xs text-gray-400">
              Powered by{' '}
              <a 
                href="https://flowtrade.com.au" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-gray-600"
              >
                FlowTrade
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
