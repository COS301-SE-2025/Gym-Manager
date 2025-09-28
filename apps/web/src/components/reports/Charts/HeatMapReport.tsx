'use client';

import { useEffect, useState } from 'react';
import HeatmapGrid from './HeatmapGrid';
import { reportsService } from '../../../app/services/reports';

interface HeatmapData {
  x_labels: string[];
  y_labels: string[];
  values: number[][];
}

interface WeekFilterProps {
  selectedWeek: string;
  onWeekChange: (week: string) => void;
}

function WeekFilter({ selectedWeek, onWeekChange }: WeekFilterProps) {
  const getWeekOptions = () => {
    const options = [];
    const today = new Date();
    
    // Generate options for current week and previous 4 weeks
    for (let i = 0; i < 5; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (today.getDay() + (i * 7))); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekLabel = i === 0 ? 'This Week' : `${i} Week${i > 1 ? 's' : ''} Ago`;
      const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      options.push({
        value: weekStart.toISOString().slice(0, 10),
        label: `${weekLabel} (${dateRange})`,
      });
    }
    
    return options;
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '0.5rem', 
        color: '#fff', 
        fontSize: '0.9rem',
        fontWeight: '500'
      }}>
        Week:
      </label>
      <select
        value={selectedWeek}
        onChange={(e) => onWeekChange(e.target.value)}
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          border: '1px solid #374151',
          backgroundColor: '#1f2937',
          color: '#fff',
          fontSize: '0.9rem',
          minWidth: '200px'
        }}
      >
        {getWeekOptions().map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function HeatMapReport() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  const fetchData = async (weekStartDate?: string) => {
    setLoading(true);
    try {
      const utilizationData = await reportsService.getGymUtilization(weekStartDate);
      // Extract only the heat map data, not the business hours data
      if (utilizationData) { //check needed for eslint
        setData({
          x_labels: utilizationData.x_labels,
          y_labels: utilizationData.y_labels,
          values: utilizationData.values
        });
      } else {
        setData(null); //undefined data
      }
    } catch (error) {
      console.error('Failed to fetch gym utilization data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set initial week to current week
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    setSelectedWeek(weekStart.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchData(selectedWeek);
    }
  }, [selectedWeek]);

  const handleWeekChange = (week: string) => {
    setSelectedWeek(week);
  };

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
      <WeekFilter selectedWeek={selectedWeek} onWeekChange={handleWeekChange} />
      <HeatmapGrid 
        data={data} 
        title="Gym Utilization by Day and Time"
        colorScale={{ min: 0, max: 100, color: '#d8ff3e' }}
      />
    </div>
  );
}