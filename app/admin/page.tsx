'use client';

import { useEffect, useState } from 'react';
import { MilkEntry, Payment, User } from '@/lib/utils';

export default function DashboardPage() {
  const [entries, setEntries] = useState<MilkEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesRes, paymentsRes, usersRes] = await Promise.all([
        fetch('/api/milk'),
        fetch('/api/payments'),
        fetch('/api/users'),
      ]);

      const entriesData = await entriesRes.json();
      const paymentsData = await paymentsRes.json();
      const usersData = await usersRes.json();

      setEntries(entriesData.entries || []);
      setPayments(paymentsData.payments || []);
      setUsers(usersData.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const totalMilkLiters = entries.reduce((sum, entry) => sum + entry.liters, 0);
  const totalPayment = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalBill = entries.reduce((sum, entry) => sum + entry.total, 0);
  const totalDues = totalBill - totalPayment;

  // Prepare data for graph (last 7 days) - Morning and Evening
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyData = last7Days.map(date => {
    const dayEntries = entries.filter(e => e.date === date);
    const morningEntries = dayEntries.filter(e => e.time === 'morning');
    const eveningEntries = dayEntries.filter(e => e.time === 'evening');
    
    return {
      date,
      morning: {
        liters: morningEntries.reduce((sum, e) => sum + e.liters, 0),
        amount: morningEntries.reduce((sum, e) => sum + e.total, 0),
      },
      evening: {
        liters: eveningEntries.reduce((sum, e) => sum + e.liters, 0),
        amount: eveningEntries.reduce((sum, e) => sum + e.total, 0),
      },
      total: {
        liters: dayEntries.reduce((sum, e) => sum + e.liters, 0),
        amount: dayEntries.reduce((sum, e) => sum + e.total, 0),
      },
    };
  });

  const maxLiters = Math.max(...dailyData.map(d => Math.max(d.morning.liters, d.evening.liters, d.total.liters)), 1);

  // Calculate growth rate for each day
  const dailyDataWithGrowth = dailyData.map((day, index) => {
    let growthRate = 0;
    let growthDirection: 'up' | 'down' | 'neutral' = 'neutral';
    
    if (index > 0) {
      const prevDay = dailyData[index - 1];
      const prevTotal = prevDay.total.liters;
      const currentTotal = day.total.liters;
      
      if (prevTotal > 0) {
        growthRate = ((currentTotal - prevTotal) / prevTotal) * 100;
      } else if (currentTotal > 0) {
        growthRate = 100; // 100% growth from 0
      }
      
      if (growthRate > 0) growthDirection = 'up';
      else if (growthRate < 0) growthDirection = 'down';
    }

    return {
      ...day,
      growthRate,
      growthDirection,
    };
  });

  // Chart dimensions
  const chartHeight = 300;
  const chartWidth = '100%';
  const maxChartValue = Math.max(maxLiters, 10); // Minimum scale of 10L for better visibility

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">Overview of your dairy operations</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-all duration-200">
          <div className="p-6">
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-white">{totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-all duration-200">
          <div className="p-6">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Milk (Liters)</p>
              <p className="text-3xl font-bold text-white">{totalMilkLiters.toFixed(2)} L</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-all duration-200">
          <div className="p-6">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Total Payment</p>
              <p className="text-3xl font-bold text-white">RS {totalPayment.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-all duration-200">
          <div className="p-6">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">Total Bill</p>
              <p className="text-3xl font-bold text-white">RS {totalBill.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 overflow-hidden shadow-lg rounded-xl transform hover:scale-105 transition-all duration-200">
          <div className="p-6">
            <div>
              <p className="text-red-100 text-sm font-medium mb-1">Total Dues</p>
              <p className="text-3xl font-bold text-white">RS {totalDues.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Graph - Daily Milk Collection with Growth Rate */}
      <div className="bg-white shadow-xl rounded-xl p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Last 7 Days Milk Collection</h3>
            <p className="text-sm text-gray-600 mt-1">Daily reports with growth rate</p>
          </div>
        </div>

        {/* Chart Container */}
        <div className="relative w-full overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Chart Area */}
            <div className="relative" style={{ height: `${chartHeight}px`, width: chartWidth }}>
              {/* Y-Axis Labels */}
              <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500 pr-2">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <span key={ratio}>{Math.round(maxChartValue * ratio)}L</span>
                ))}
              </div>

              {/* Chart Bars and Lines */}
              <div className="ml-12 h-full relative">
                <svg width="100%" height={chartHeight - 32} className="absolute top-0 left-0">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                    <line
                      key={idx}
                      x1="0"
                      y1={chartHeight - 32 - (ratio * (chartHeight - 32))}
                      x2="100%"
                      y2={chartHeight - 32 - (ratio * (chartHeight - 32))}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                    />
                  ))}

                  {/* Morning Bars */}
                  {dailyDataWithGrowth.map((day, index) => {
                    const barWidth = 100 / (dailyDataWithGrowth.length * 3);
                    const xPosition = (index * 100 / dailyDataWithGrowth.length) + (barWidth * 1.5);
                    const morningHeight = (day.morning.liters / maxChartValue) * (chartHeight - 32);
                    const yPosition = chartHeight - 32 - morningHeight;
                    
                    return (
                      <rect
                        key={`morning-${index}`}
                        x={`${xPosition - barWidth}%`}
                        y={yPosition}
                        width={`${barWidth}%`}
                        height={morningHeight}
                        fill="#facc15"
                        rx="4"
                        className="hover:opacity-80 transition-opacity"
                      />
                    );
                  })}

                  {/* Evening Bars */}
                  {dailyDataWithGrowth.map((day, index) => {
                    const barWidth = 100 / (dailyDataWithGrowth.length * 3);
                    const xPosition = (index * 100 / dailyDataWithGrowth.length) + (barWidth * 2.5);
                    const eveningHeight = (day.evening.liters / maxChartValue) * (chartHeight - 32);
                    const yPosition = chartHeight - 32 - eveningHeight;
                    
                    return (
                      <rect
                        key={`evening-${index}`}
                        x={`${xPosition - barWidth}%`}
                        y={yPosition}
                        width={`${barWidth}%`}
                        height={eveningHeight}
                        fill="#3b82f6"
                        rx="4"
                        className="hover:opacity-80 transition-opacity"
                      />
                    );
                  })}

                  {/* Total Line (connects daily totals) */}
                  {dailyDataWithGrowth.map((day, index) => {
                    if (index === 0) return null;
                    const prevX = ((index - 1) * 100 / dailyDataWithGrowth.length) + (100 / (dailyDataWithGrowth.length * 3) * 2);
                    const currX = (index * 100 / dailyDataWithGrowth.length) + (100 / (dailyDataWithGrowth.length * 3) * 2);
                    const prevY = chartHeight - 32 - ((dailyDataWithGrowth[index - 1].total.liters / maxChartValue) * (chartHeight - 32));
                    const currY = chartHeight - 32 - ((day.total.liters / maxChartValue) * (chartHeight - 32));
                    
                    return (
                      <line
                        key={`line-${index}`}
                        x1={`${prevX}%`}
                        y1={prevY}
                        x2={`${currX}%`}
                        y2={currY}
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    );
                  })}

                  {/* Data Points */}
                  {dailyDataWithGrowth.map((day, index) => {
                    const xPosition = (index * 100 / dailyDataWithGrowth.length) + (100 / (dailyDataWithGrowth.length * 3) * 2);
                    const yPosition = chartHeight - 32 - ((day.total.liters / maxChartValue) * (chartHeight - 32));
                    
                    return (
                      <circle
                        key={`point-${index}`}
                        cx={`${xPosition}%`}
                        cy={yPosition}
                        r="5"
                        fill="#10b981"
                        stroke="white"
                        strokeWidth="2"
                        className="hover:r-6 transition-all"
                      />
                    );
                  })}
                </svg>

                {/* X-Axis Labels and Data */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-around mt-2">
                  {dailyDataWithGrowth.map((day, index) => {
                    const date = new Date(day.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    return (
                      <div key={index} className="flex flex-col items-center min-w-[80px]">
                        <div className="text-xs font-medium text-gray-700 mb-1">{dayName}</div>
                        <div className="text-xs text-gray-500 mb-2">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                        
                        {/* Daily Stats */}
                        <div className="text-center mb-2 space-y-1">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <span className="text-xs font-medium text-gray-700">{day.morning.liters.toFixed(1)}L</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-medium text-gray-700">{day.evening.liters.toFixed(1)}L</span>
                          </div>
                          <div className="text-xs font-bold text-gray-900 pt-1 border-t border-gray-200">
                            Total: {day.total.liters.toFixed(1)}L
                          </div>
                        </div>

                        {/* Growth Rate Indicator */}
                        {index > 0 && (
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            day.growthDirection === 'up' 
                              ? 'bg-green-100 text-green-700' 
                              : day.growthDirection === 'down'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {day.growthDirection === 'up' && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                              </svg>
                            )}
                            {day.growthDirection === 'down' && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                            )}
                            {day.growthDirection === 'neutral' && <span>—</span>}
                            <span>{Math.abs(day.growthRate).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 rounded-lg">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Morning</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Evening</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Total Trend</span>
          </div>
        </div>
      </div>
    </div>
  );
}
