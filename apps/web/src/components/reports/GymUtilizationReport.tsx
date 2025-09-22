'use client';

import { useEffect, useState } from 'react';
import HeatmapGrid from './HeatmapGrid';
import { reportsService } from '../../app/services/reports';

interface UtilizationData {
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
        label: weekLabel,
        dateRange: dateRange,
      });
    }
    
    return options;
  };

  const weekOptions = getWeekOptions();

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: '1rem', 
      marginBottom: '1.5rem'
    }}>
      <div style={{ 
        color: '#fff', 
        fontSize: '0.9rem',
        fontWeight: '500'
      }}>
        Select Week:
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        flexWrap: 'wrap'
      }}>
        {weekOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onWeekChange(option.value)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: selectedWeek === option.value ? '2px solid #d8ff3e' : '1px solid #434343',
              backgroundColor: selectedWeek === option.value ? '#d8ff3e20' : '#2a2a2a',
              color: selectedWeek === option.value ? '#d8ff3e' : '#fff',
              fontSize: '0.9rem',
              fontWeight: selectedWeek === option.value ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              if (selectedWeek !== option.value) {
                e.currentTarget.style.backgroundColor = '#3a3a3a';
                e.currentTarget.style.borderColor = '#666';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedWeek !== option.value) {
                e.currentTarget.style.backgroundColor = '#2a2a2a';
                e.currentTarget.style.borderColor = '#434343';
              }
            }}
          >
            <div style={{ fontWeight: '500' }}>{option.label}</div>
            <div style={{ 
              fontSize: '0.75rem', 
              opacity: 0.8,
              marginTop: '0.25rem'
            }}>
              {option.dateRange}
            </div>
          </button>
        ))}
      </div>
      
    </div>
  );
}

export default function GymUtilizationReport() {
  const [data, setData] = useState<UtilizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  const fetchData = async (weekStartDate?: string) => {
    setLoading(true);
    try {
      const utilizationData = await reportsService.getGymUtilization(weekStartDate);
      // Extract only the heat map data, not the business hours data
      setData({
        x_labels: utilizationData.x_labels,
        y_labels: utilizationData.y_labels,
        values: utilizationData.values
      });
    } catch (error) {
      console.error('Failed to fetch gym utilization data:', error);
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
        Loading gym utilization data...
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
        Failed to load gym utilization data
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <WeekFilter selectedWeek={selectedWeek} onWeekChange={handleWeekChange} />
      
      {/* Heat Map Section */}
      <div style={{ marginBottom: '2rem' }}>
        <HeatmapGrid 
          data={data} 
          title="Class Booking Utilization Heatmap - Percentage of Capacity Booked"
          colorScale={{ min: 0, max: 100, color: '#d8ff3e' }}
        />
      </div>
    </div>
  );
}
