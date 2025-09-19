'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/reports/Charts/CustomChartHolder/CustomChart';
import { reportsService } from '@/app/services/reports';

export default function FillRateReport() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    // reportsService.getFillRate().then(setData).catch(console.error);

    // Mock Data
    const mockFillRateData = {
      labels: ['HIIT', 'Yoga', 'Spin', 'Pilates', 'Strength'],
      datasets: [
        {
          label: 'Average Fill Rate (%)',
          data: [85, 92, 78, 60, 95],
          backgroundColor: 'rgba(216, 255, 62, 0.6)',
          borderColor: '#d8ff3e',
          borderWidth: 1,
        },
      ],
    };
    setTimeout(() => setData(mockFillRateData), 500);
  }, []);

  if (!data) return <div>Loading fill rate…</div>;

  return (
    <div>
      <h3>Class Fill Rate</h3>
      <div style={{ height: 300 }}>
        <CustomChart type="line" labels={data.labels} datasets={data.datasets} options={{ responsive: true }} />
      </div>
    </div>
  );
}