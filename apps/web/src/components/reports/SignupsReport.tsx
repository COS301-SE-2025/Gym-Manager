'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { reportsService } from '@/app/services/reports';

export default function SignupsReport() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    // reportsService.getSignups().then(setData).catch(console.error);

    // Mock Data
    const mockSignupsData = {
      labels: ['May', 'June', 'July', 'August', 'September'],
      datasets: [
        {
          label: 'New Signups',
          data: [120, 150, 200, 180, 220],
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
    setTimeout(() => setData(mockSignupsData), 500);
  }, []);

  if (!data) return <div>Loading signups...</div>;

  return (
    <div style={{ height: 300 }}>
      <CustomChart type="bar" labels={data.labels} datasets={data.datasets} />
    </div>
  );
}