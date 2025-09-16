'use client';

import { useEffect, useState } from 'react';
import { reportsService } from '@/app/services/reports';

export default function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // reportsService.getLogs().then((d) => setLogs(d || [])).catch(console.error).finally(() => setLoading(false));

    // Mock Data
    const mockLogs = [
      { timestamp: '2025-09-15T10:00:00Z', message: 'Admin user logged in.' },
      { timestamp: '2025-09-15T10:02:15Z', message: 'Created new class: "Morning Yoga".' },
      { timestamp: '2025-09-15T10:05:30Z', message: 'User "john.doe@example.com" booked "Morning Yoga".' },
      { timestamp: '2025-09-15T11:30:00Z', message: 'Weekly schedule generated.' },
      { timestamp: '2025-09-15T12:00:00Z', message: 'User "jane.doe@example.com" cancelled booking for "HIIT Blast".' },
    ];
    setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div>
      <h3>Activity Logs</h3>
      {loading ? <div>Loading logs…</div> : (
        <div style={{ maxHeight: 420, overflow: 'auto', background: '#0f0f0f', padding: 12, borderRadius: 8 }}>
          {logs.length === 0 ? <div>No logs</div> : logs.map((l, i) => (
            <div key={i} style={{ padding: 8, borderBottom: '1px solid #222' }}>
              <div style={{ color: '#ddd', fontSize: 13 }}>{new Date(l.timestamp).toLocaleString?.() ?? l.timestamp}</div>
              <div style={{ color: '#aaa', fontSize: 14 }}>{l.message ?? JSON.stringify(l)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
