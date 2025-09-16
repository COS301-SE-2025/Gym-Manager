'use client';
import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { reportsService } from '@/app/services/reports';
import TimePeriodToggle from './TimePeriodToggle';

export default function AcquisitionChart() {
  const [data, setData] = useState<any | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    setData(null);
    // reportsService.getAcquisitionData(period).then(setData).catch(console.error);

    // Mock data fetching
    const mockData = reportsService.getAcquisitionData(period);
    setTimeout(() => setData(mockData), 300);

  }, [period]);

  if (!data) return <div>Loading Chart...</div>;

  return (
    <div>
      <TimePeriodToggle selected={period} onSelect={setPeriod} />
      <div style={{ height: 350, marginTop: '1rem' }}>
        <CustomChart type="line" labels={data.labels} datasets={data.datasets} />
      </div>
    </div>
  );
}