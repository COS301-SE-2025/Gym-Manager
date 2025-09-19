'use client';

import './TimePeriodToggle.css';

type CohortPeriod = 'lastMonth' | 'lastYear' | 'all';
interface CohortTimePeriodToggleProps {
  selected: CohortPeriod;
  onSelect: (period: CohortPeriod) => void;
}

const cohortPeriods: { key: CohortPeriod; label: string }[] = [
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

export default function CohortTimePeriodToggle({ selected, onSelect }: CohortTimePeriodToggleProps) {
  return (
    <div className="toggle-container">
      {cohortPeriods.map(({ key, label }) => (
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
