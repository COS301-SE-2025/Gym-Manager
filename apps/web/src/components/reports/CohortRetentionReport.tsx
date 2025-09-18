'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { reportsService } from '@/app/services/reports';
import TimePeriodToggle from './TimePeriodToggle';

type Period = 'today' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'all';

export default function CohortRetentionReport() {
  const [data, setData] = useState<any | null>(null);
  const [period, setPeriod] = useState<Period>('lastWeek');

  useEffect(() => {
    setData(null);
    // Mock Data for member retention percentage over time
    const getMockCohortData = (p: Period) => {
      if (p === 'lastMonth' || p === 'lastYear') {
        return {
          labels: ['Month 0', 'Month 1', 'Month 3', 'Month 6', 'Month 9', 'Month 12'],
          datasets: [
            {
              label: '% Members Retained',
              data: [100, 92, 80, 71, 65, 60],
              borderColor: '#d8ff3e',
              backgroundColor: 'rgba(216, 255, 62, 0.2)',
              fill: true,
              tension: 0.2,
            },
          ],
        };
      }
      // weekly or other periods
      return {
        labels: ['Week 0', 'Week 1', 'Week 4', 'Week 8', 'Week 12', 'Week 24'],
        datasets: [
          {
            label: '% Members Retained',
            data: [100, 88, 75, 68, 60, 52],
            borderColor: '#d8ff3e',
            backgroundColor: 'rgba(216, 255, 62, 0.2)',
            fill: true,
            tension: 0.2,
          },
        ],
      };
    };

    setTimeout(() => setData(getMockCohortData(period)), 300);
  }, [period]);

  if (!data) return <div>Loading cohorts…</div>;

  return (
    <div>
      <TimePeriodToggle selected={period} onSelect={setPeriod} />
      <div style={{ height: 320, marginTop: '1rem' }}>
        <CustomChart type="line" labels={data.labels} datasets={data.datasets} options={{ responsive: true }} />
      </div>
    </div>
  );
}