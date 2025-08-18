'use client';

import { useEffect, useState } from 'react';
import { CustomChart } from '@/components/Chart/CustomChart';
import { userRoleService } from '@/app/services/roles';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [userRoleData, setUserRoleData] = useState<{ labels: string[]; datasets: any[] } | null>(
    null,
  );
  const [scheduleData, setScheduleData] = useState<{ labels: string[]; datasets: any[] } | null>(
    null,
  );

  const chartColors = [
    '#d8ff3e', // Primary accent
    '#4bc0c0', // Teal
    '#9966ff', // Purple
    '#ff9f40', // Orange
    '#ff6384', // Pink
    '#36a2eb', // Blue
    '#ffcd56', // Yellow
  ];

  // Chart dimensions
  const chartDimensions = {
    bar: { height: 350, width: '100%' },
    line: { height: 350, width: '100%' },
    pie: { height: 450, width: '100%' },
    doughnut: { height: 450, width: '100%' },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch user role distribution
        const [admins, coaches, members] = await Promise.all([
          userRoleService.getUsersByRole('admin'),
          userRoleService.getUsersByRole('coach'),
          userRoleService.getUsersByRole('member'),
        ]);

        setUserRoleData({
          labels: ['Admins', 'Coaches', 'Members'],
          datasets: [
            {
              label: 'User Distribution',
              data: [admins.length, coaches.length, members.length],
              backgroundColor: [chartColors[0], chartColors[1], chartColors[2]],
              borderColor: '#2e2e2e',
              borderWidth: 1,
            },
          ],
        });

        // Fetch and format weekly schedule data
        const weeklySchedule = await userRoleService.getWeeklySchedule();

        if (
          weeklySchedule &&
          typeof weeklySchedule === 'object' &&
          !Array.isArray(weeklySchedule)
        ) {
          const daysOfWeek = [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ];

          const sessionsPerDay = daysOfWeek.map((day) => {
            const dateKeys = Object.keys(weeklySchedule);
            let count = 0;

            dateKeys.forEach((dateStr) => {
              const date = new Date(dateStr);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

              if (dayName === day) {
                count += weeklySchedule[dateStr].length;
              }
            });

            return count;
          });

          setScheduleData({
            labels: daysOfWeek,
            datasets: [
              {
                label: 'Weekly Sessions',
                data: sessionsPerDay,
                backgroundColor: chartColors[3],
                borderColor: '#ffffff',
                borderWidth: 1,
              },
            ],
          });
        } else {
          console.warn('Unexpected schedule data format:', weeklySchedule);
          setScheduleData({
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
              {
                label: 'Weekly Sessions',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: chartColors[3],
                borderColor: '#ffffff',
                borderWidth: 1,
              },
            ],
          });
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getChartOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ffffff',
          font: {
            size: 12,
          },
          padding: 20,
        },
      },
      title: {
        display: true,
        text: title,
        color: '#ffffff',
        font: {
          size: 16,
          weight: 500,
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: '#2e2e2e',
        titleColor: '#d8ff3e',
        bodyColor: '#ffffff',
        borderColor: '#434343',
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
      },
    },
    scales: title.includes('Weekly')
      ? {
          x: {
            ticks: { color: '#aaaaaa', font: { size: 12 } },
            grid: { color: '#434343', drawBorder: false },
          },
          y: {
            ticks: { color: '#aaaaaa', font: { size: 12 }, precision: 0 },
            grid: { color: '#434343', drawBorder: false },
            beginAtZero: true,
          },
        }
      : undefined,
  });

  if (loading) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div className="header-content">
            <h1>Reports</h1>
            <div className="user-id-display">Loading data...</div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <h1>Reports</h1>
          <div className="user-id-display">Last updated: {new Date().toLocaleString()}</div>
        </div>
      </header>

      <div className="content-wrapper">
        {userRoleData && (
          <div className="management-card">
            <div className="card-title">
              <h2>User Role Distribution</h2>
            </div>
            <div className="card-content">
              <div
                className="relative"
                style={{
                  height: `${chartDimensions.pie.height}px`,
                  width: chartDimensions.pie.width,
                }}
              >
                <CustomChart
                  type="pie"
                  labels={userRoleData.labels}
                  datasets={userRoleData.datasets}
                  options={getChartOptions('User Role Distribution')}
                />
              </div>
            </div>
          </div>
        )}

        {scheduleData && (
          <div className="management-card">
            <div className="card-title">
              <h2>Weekly Session Schedule</h2>
            </div>
            <div className="card-content">
              <div
                className="relative"
                style={{
                  height: `${chartDimensions.line.height}px`,
                  width: chartDimensions.line.width,
                }}
              >
                <CustomChart
                  type="line"
                  labels={scheduleData.labels}
                  datasets={scheduleData.datasets}
                  options={getChartOptions('Weekly Session Schedule')}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
