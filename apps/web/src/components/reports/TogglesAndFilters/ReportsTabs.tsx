'use client';

import { useState } from 'react';
import BookingsReport from '../BookingsReport';
import AttendanceReport from '../AttendanceReport';
import FillRateReport from '../FillRateReport';
import CancellationRateReport from '../CancellationRateReport';
import ConversionFunnelReport from '../Charts/ConversionFunnelReport';
import CohortRetentionReport from '../CohortRetentionReport';
import LogsTab from '../Tabs/LogsTab';

const TABS = [
  { key: 'bookings', label: 'Bookings' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'fill', label: 'Fill Rate' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'conversion', label: 'Conversion Funnel' },
  { key: 'cohorts', label: 'Cohort Retention' },
  { key: 'logs', label: 'Logs' },
];

export default function ReportsTabs() {
  const [active, setActive] = useState<string>('bookings');

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #2e2e2e',
              background: active === t.key ? '#d8ff3e' : '#1f1f1f',
              color: active === t.key ? '#000' : '#fff',
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {active === 'bookings' && <BookingsReport />}
        {active === 'attendance' && <AttendanceReport />}
        {active === 'fill' && <FillRateReport />}
        {active === 'cancellations' && <CancellationRateReport />}
        {active === 'conversion' && <ConversionFunnelReport />}
        {active === 'cohorts' && <CohortRetentionReport />}
        {active === 'logs' && <LogsTab />}
      </div>
    </div>
  );
}
