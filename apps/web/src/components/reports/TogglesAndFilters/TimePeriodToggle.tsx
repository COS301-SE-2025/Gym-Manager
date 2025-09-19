'use client';

import './TimePeriodToggle.css';

type Period = 'today' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'all';
interface TimePeriodToggleProps {
  selected: Period;
  onSelect: (period: Period) => void;
}

const periods: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'lastWeek', label: 'Last Week' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

export default function TimePeriodToggle({ selected, onSelect }: TimePeriodToggleProps) {
  return (
    <div className="toggle-container">
      {periods.map(({ key, label }) => (
        <button
          key={key}
          className={`toggle-button ${selected === key ? 'active' : ''}`}
          onClick={() => onSelect(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}