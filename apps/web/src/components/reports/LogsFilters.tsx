'use client';

import { useState, useEffect } from 'react';
import './LogsFilters.css';

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
    <div className="filters-container">
      <div className="filter-group">
        <label className="filter-label">Event Type</label>
        <select
          value={eventTypeFilter}
          onChange={(e) => onEventTypeChange(e.target.value)}
          className="filter-select"
        >
          <option value="all">All events</option>
          {availableEventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="filter-group date-group">
        <label className="filter-label">From Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          max={maxDate}
          className="filter-input"
        />
      </div>

      <div className="filter-group date-group">
        <label className="filter-label">To Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          max={maxDate}
          min={startDate || undefined}
          className="filter-input"
        />
      </div>

      <div className="filters-spacer" />

      <button
        onClick={onReset}
        className="reset-button"
      >
        Reset filters
      </button>
    </div>
  );
}
