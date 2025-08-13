import { useEffect, useState } from 'react';

export function useClassTimer(startedAtISO: string | null, capSeconds?: number) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!startedAtISO) {
    return { elapsed: 0, remaining: capSeconds ?? 0, capped: false, fmt: '00:00' };
  }

  const started = new Date(startedAtISO).getTime();
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  const capped = typeof capSeconds === 'number' && elapsed >= capSeconds;
  const remaining = Math.max(0, (capSeconds ?? 0) - elapsed);
  const fmt = formatHMS(elapsed);

  return { elapsed, remaining, capped, fmt };
}

function formatHMS(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
  }
  return [m, sec].map(n => String(n).padStart(2, '0')).join(':');
}
