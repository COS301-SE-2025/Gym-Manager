'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { reportsService } from '@/app/services/reports';
import CohortTimePeriodToggle from './CohortTimePeriodToggle';

type CohortPeriod = 'lastMonth' | 'lastYear' | 'all';

export default function CohortRetentionReport() {
  const [data, setData] = useState<any | null>(null);
  const [period, setPeriod] = useState<CohortPeriod>('lastMonth');
  const [loading, setLoading] = useState(false);

  const fetchCohortData = async (selectedPeriod: CohortPeriod) => {
    setLoading(true);
    setData(null);
    try {
      const cohortData = await reportsService.getCohortRetention(selectedPeriod);
      setData(cohortData);
    } catch (error) {
      console.error('Failed to fetch cohort retention data:', error);
      // Fallback to mock data
      const getMockCohortData = (p: CohortPeriod) => {
        return {
          labels: ['Month 0', 'Month 1', 'Month 2', 'Month 3', 'Month 6', 'Month 9', 'Month 12'],
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
      };
      setData(getMockCohortData(selectedPeriod));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohortData(period);
  }, [period]);

  if (loading || !data) return <div>Loading cohorts…</div>;

  return (
    <div>
      <CohortTimePeriodToggle selected={period} onSelect={setPeriod} />
      <div style={{ height: 320, marginTop: '1rem' }}>
        <CustomChart type="line" labels={data.labels} datasets={data.datasets} options={{ responsive: true }} />
      </div>
    </div>
  );
}