'use client';
import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/reports/Charts/CustomChartHolder/CustomChart';
import { reportsService } from '@/app/services/reports';
import TimePeriodToggle from '../TogglesAndFilters/TimePeriodToggle';

type Period = 'today' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'all';

export default function AcquisitionChart() {
  const [data, setData] = useState<any | null>(null);
  const [period, setPeriod] = useState<Period>('lastMonth');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    
    reportsService.getAcquisitionData(period)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));

  }, [period]);

  if (loading) return <div>Loading Chart...</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div>
      <TimePeriodToggle selected={period} onSelect={setPeriod} />
      <div style={{ height: 350, marginTop: '1rem' }}>
        <CustomChart type="line" labels={data.labels} datasets={data.datasets} />
      </div>
    </div>
  );
}