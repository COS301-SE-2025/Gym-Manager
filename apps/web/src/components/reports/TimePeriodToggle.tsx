'use client';

import './TimePeriodToggle.css';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
interface TimePeriodToggleProps {
  selected: Period;
  onSelect: (period: Period) => void;
}

const periods: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
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