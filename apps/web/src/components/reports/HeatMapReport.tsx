'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';

// not used un til fixed
export default function HeatMapReport() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    // reportsService.getUtilizationByHour().then(setData).catch(console.error);

    // Mock Data
    const mockRawData = {
      x_labels: ['6am', '7am', '8am', '9am', '5pm', '6pm', '7pm', '8pm'],
      y_labels: ['Sun', 'Sat', 'Fri', 'Thu', 'Wed', 'Tue', 'Mon'],
      values: [
        [70, 60, 80, 90, 30, 20, 10, 5],   // Sun
        [80, 70, 90, 100, 40, 30, 20, 10], // Sat
        [30, 60, 40, 70, 90, 80, 70, 50],  // Fri
        [25, 55, 35, 65, 85, 95, 75, 45],  // Thu
        [20, 50, 30, 60, 80, 100, 70, 40], // Wed
        [15, 45, 25, 55, 75, 95, 65, 35],  // Tue
        [10, 40, 20, 50, 70, 90, 60, 30],  // Mon
      ],
    };

    // Transform raw data into {x, y, v} format for the heatmap
    const heatmapData = [];
    for (let i = 0; i < mockRawData.y_labels.length; i++) {
      for (let j = 0; j < mockRawData.x_labels.length; j++) {
        heatmapData.push({
          x: mockRawData.x_labels[j],
          y: mockRawData.y_labels[i],
          v: mockRawData.values[i][j],
        });
      }
    }

    const chartJsData = {
      datasets: [{
        label: 'Utilization by Hour',
        data: heatmapData,
        backgroundColor(context: any) {
          const value = context.dataset.data[context.dataIndex].v;
          const alpha = (value - 5) / (100 - 5);
          return `rgba(216, 255, 62, ${alpha})`;
        },
        borderColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1,
        width: (c: any) => (c.chart.chartArea || {}).width / mockRawData.x_labels.length - 1,
        height: (c: any) => (c.chart.chartArea || {}).height / mockRawData.y_labels.length - 1,
      }],
    };

    setTimeout(() => setData(chartJsData), 500);
  }, []);

  if (!data) return <div>Loading heatmap...</div>;

  return (
    <div style={{ height: 400, position: 'relative' }}>
      <CustomChart type="heatmap" datasets={data.datasets} />
    </div>
  );
}