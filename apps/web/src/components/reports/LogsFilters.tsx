'use client';

import { useState, useEffect } from 'react';

interface LogsFiltersProps {
  availableEventTypes: string[];
  eventTypeFilter: string;
  onEventTypeChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onReset: () => void;
}

export default function LogsFilters({
  availableEventTypes,
  eventTypeFilter,
  onEventTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset,
}: LogsFiltersProps) {
  const [maxDate, setMaxDate] = useState<string>('');

  useEffect(() => {
    // Set max date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setMaxDate(`${year}-${month}-${day}`);
  }, []);

  const handleStartDateChange = (value: string) => {
    onStartDateChange(value);
    //if end date is before new start date then clear
    if (endDate && value && new Date(value) > new Date(endDate)) {
      onEndDateChange('');
    }
  };

  const handleEndDateChange = (value: string) => {
    onEndDateChange(value);
    if (startDate && value && new Date(startDate) > new Date(value)) {
      onStartDateChange('');
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      alignItems: 'flex-end',
      background: '#1e1e1e',
      padding: 16,
      borderRadius: 8,
      border: '1px solid #434343',
      margin: '12px 0',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
        <label style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>Event Type</label>
        <select
          value={eventTypeFilter}
          onChange={(e) => onEventTypeChange(e.target.value)}
          style={{
            background: '#2e2e2e',
            color: '#fff',
            border: '1px solid #434343',
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#d8ff3e'}
          onBlur={(e) => e.target.style.borderColor = '#434343'}
        >
          <option value="all">All events</option>
          {availableEventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
        <label style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>From Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          max={maxDate}
          style={{
            background: '#2e2e2e',
            color: '#fff',
            border: '1px solid #434343',
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#d8ff3e'}
          onBlur={(e) => e.target.style.borderColor = '#434343'}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
        <label style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>To Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          max={maxDate}
          min={startDate || undefined}
          style={{
            background: '#2e2e2e',
            color: '#fff',
            border: '1px solid #434343',
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#d8ff3e'}
          onBlur={(e) => e.target.style.borderColor = '#434343'}
        />
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={onReset}
        style={{
          backgroundColor: '#d8ff3e',
          color: '#0b0b0b',
          border: 'none',
          padding: '10px 16px',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 14,
          transition: 'background-color 0.2s',
          height: 'fit-content',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#748c24'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d8ff3e'}
      >
        Reset filters
      </button>
    </div>
  );
}
