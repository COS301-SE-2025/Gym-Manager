'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { reportsService } from '@/app/services/reports';

export default function ConversionFunnelReport() {
  const [funnel, setFunnel] = useState<any | null>(null);

  useEffect(() => {
    // reportsService.getConversionFunnel().then(setFunnel).catch(console.error);

    // Mock Data
    const mockFunnelData = {
      labels: ['Signed Up', 'Viewed Classes', 'Booked First Class', 'Attended First Class'],
      datasets: [
        {
          label: 'Users',
          data: [1000, 750, 400, 320],
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(216, 255, 62, 0.6)',
          ],
        },
      ],
    };
    setTimeout(() => setFunnel(mockFunnelData), 500);
  }, []);

  if (!funnel) return <div>Loading conversion funnel…</div>;

  return (
    <div>
      <h3>Conversion Funnel</h3>
      <div style={{ height: 360 }}>
        {/* conversion funnel often visualised as bar/pyramid — use bar for simplicity */}
        <CustomChart
          type="bar"
          labels={funnel.labels}
          datasets={funnel.datasets}
          options={{ indexAxis: 'y', responsive: true }}
        />
      </div>
    </div>
  );
}