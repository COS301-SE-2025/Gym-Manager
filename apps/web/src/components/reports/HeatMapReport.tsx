'use client';

import { useEffect, useState } from 'react';
import HeatmapGrid from './HeatmapGrid';

interface HeatmapData {
  x_labels: string[];
  y_labels: string[];
  values: number[][];
}

export default function HeatMapReport() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // reportsService.getUtilizationByHour().then(setData).catch(console.error);

    // Mock Data - Monday at top
    const mockRawData: HeatmapData = {
      x_labels: ['6am', '7am', '8am', '9am', '5pm', '6pm', '7pm', '8pm'],
      y_labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [
        [10, 40, 20, 50, 70, 90, 60, 30],  // Mon
        [15, 45, 25, 55, 75, 95, 65, 35],  // Tue
        [20, 50, 30, 60, 80, 100, 70, 40], // Wed
        [25, 55, 35, 65, 85, 95, 75, 45],  // Thu
        [30, 60, 40, 70, 90, 80, 70, 50],  // Fri
        [80, 70, 90, 100, 40, 30, 20, 10], // Sat
        [70, 60, 80, 90, 30, 20, 10, 5],   // Sun
      ],
    };

    // Simulate API call delay
    setTimeout(() => {
      setData(mockRawData);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 400,
        color: '#fff',
        fontSize: '1.1rem'
      }}>
        Loading heatmap...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 400,
        color: '#ef4444',
        fontSize: '1.1rem'
      }}>
        Failed to load heatmap data
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <HeatmapGrid 
        data={data} 
        title="Gym Utilization by Day and Time"
        colorScale={{ min: 0, max: 100, color: '#d8ff3e' }}
      />
    </div>
  );
}