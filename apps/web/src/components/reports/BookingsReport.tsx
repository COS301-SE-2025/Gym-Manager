'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { reportsService } from '@/app/services/reports';

export default function BookingsReport() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // reportsService.getBookings().then((d) => {
    //   // Expect API shape { labels: string[], datasets: any[] }
    //   setData(d);
    // }).catch((e) => {
    //   console.error('BookingsReport error', e);
    // }).finally(() => setLoading(false));

    // Mock Data
    const mockBookingsData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Bookings',
          data: [65, 59, 80, 81, 56, 55, 40],
          backgroundColor: '#d8ff3e',
          borderColor: '#d8ff3e',
          borderWidth: 1,
        },
      ],
    };
    setTimeout(() => {
      setData(mockBookingsData);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) return <div>Loading Bookings…</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      <h3>Bookings</h3>
      <div style={{ height: 320 }}>
        <CustomChart type="bar" labels={data.labels} datasets={data.datasets} options={{ responsive: true }} />
      </div>
    </div>
  );
}
