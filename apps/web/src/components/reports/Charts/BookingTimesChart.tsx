'use client';

import { useEffect, useState } from 'react';
import { reportsService } from '@/app/services/reports';
import './BookingTimesChart.css';

interface BookingTimesData {
  hour: string;
  averageBookings: number;
  totalBookings: number;
  popularityRank: number;
}

export default function BookingTimesChart() {
  const [data, setData] = useState<BookingTimesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookingTimes = await reportsService.getBookingTimesAnalytics();
        setData(bookingTimes);
      } catch (error) {
        console.error('Failed to fetch booking times data:', error);
        // Fallback to mock data if API fails
        setData(getMockBookingTimesData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 400,
        color: 'whitesmoke',
        fontSize: '1.1rem'
      }}>
        Loading booking times data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 400,
        color: '#ef4444',
        fontSize: '1.1rem'
      }}>
        No booking times data available
      </div>
    );
  }

  // Get top 10 most popular booking times
  const topBookingTimes = data.slice(0, 10);
  const maxBookings = Math.max(...topBookingTimes.map(item => item.totalBookings));

  return (
    <div className="booking-times-chart">
      <div className="chart-title">Most Popular Booking Times (All Time)</div>
      
      <div className="chart-container">
        <div className="y-axis">
          <div className="y-axis-label">Bookings</div>
        </div>
        
        <div className="chart-content">
          <div className="bars-container">
            {topBookingTimes.map((item, index) => {
              const height = (item.totalBookings / maxBookings) * 100;
              const isTop3 = index < 3;
              
              return (
                <div key={item.hour} className="bar-group">
                  <div className="bar-container">
                    <div 
                      className={`bar ${isTop3 ? 'top-bar' : ''}`}
                      style={{ 
                        height: `${height}%`,
                        backgroundColor: isTop3 ? 'rgba(216, 255, 62, 0.8)' : 'rgba(255, 255, 255, 0.2)'
                      }}
                      title={`${item.hour}: ${item.totalBookings} total bookings`}
                    >
                      <span className="bar-value">{item.totalBookings}</span>
                    </div>
                  </div>
                  <div className="bar-label">{item.hour}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color top-color"></div>
          <span>Top 3 Most Popular</span>
        </div>
        <div className="legend-item">
          <div className="legend-color regular-color"></div>
          <span>Other Times</span>
        </div>
      </div>
    </div>
  );
}

// Mock data fallback
function getMockBookingTimesData(): BookingTimesData[] {
  return [
    { hour: '6pm', averageBookings: 0.15, totalBookings: 45, popularityRank: 1 },
    { hour: '7pm', averageBookings: 0.12, totalBookings: 38, popularityRank: 2 },
    { hour: '5pm', averageBookings: 0.10, totalBookings: 32, popularityRank: 3 },
    { hour: '8am', averageBookings: 0.08, totalBookings: 28, popularityRank: 4 },
    { hour: '7am', averageBookings: 0.07, totalBookings: 25, popularityRank: 5 },
    { hour: '9am', averageBookings: 0.06, totalBookings: 22, popularityRank: 6 },
    { hour: '8pm', averageBookings: 0.05, totalBookings: 18, popularityRank: 7 },
    { hour: '6am', averageBookings: 0.04, totalBookings: 15, popularityRank: 8 },
    { hour: '9pm', averageBookings: 0.03, totalBookings: 12, popularityRank: 9 },
    { hour: '10am', averageBookings: 0.02, totalBookings: 8, popularityRank: 10 },
    { hour: '11am', averageBookings: 0.01, totalBookings: 5, popularityRank: 11 },
    { hour: '12pm', averageBookings: 0.01, totalBookings: 4, popularityRank: 12 },
    { hour: '1pm', averageBookings: 0.01, totalBookings: 3, popularityRank: 13 },
    { hour: '2pm', averageBookings: 0.01, totalBookings: 2, popularityRank: 14 },
    { hour: '3pm', averageBookings: 0.01, totalBookings: 2, popularityRank: 15 },
    { hour: '4pm', averageBookings: 0.01, totalBookings: 1, popularityRank: 16 },
    { hour: '10pm', averageBookings: 0.00, totalBookings: 0, popularityRank: 17 },
  ];
}
