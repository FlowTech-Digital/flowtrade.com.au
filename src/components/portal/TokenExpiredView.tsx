'use client';

// FlowTrade Token Expired/Invalid View
// Phase 5.1: Foundation
// Displays when portal token is expired, revoked, or not found

import React from 'react';
import { AlertCircle, Clock, XCircle, HelpCircle } from 'lucide-react';

type ErrorType = 'expired' | 'revoked' | 'not_found' | 'invalid';

interface TokenExpiredViewProps {
  errorType: ErrorType;
  organizationName?: string;
  contactEmail?: string;
}

const errorConfig: Record<ErrorType, {
  icon: React.ReactNode;
  title: string;
  message: string;
  suggestion: string;
}> = {
  expired: {
    icon: <Clock className="w-12 h-12 text-amber-500" />,
    title: 'Link Expired',
    message: 'This link has expired and is no longer valid.',
    suggestion: 'Please contact the business to request a new link.',
  },
  revoked: {
    icon: <XCircle className="w-12 h-12 text-red-500" />,
    title: 'Link Revoked',
    message: 'This link has been deactivated.',
    suggestion: 'Please contact the business for assistance.',
  },
  not_found: {
    icon: <HelpCircle className="w-12 h-12 text-gray-400" />,
    title: 'Link Not Found',
    message: 'We couldn\'t find the page you\'re looking for.',
    suggestion: 'Please check the URL or contact the business for the correct link.',
  },
  invalid: {
    icon: <AlertCircle className="w-12 h-12 text-red-500" />,
    title: 'Invalid Link',
    message: 'This link is not valid.',
    suggestion: 'Please contact the business to get a valid link.',
  },
};

export function TokenExpiredView({ 
  errorType, 
  organizationName,
  contactEmail 
}: TokenExpiredViewProps) {
  const config = errorConfig[errorType] || errorConfig.invalid;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="flex justify-center mb-4">
          {config.icon}
        </div>
        
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {config.title}
        </h1>
        
        <p className="text-gray-600 mb-4">
          {config.message}
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          {config.suggestion}
        </p>

        {(organizationName || contactEmail) && (
          <div className="border-t pt-6">
            {organizationName && (
              <p className="font-medium text-gray-900 mb-1">
                {organizationName}
              </p>
            )}
            {contactEmail && (
              <a 
                href={`mailto:${contactEmail}`}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {contactEmail}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
