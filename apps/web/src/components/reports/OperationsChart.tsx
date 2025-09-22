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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null); // Clear previous data
    
    reportsService.getOperationsData(period)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));

  }, [period]);

  if (loading) return <div>Loading Chart...</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div style={{ height: 350 }}>
      <CustomChart type="line" labels={data.labels} datasets={data.datasets} />
    </div>
  );
}