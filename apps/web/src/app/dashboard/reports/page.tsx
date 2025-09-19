'use client';

import { useEffect, useState } from 'react';
import ConversionFunnelReport from '@/components/reports/Charts/ConversionFunnelReport';
import CohortRetentionReport from '@/components/reports/CohortRetentionReport';
import LogsTab from '@/components/reports/LogsTab';
import HeatMapReport from '@/components/reports/Charts/HeatMapReport';
import GymUtilizationReport from '@/components/reports/GymUtilizationReport';
import ReportStatCard from '@/components/reports/ReportStatCard';
import OperationsChart from '@/components/reports/Charts/OperationsChart';
import AcquisitionChart from '@/components/reports/Charts/AcquisitionChart';
import TimePeriodToggle from '@/components/reports/TogglesAndFilters/TimePeriodToggle';
import FinanceTab from '@/components/reports/Tabs/FinanceTab';
import BookingTimesChart from '@/components/reports/BookingTimesChart';
import { reportsService } from '../../services/reports';
import './reports.css';

const TABS = [
  { key: 'operations', label: 'Operations' },
  {key: 'finance', label: 'Finance' },
  { key: 'retention', label: 'Retention & Acquisition' },
  { key: 'logs', label: 'Logs' },
];

type Period = 'today' | 'lastWeek' | 'lastMonth' | 'lastYear' | 'all';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string>('operations');
  const [stats, setStats] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);

  const fetchStats = async (period: Period) => {
    setLoading(true);
    try {
      const statsData = await reportsService.getSummaryStats(period);
      console.log(statsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedPeriod);
  }, [selectedPeriod]);

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
            <div style={{ marginBottom: '1.5rem' }}>
              <TimePeriodToggle selected={selectedPeriod} onSelect={setSelectedPeriod} />
            </div>
            <div className="cards-row">
              <ReportStatCard 
                title="Total Bookings" 
                value={loading ? '...' : (stats?.bookings ?? '...')} 
              />
              <ReportStatCard 
                title="Fill Rate" 
                value={
                  loading || !stats || stats.fillRate === undefined
                    ? '...'
                    : `${(stats.fillRate * 100).toFixed(1)}%`
                } 
              />
              <ReportStatCard 
                title="Cancellation Rate" 
                value={
                  loading || !stats || stats.cancellationRate === undefined
                    ? '...'
                    : `${(stats.cancellationRate * 100).toFixed(1)}%`
                } 
              />
              <ReportStatCard 
                title="No-Show Rate" 
                value={
                  loading || !stats || stats.noShowRate === undefined
                    ? '...'
                    : `${(stats.noShowRate * 100).toFixed(1)}%`
                } 
              />
            </div>
            <div className="management-card full-width-card">
              <div className="card-title">
                <h2>Operational Metrics</h2>
              </div>
              <div className="card-content">
                <OperationsChart period={selectedPeriod} />
              </div>
            </div>
            <div className="management-card full-width-card">
              <div className="card-title">
                <h2>Popular Booking Times</h2>
                <p className="card-subtitle">Most popular class booking times based on all-time data</p>
              </div>
              <div className="card-content">
                <BookingTimesChart />
              </div>
            </div>
        <div className="management-card full-width-card">
          <div className="card-title">
            <h2>Gym Utilization Analytics</h2>
          </div>
              <div className="card-content">
                <GymUtilizationReport />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <FinanceTab />
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
