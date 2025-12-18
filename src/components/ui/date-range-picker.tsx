'use client';

import * as React from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type PresetKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

interface Preset {
  label: string;
  getValue: () => DateRange;
}

const presets: Record<Exclude<PresetKey, 'custom'>, Preset> = {
  today: {
    label: 'Today',
    getValue: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  yesterday: {
    label: 'Yesterday',
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    },
  },
  last7: {
    label: 'Last 7 days',
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  last30: {
    label: 'Last 30 days',
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  last90: {
    label: 'Last 90 days',
    getValue: () => ({
      from: subDays(new Date(), 89),
      to: new Date(),
    }),
  },
  thisMonth: {
    label: 'This month',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
  lastMonth: {
    label: 'Last month',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  thisYear: {
    label: 'This year',
    getValue: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
};

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [customFrom, setCustomFrom] = React.useState('');
  const [customTo, setCustomTo] = React.useState('');
  const [activePreset, setActivePreset] = React.useState<PresetKey>('last30');

  const handlePresetClick = (key: Exclude<PresetKey, 'custom'>) => {
    const preset = presets[key];
    const newRange = preset.getValue();
    onChange(newRange);
    setActivePreset(key);
    setOpen(false);
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      if (from <= to) {
        onChange({ from, to });
        setActivePreset('custom');
        setOpen(false);
      }
    }
  };

  const formatDateRange = () => {
    if (!value.from || !value.to) return 'Select date range';
    
    const fromStr = format(value.from, 'MMM d, yyyy');
    const toStr = format(value.to, 'MMM d, yyyy');
    
    if (fromStr === toStr) return fromStr;
    return `${fromStr} - ${toStr}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-between text-left font-normal min-w-[260px]',
            'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{formatDateRange()}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[340px] p-0 bg-slate-800 border-slate-700" 
        align="start"
      >
        <div className="p-3 border-b border-slate-700">
          <p className="text-sm font-medium text-white">Select Date Range</p>
        </div>
        
        {/* Preset buttons */}
        <div className="p-3 grid grid-cols-2 gap-2">
          {(Object.keys(presets) as Exclude<PresetKey, 'custom'>[]).map((key) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              className={cn(
                'justify-start text-sm',
                activePreset === key
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
              onClick={() => handlePresetClick(key)}
            >
              {presets[key].label}
            </Button>
          ))}
        </div>

        {/* Custom date inputs */}
        <div className="p-3 border-t border-slate-700">
          <p className="text-xs font-medium text-slate-400 mb-2">Custom Range</p>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            size="sm"
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
          >
            Apply Custom Range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
