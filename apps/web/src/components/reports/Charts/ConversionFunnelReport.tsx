'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/reports/Charts/CustomChartHolder/CustomChart';
import { reportsService } from '@/app/services/reports';

export default function ConversionFunnelReport() {
  const [funnel, setFunnel] = useState<any | null>(null);

  useEffect(() => {
    reportsService.getConversionFunnel().then(setFunnel).catch(console.error);
  }, []);

  if (!funnel) return <div>Loading conversion funnel…</div>;

  return (
    <div>
      <h3>From signup to attending class</h3>
      <div style={{ height: 360 }}>
        {/* conversion funnel often visualised as bar/pyramid — used bar for simplicity */}
        <CustomChart
          type="bar"
          labels={funnel.labels}
          datasets={funnel.datasets}
          options={{ indexAxis: 'y', 
            responsive: true, 
            plugins: {
            legend: {
              display: false
            }
          } }}
        />
      </div>
    </div>
  );
}