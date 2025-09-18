'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { reportsService } from '@/app/services/reports';

export default function AttendanceReport() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    // reportsService.getAttendance().then(setData).catch(console.error);

    // Mock Data
    const mockAttendanceData = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
      datasets: [
        {
          label: 'Member Attendance',
          data: [250, 280, 310, 300, 340, 360, 350],
          fill: false,
          borderColor: '#d8ff3e',
          tension: 0.1,
        },
      ],
    };
    setTimeout(() => setData(mockAttendanceData), 500);
  }, []);

  if (!data) return <div>Loading attendance…</div>;

  return (
    <div>
      <h3>Attendance</h3>
      <div style={{ height: 320 }}>
        <CustomChart type="line" labels={data.labels} datasets={data.datasets} options={{ responsive: true }} />
      </div>
    </div>
  );
}