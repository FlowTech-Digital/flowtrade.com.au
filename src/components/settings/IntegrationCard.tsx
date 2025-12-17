'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Mail, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';

export type IntegrationStatus = 'not_connected' | 'pending' | 'connected' | 'error';

export interface IntegrationCardProps {
  type: 'stripe' | 'resend' | 'xero';
  status: IntegrationStatus;
  title: string;
  description: string;
  connectedDetails?: string;
  errorMessage?: string;
  onSetup?: () => void;
  onManage?: () => void;
  onFix?: () => void;
  comingSoon?: boolean;
}

const iconMap = {
  stripe: CreditCard,
  resend: Mail,
  xero: FileSpreadsheet,
};

const statusConfig = {
  not_connected: {
    icon: null,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    label: 'Not Connected',
  },
  pending: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    label: 'Connecting...',
  },
  connected: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    label: 'Connected',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    label: 'Error',
  },
};

export function IntegrationCard({
  type,
  status,
  title,
  description,
  connectedDetails,
  errorMessage,
  onSetup,
  onManage,
  onFix,
  comingSoon = false,
}: IntegrationCardProps) {
  const Icon = iconMap[type];
  const StatusIcon = statusConfig[status].icon;
  const config = statusConfig[status];

  return (
    <Card className="relative overflow-hidden">
      {comingSoon && (
        <div className="absolute top-3 right-3 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
          Coming Soon
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {StatusIcon && (
              <StatusIcon
                className={`h-4 w-4 ${config.color} ${status === 'pending' ? 'animate-spin' : ''}`}
              />
            )}
            {!StatusIcon && (
              <div className={`h-2 w-2 rounded-full ${status === 'not_connected' ? 'bg-gray-300' : ''}`} />
            )}
            <span className={`text-sm font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
          <div>
            {status === 'not_connected' && !comingSoon && (
              <Button size="sm" onClick={onSetup}>
                Set Up
              </Button>
            )}
            {status === 'pending' && (
              <Button size="sm" variant="outline" disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Connecting
              </Button>
            )}
            {status === 'connected' && (
              <Button size="sm" variant="outline" onClick={onManage}>
                Manage
              </Button>
            )}
            {status === 'error' && (
              <Button size="sm" variant="destructive" onClick={onFix}>
                Fix Issues
              </Button>
            )}
            {comingSoon && (
              <Button size="sm" variant="ghost" disabled>
                Notify Me
              </Button>
            )}
          </div>
        </div>
        {status === 'connected' && connectedDetails && (
          <p className="mt-2 text-sm text-gray-600">{connectedDetails}</p>
        )}
        {status === 'error' && errorMessage && (
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
