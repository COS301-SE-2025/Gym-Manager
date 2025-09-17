'use client';
import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { reportsService } from '@/app/services/reports';

type Period = 'today' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'all';

interface OperationsChartProps {
  period: Period;
}

export default function OperationsChart({ period }: OperationsChartProps) {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    setData(null); // Clear previous data
    // reportsService.getOperationsData(period).then(setData).catch(console.error);
    
    // Mock data fetching - convert new period to old format for now
    const oldPeriod = period === 'today' ? 'daily' : 
                     period === 'lastWeek' ? 'weekly' : 
                     period === 'lastMonth' ? 'monthly' : 'weekly';
    const mockData = reportsService.getOperationsData(oldPeriod);
    setTimeout(() => setData(mockData), 300);

  }, [period]);

  if (!data) return <div>Loading Chart...</div>;

  return (
    <div style={{ height: 350 }}>
      <CustomChart type="line" labels={data.labels} datasets={data.datasets} />
    </div>
  );
}