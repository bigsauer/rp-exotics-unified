import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Car, 
  Users, 
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Clock,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PerformanceTrackingPage = () => {
  const { user: currentUser, getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [selectedUser, setSelectedUser] = useState('all');
  const [users, setUsers] = useState([]);

  const API_BASE = process.env.REACT_APP_API_URL || '';

  // Fetch performance data
  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/admin/performance?period=${selectedPeriod}&userId=${selectedUser}`,
        {
          credentials: 'include',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const data = await response.json();
      setPerformanceData(data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for filter (sales users only)
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        // Filter to show only sales users
        const salesUsers = (data.users || data || []).filter(user => user.role === 'sales');
        setUsers(salesUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedPeriod, selectedUser]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const periods = [
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw className="animate-spin h-10 w-10 text-blue-400 mb-4" />
          <div className="text-white text-lg font-semibold">Loading performance data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      <ToastContainer position="bottom-right" theme="dark" />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Performance Tracking</h1>
            <p className="text-gray-300 text-lg">Monitor sales performance, deal metrics, and team productivity</p>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {periods.map(period => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-400" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sales Users</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.profile?.displayName || user.email}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={fetchPerformanceData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {performanceData && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-500/20 rounded-lg p-3">
                    <Car className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className={`flex items-center space-x-1 ${getChangeColor(performanceData.overview.carsBought.change)}`}>
                    {getChangeIcon(performanceData.overview.carsBought.change)}
                    <span className="text-sm font-medium">
                      {performanceData.overview.carsBought.change > 0 ? '+' : ''}
                      {performanceData.overview.carsBought.change}%
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {formatNumber(performanceData.overview.carsBought.value)}
                </h3>
                <p className="text-gray-400">Cars Bought</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-emerald-500/20 rounded-lg p-3">
                    <Car className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div className={`flex items-center space-x-1 ${getChangeColor(performanceData.overview.carsSold.change)}`}>
                    {getChangeIcon(performanceData.overview.carsSold.change)}
                    <span className="text-sm font-medium">
                      {performanceData.overview.carsSold.change > 0 ? '+' : ''}
                      {performanceData.overview.carsSold.change}%
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {formatNumber(performanceData.overview.carsSold.value)}
                </h3>
                <p className="text-gray-400">Cars Sold</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-green-500/20 rounded-lg p-3">
                    <DollarSign className="h-6 w-6 text-green-400" />
                  </div>
                  <div className={`flex items-center space-x-1 ${getChangeColor(performanceData.overview.totalRevenue.change)}`}>
                    {getChangeIcon(performanceData.overview.totalRevenue.change)}
                    <span className="text-sm font-medium">
                      {performanceData.overview.totalRevenue.change > 0 ? '+' : ''}
                      {performanceData.overview.totalRevenue.change}%
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(performanceData.overview.totalRevenue.value)}
                </h3>
                <p className="text-gray-400">Total Revenue</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-purple-500/20 rounded-lg p-3">
                    <Target className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className={`flex items-center space-x-1 ${getChangeColor(performanceData.overview.dealsCompleted.change)}`}>
                    {getChangeIcon(performanceData.overview.dealsCompleted.change)}
                    <span className="text-sm font-medium">
                      {performanceData.overview.dealsCompleted.change > 0 ? '+' : ''}
                      {performanceData.overview.dealsCompleted.change}%
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {formatNumber(performanceData.overview.dealsCompleted.value)}
                </h3>
                <p className="text-gray-400">Deals Completed</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-orange-500/20 rounded-lg p-3">
                    <Award className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className={`flex items-center space-x-1 ${getChangeColor(performanceData.overview.averageDealValue.change)}`}>
                    {getChangeIcon(performanceData.overview.averageDealValue.change)}
                    <span className="text-sm font-medium">
                      {performanceData.overview.averageDealValue.change > 0 ? '+' : ''}
                      {performanceData.overview.averageDealValue.change}%
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(performanceData.overview.averageDealValue.value)}
                </h3>
                <p className="text-gray-400">Avg Deal Value</p>
              </div>
            </div>

            {/* User Performance Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">User Performance</h2>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">User</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Cars Bought</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Cars Sold</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Total Revenue</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Avg Deal Value</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Deals Completed</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.userPerformance.map((user, index) => (
                      <tr key={user.userId} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-white font-medium">{user.name}</div>
                              <div className="text-gray-400 text-sm">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-white">{formatNumber(user.carsBought)}</td>
                        <td className="py-4 px-4 text-white">{formatNumber(user.carsSold)}</td>
                        <td className="py-4 px-4 text-white">{formatCurrency(user.totalRevenue)}</td>
                        <td className="py-4 px-4 text-white">{formatCurrency(user.averageDealValue)}</td>
                        <td className="py-4 px-4 text-white">{formatNumber(user.dealsCompleted)}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                                style={{ width: `${user.performanceScore}%` }}
                              ></div>
                            </div>
                            <span className="text-white text-sm">{user.performanceScore}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deal Type Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Deal Type Performance</h3>
                <div className="space-y-4">
                  {performanceData.dealTypePerformance.map((dealType, index) => (
                    <div key={dealType.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${dealType.color}`}></div>
                        <span className="text-white">{dealType.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">{formatNumber(dealType.count)}</div>
                        <div className="text-gray-400 text-sm">{formatCurrency(dealType.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Monthly Trends</h3>
                <div className="space-y-4">
                  {performanceData.monthlyTrends.map((trend, index) => (
                    <div key={trend.month} className="flex items-center justify-between">
                      <span className="text-white">{trend.month}</span>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-white font-medium">{formatNumber(trend.deals)}</div>
                          <div className="text-gray-400 text-sm">deals</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">{formatCurrency(trend.revenue)}</div>
                          <div className="text-gray-400 text-sm">revenue</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>


          </>
        )}
      </div>
    </div>
  );
};

export default PerformanceTrackingPage; 