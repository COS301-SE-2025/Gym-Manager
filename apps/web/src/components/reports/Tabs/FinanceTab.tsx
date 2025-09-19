'use client';

import { useEffect, useState } from 'react';
import ReportStatCard from '@/components/reports/ReportStatCard';
import { CustomChart } from '@/components/reports/Charts/CustomChartHolder/CustomChart';
import { reportsService } from '@/app/services/reports';
import '../TogglesAndFilters/TimePeriodToggle.css';

type Granularity = 'monthly' | 'yearly' | 'all';

interface FinancialAnalytics {
  monthlyRecurringRevenue: { current: number; previous: number; growth: number };
  averageRevenuePerUser: { current: number; previous: number; growth: number };
  lifetimeValue: { average: number; median: number };
  revenueTrends: Array<{ year: number; month: number; revenue: number; growth: number }>;
}

export default function FinanceTab() {
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [raw, setRaw] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const a = await reportsService.getFinancialAnalytics();
      setAnalytics(a);
      setRaw(a);
    } catch (e) {
      console.error('Failed to load finance data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const buildTrendForGranularity = () => {
    if (!analytics) return { labels: [], values: [], growth: [] };
    if (granularity === 'monthly' || granularity === 'all') {
      return {
        labels: analytics.revenueTrends.map(t => `${t.year}-${String(t.month).padStart(2,'0')}`),
        values: analytics.revenueTrends.map(t => t.revenue / 100),
        growth: analytics.revenueTrends.map(t => t.growth),
      };
    }
    if (granularity === 'yearly') {
      const byYear: Record<string, number> = {};
      analytics.revenueTrends.forEach(t => {
        byYear[t.year] = (byYear[t.year] || 0) + t.revenue;
      });
      const sortedYears = Object.keys(byYear).sort();
      const values = sortedYears.map(y => byYear[y] / 100);
      const growth = values.map((v, i) => i === 0 ? 0 : ((v - values[i-1]) / (values[i-1] || 1)) * 100);
      return { labels: sortedYears, values, growth };
    }
    return { labels: [], values: [], growth: [] };
  };

  return (
    <div className="finance-tab">
      <div className="toggle-container" style={{ marginBottom: '1rem' }}>
        {(['monthly','yearly','all'] as Granularity[]).map(g => (
          <button
            key={g}
            onClick={() => setGranularity(g)}
            className={`toggle-button ${granularity === g ? 'active' : ''}`}
          >
            {g[0].toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      <div className="cards-row">
        <ReportStatCard 
          title="Monthly Recurring Revenue" 
          value={loading || !analytics ? '...' : `R ${(analytics.monthlyRecurringRevenue.current / 100).toLocaleString()}`}
          change={loading || !analytics ? undefined : `${analytics.monthlyRecurringRevenue.growth.toFixed(2)}% vs prev`}
          changeType={!analytics ? undefined : analytics.monthlyRecurringRevenue.growth >= 0 ? 'increase' : 'decrease'}
        />
        <ReportStatCard 
          title="Average Revenue Per User" 
          value={loading || !analytics ? '...' : `R ${(analytics.averageRevenuePerUser.current / 100).toLocaleString()}`}
          change={loading || !analytics ? undefined : `${analytics.averageRevenuePerUser.growth.toFixed(2)}% vs prev`}
          changeType={!analytics ? undefined : analytics.averageRevenuePerUser.growth >= 0 ? 'increase' : 'decrease'}
        />
        <ReportStatCard 
          title="Lifetime Value (Avg)" 
          value={loading || !analytics ? '...' : `R ${(analytics.lifetimeValue.average / 100).toLocaleString()}`}
        />
        <ReportStatCard 
          title="Lifetime Value (Median)" 
          value={loading || !analytics ? '...' : `R ${(analytics.lifetimeValue.median / 100).toLocaleString()}`}
        />
      </div>

      <div className="management-card full-width-card">
        <div className="card-title">
          <h2>Revenue Trend</h2>
        </div>
        <div className="card-content" style={{ height: 340 }}>
          {analytics ? (
            buildTrendForGranularity().labels.length > 0 ? (
              <CustomChart 
                type="line" 
                labels={buildTrendForGranularity().labels} 
                datasets={[
                  { 
                    label: 'Revenue', 
                    data: buildTrendForGranularity().values, 
                    borderColor: '#d8ff3e',
                  },
                ]} 
                options={{ 
                  responsive: true,
                  scales: { y: { beginAtZero: true } },
                  elements: { point: { radius: 4 } },
                  plugins: { legend: { display: true } },
                }} 
              />
            ) : (
              <div>No revenue data available yet.</div>
            )
          ) : (
            <div>Loading chart…</div>
          )}
          {analytics && buildTrendForGranularity().labels.length > 0 && buildTrendForGranularity().labels.length < 2 && (
            <div style={{ marginTop: 12, color: '#aaa', fontSize: 14 }}>
              Not enough historical data to show a trend. Trends will appear as more months accrue.
            </div>
          )}
        </div>
      </div>

      {analytics && buildTrendForGranularity().labels.length > 0 && (
        <div className="management-card full-width-card" style={{ marginTop: '1rem' }}>
          <div className="card-title">
            <h2>Revenue Growth Trend</h2>
            <p className="card-subtitle">Month-over-month growth percentage</p>
          </div>
          <div className="card-content" style={{ height: 320 }}>
            <CustomChart 
              type="line" 
              labels={buildTrendForGranularity().labels} 
              datasets={[{
                label: 'Growth %',
                data: buildTrendForGranularity().growth,
                borderColor: '#d8ff3e',
                backgroundColor: 'rgba(216, 255, 62, 0.1)',
              }]} 
              options={{ 
                responsive: true,
                scales: { 
                  y: { 
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { 
                      color: '#aaa',
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  },
                  x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#aaa' }
                  }
                },
                plugins: {
                  legend: { 
                    display: true,
                    labels: { color: '#fff' }
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const value = context.parsed.y;
                        const sign = value >= 0 ? '+' : '';
                        return `Growth: ${sign}${value.toFixed(2)}%`;
                      }
                    }
                  }
                },
                elements: {
                  point: {
                    radius: 6,
                    hoverRadius: 8,
                    backgroundColor: buildTrendForGranularity().growth.map(g => g >= 0 ? '#4caf50' : '#f44336'),
                    borderColor: buildTrendForGranularity().growth.map(g => g >= 0 ? '#4caf50' : '#f44336'),
                    hoverBackgroundColor: '#d8ff3e'
                  }
                }
              }} 
            />
          </div>
          {buildTrendForGranularity().labels.length < 2 && (
            <div style={{ marginTop: 12, color: '#aaa', fontSize: 14 }}>
              Need at least two months of data to compute month-over-month growth.
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: '#aaa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4caf50' }}></div>
              <span>Positive Growth</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f44336' }}></div>
              <span>Negative Growth</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


