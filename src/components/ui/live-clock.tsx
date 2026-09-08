'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getLocal24TimeWithSeconds } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface LiveClockProps {
  className?: string;
  showDate?: boolean;
}

export function LiveClock({ className = '', showDate = true }: LiveClockProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(getLocal24TimeWithSeconds(now));
      setDateStr(format(now, 'EEEE, d MMM yyyy', { locale: idLocale }));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!timeStr) {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono bg-muted/50 text-muted-foreground border border-border/50 animate-pulse ${className}`}>
        <Clock className="h-3.5 w-3.5" />
        <span>--:--:--</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/60 transition-colors ${className}`} title="Waktu Lokal (Format 24 Jam)">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <Clock className="h-3.5 w-3.5 text-primary" />
      <span className="font-mono font-semibold tracking-wider text-primary">
        {timeStr}
      </span>
      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-primary/10 text-primary px-1.5 py-0.2 rounded">
        24H
      </span>
      {showDate && dateStr && (
        <span className="hidden md:inline text-muted-foreground border-l border-border/80 pl-2 text-[11px]">
          {dateStr}
        </span>
      )}
    </div>
  );
}
