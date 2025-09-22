'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { reportsService } from '@/app/services/reports';

export default function CancellationRateReport() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    // reportsService.getCancellations().then(setData).catch(console.error);

    // Mock Data
    const mockCancellationData = {
      labels: ['HIIT', 'Yoga', 'Spin', 'Pilates', 'Strength'],
      datasets: [
        {
          label: 'Cancellation Rate (%)',
          data: [5, 2, 12, 8, 3],
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1,
        },
      ],
    };
    setTimeout(() => setData(mockCancellationData), 500);
  }, []);

  if (!data) return <div>Loading cancellations…</div>;

  return (
    <div>
      <h3>Cancellation Rate</h3>
      <div style={{ height: 300 }}>
        <CustomChart type="bar" labels={data.labels} datasets={data.datasets} options={{ responsive: true }} />
      </div>
    </div>
  );
}