'use client';

import { useEffect, useMemo, useState } from 'react';
import { reportsService } from '@/app/services/reports';

// Helper function to format log messages based on event type
const formatLogMessage = (log: any): string => {
  const { eventType, properties, userId } = log;
  
  switch (eventType) {
    case 'admin_login':
      return `Admin user (ID: ${userId}) logged in.`;
    
    case 'class_creation':
      return `Created new class: "${properties?.classId ? `Class ID: ${properties.classId}` : 'Unknown Class'}" on ${properties?.scheduledDate} at ${properties?.scheduledTime}.`;
    
    case 'class_booking':
      return `User (ID: ${userId}) booked class ID: ${properties?.classId}.`;
    
    case 'class_cancellation':
      return `User (ID: ${userId}) cancelled booking for class ID: ${properties?.classId}.`;
    
    case 'class_attendance':
      return `User (ID: ${userId}) attended class ID: ${properties?.classId}.`;
    
    case 'user_role_assignment':
      return `Assigned role "${properties?.role}" to user ID: ${properties?.assignedUserId}.`;
    
    case 'user_role_update':
      return `Updated user ID: ${properties?.updatedUserId} to role "${properties?.newRole}".`;
    
    case 'membership_approval':
      return `Approved membership for user ID: ${properties?.approvedUserId}.`;
    
    default:
      return `${eventType} event occurred${userId ? ` for user ID: ${userId}` : ''}.`;
  }
};

export default function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    reportsService.getLogs()
      .then((data) => {
        //transform data to match the expected format
        const transformedLogs = data.map((log: any) => ({
          timestamp: log.createdAt,
          message: formatLogMessage(log),
          eventType: log.eventType,
          userId: log.userId,
          properties: log.properties
        }));
        setLogs(transformedLogs);
      })
      .catch((error) => {
        console.error('Failed to fetch logs:', error);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const availableEventTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => l?.eventType && set.add(l.eventType));
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000) : null;

    return logs.filter((l) => {
      const ts = new Date(l.timestamp);
      if (eventTypeFilter !== 'all' && l.eventType !== eventTypeFilter) return false;
      if (start && ts < start) return false;
      if (end && ts >= end) return false;
      return true;
    });
  }, [logs, eventTypeFilter, startDate, endDate]);

  return (
    <div>
      <h3>Activity Logs</h3>
      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        background: '#1e1e1e',
        padding: 12,
        borderRadius: 8,
        border: '1px solid #434343',
        margin: '12px 0'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: '#fff', fontSize: 12 }}>Event Type</label>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            style={{
              background: '#2e2e2e',
              color: '#fff',
              border: '1px solid #434343',
              borderRadius: 6,
              padding: '8px 10px',
              minWidth: 180
            }}
          >
            <option value="all">All events</option>
            {availableEventTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: '#fff', fontSize: 12 }}>From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              background: '#2e2e2e',
              color: '#fff',
              border: '1px solid #434343',
              borderRadius: 6,
              padding: '8px 10px'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ color: '#fff', fontSize: 12 }}>To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              background: '#2e2e2e',
              color: '#fff',
              border: '1px solid #434343',
              borderRadius: 6,
              padding: '8px 10px'
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => { setEventTypeFilter('all'); setStartDate(''); setEndDate(''); }}
          className=""
          style={{
            backgroundColor: '#d8ff3e',
            color: '#0b0b0b',
            border: 'none',
            padding: '10px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Reset filters
        </button>
      </div>

      {loading ? <div>Loading logs…</div> : (
        <div style={{ maxHeight: 420, overflow: 'auto', background: '#0f0f0f', padding: 12, borderRadius: 8 }}>
          {filteredLogs.length === 0 ? (
            <div style={{ color: '#aaa', textAlign: 'center', padding: 20 }}>No logs available</div>
          ) : (
            filteredLogs.map((l, i) => (
              <div key={i} style={{ padding: 12, borderBottom: '1px solid #222', marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ color: '#ddd', fontSize: 13, fontWeight: 'bold' }}>
                    {new Date(l.timestamp).toLocaleString?.() ?? l.timestamp}
                  </div>
                  <div style={{ 
                    color: '#4a9eff', 
                    fontSize: 11, 
                    background: '#1a1a1a', 
                    padding: '2px 6px', 
                    borderRadius: 4,
                    textTransform: 'uppercase'
                  }}>
                    {l.eventType}
                  </div>
                </div>
                <div style={{ color: '#aaa', fontSize: 14, lineHeight: 1.4 }}>
                  {l.message}
                </div>
                {l.userId && (
                  <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                    User ID: {l.userId}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
