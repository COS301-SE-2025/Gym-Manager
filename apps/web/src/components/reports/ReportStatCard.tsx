'use client';

import './ReportStatCard.css';

interface ReportStatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

export default function ReportStatCard({ title, value, change, changeType }: ReportStatCardProps) {
  return (
    <div className="report-stat-card">
      <h3 className="stat-title">{title}</h3>
      <p className="stat-value">{value}</p>
      {change && (
        <p className={`stat-change ${changeType === 'increase' ? 'increase' : 'decrease'}`}>
          {change}
        </p>
      )}
    </div>
  );
}