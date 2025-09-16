'use client';

import { useEffect, useState } from 'react';
import ConversionFunnelReport from '@/components/reports/ConversionFunnelReport';
import CohortRetentionReport from '@/components/reports/CohortRetentionReport';
import LogsTab from '@/components/reports/LogsTab';
import HeatMapReport from '@/components/reports/HeatMapReport';
import ReportStatCard from '@/components/reports/ReportStatCard';
import OperationsChart from '@/components/reports/OperationsChart';
import AcquisitionChart from '@/components/reports/AcquisitionChart';
import { reportsService } from '../../services/reports';
import './reports.css';

const TABS = [
  { key: 'operations', label: 'Operations' },
  { key: 'retention', label: 'Retention & Acquisition' },
  { key: 'logs', label: 'Logs' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string>('operations');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Mock fetching summary stats
    reportsService.getSummaryStats().then(setStats);
  }, []);

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Reports</h1>
          <p className="sub-header">Analyze key metrics and trends</p>
        </div>
      </header>

      <div className="tabs-container">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'operations' && (
          <div className="operations-tab">
            <div className="cards-row">
              <ReportStatCard title="Total Bookings" value={stats?.bookings ?? '...'} />
              <ReportStatCard title="Fill Rate" value={stats?.fillRate ? `${(stats.fillRate * 100).toFixed(1)}%` : '...'} />
              <ReportStatCard title="Cancellation Rate" value={stats?.cancellationRate ? `${(stats.cancellationRate * 100).toFixed(1)}%` : '...'} />
              <ReportStatCard title="No-Show Rate" value={stats?.noShowRate ? `${(stats.noShowRate * 100).toFixed(1)}%` : '...'} />
            </div>
            <div className="management-card full-width-card">
              <div className="card-title">
                <h2>Operational Metrics</h2>
              </div>
              <div className="card-content">
                <OperationsChart />
              </div>
            </div>
            {/* <div className="management-card full-width-card">
              <div className="card-title">
                <h2>Utilization by Hour</h2>
              </div>
              <HeatMapReport />
            </div> */}
          </div>
        )}

        {activeTab === 'retention' && (
          <div className="retention-tab">
             <div className="management-card full-width-card">
              <div className="card-title">
                <h2>User Acquisition</h2>
              </div>
              <div className="card-content">
                <AcquisitionChart />
              </div>
            </div>
             <div className="management-card full-width-card">
                <div className="card-title">
                  <h2>Conversion Funnel</h2>
                </div>
                <div className="card-content">
                  <ConversionFunnelReport />
                </div>
              </div>
            <div className="management-card full-width-card">
              <div className="card-title">
                <h2>Weekly Cohort Retention</h2>
                <p className="card-subtitle">Percentage of members who remain active after signing up.</p>
              </div>
              <div className="card-content">
                <CohortRetentionReport />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && <LogsTab />}
      </div>
    </div>
  );
}
