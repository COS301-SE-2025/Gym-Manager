'use client';
import { useState, useEffect } from 'react';
import { TrendingUpIcon, TrendingDownIcon, DollarSignIcon, UsersIcon, CreditCardIcon } from 'lucide-react';
import './analytics.css';

interface FinancialAnalytics {
  monthlyRecurringRevenue: {
    current: number;
    previous: number;
    growth: number;
  };
  averageRevenuePerUser: {
    current: number;
    previous: number;
    growth: number;
  };
  lifetimeValue: {
    average: number;
    median: number;
  };
  revenueTrends: Array<{
    year: number;
    month: number;
    revenue: number;
    growth: number;
  }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/payments/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        setError('Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getMonthName = (month: number) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchAnalytics} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-container">
        <div className="no-data">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Financial Analytics Dashboard</h1>
        <button onClick={fetchAnalytics} className="refresh-btn">
          Refresh Data
        </button>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <DollarSignIcon size={24} className="metric-icon" />
            <span className="metric-title">Monthly Recurring Revenue</span>
          </div>
          <div className="metric-value">
            {formatCurrency(analytics.monthlyRecurringRevenue.current)}
          </div>
          <div className={`metric-change ${analytics.monthlyRecurringRevenue.growth >= 0 ? 'positive' : 'negative'}`}>
            {analytics.monthlyRecurringRevenue.growth >= 0 ? (
              <TrendingUpIcon size={16} />
            ) : (
              <TrendingDownIcon size={16} />
            )}
            <span>{formatPercentage(analytics.monthlyRecurringRevenue.growth)}</span>
          </div>
          <div className="metric-subtitle">
            vs {formatCurrency(analytics.monthlyRecurringRevenue.previous)} last month
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <UsersIcon size={24} className="metric-icon" />
            <span className="metric-title">Average Revenue Per User</span>
          </div>
          <div className="metric-value">
            {formatCurrency(analytics.averageRevenuePerUser.current)}
          </div>
          <div className={`metric-change ${analytics.averageRevenuePerUser.growth >= 0 ? 'positive' : 'negative'}`}>
            {analytics.averageRevenuePerUser.growth >= 0 ? (
              <TrendingUpIcon size={16} />
            ) : (
              <TrendingDownIcon size={16} />
            )}
            <span>{formatPercentage(analytics.averageRevenuePerUser.growth)}</span>
          </div>
          <div className="metric-subtitle">
            vs {formatCurrency(analytics.averageRevenuePerUser.previous)} last month
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <CreditCardIcon size={24} className="metric-icon" />
            <span className="metric-title">Average Lifetime Value</span>
          </div>
          <div className="metric-value">
            {formatCurrency(analytics.lifetimeValue.average)}
          </div>
          <div className="metric-subtitle">
            Median: {formatCurrency(analytics.lifetimeValue.median)}
          </div>
        </div>
      </div>

      {/* Revenue Trends Chart */}
      <div className="chart-section">
        <h2>Revenue Trends (Last 12 Months)</h2>
        <div className="chart-container">
          {analytics.revenueTrends.length > 0 ? (
            <div className="revenue-chart">
              <div className="chart-bars">
                {analytics.revenueTrends.map((trend, index) => {
                  const maxRevenue = Math.max(...analytics.revenueTrends.map(t => t.revenue));
                  const height = (trend.revenue / maxRevenue) * 100;
                  
                  return (
                    <div key={`${trend.year}-${trend.month}`} className="chart-bar-container">
                      <div className="chart-bar" style={{ height: `${height}%` }}>
                        <div className="bar-tooltip">
                          <div className="tooltip-month">{getMonthName(trend.month)} {trend.year}</div>
                          <div className="tooltip-revenue">{formatCurrency(trend.revenue)}</div>
                          <div className={`tooltip-growth ${trend.growth >= 0 ? 'positive' : 'negative'}`}>
                            {formatPercentage(trend.growth)}
                          </div>
                        </div>
                      </div>
                      <div className="bar-label">{getMonthName(trend.month)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="no-chart-data">No revenue data available</div>
          )}
        </div>
      </div>

      {/* Revenue Trends Table */}
      <div className="table-section">
        <h2>Monthly Revenue Breakdown</h2>
        <div className="table-container">
          <table className="revenue-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue</th>
                <th>Growth</th>
              </tr>
            </thead>
            <tbody>
              {analytics.revenueTrends.map((trend, index) => (
                <tr key={`${trend.year}-${trend.month}`}>
                  <td>{getMonthName(trend.month)} {trend.year}</td>
                  <td className="revenue-cell">{formatCurrency(trend.revenue)}</td>
                  <td className={`growth-cell ${trend.growth >= 0 ? 'positive' : 'negative'}`}>
                    {trend.growth >= 0 ? (
                      <TrendingUpIcon size={14} />
                    ) : (
                      <TrendingDownIcon size={14} />
                    )}
                    <span>{formatPercentage(trend.growth)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
