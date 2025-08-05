import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  TrendingUp,
  Calendar,
  Star,
  ArrowLeft,
  DollarSign,
  Filter
} from 'lucide-react';
import { useAuth } from './AuthContext';

const BrokerNetworkPage = () => {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBroker, setEditingBroker] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Date range state for broker fee calculations
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [commissionData, setCommissionData] = useState(null);
  const [loadingCommission, setLoadingCommission] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';

  // Form state for adding/editing brokers
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialties: [],
    notes: ''
  });

  const specialtyOptions = [
    'Exotic', 'Luxury', 'Classic', 'Muscle', 'Import', 
    'Domestic', 'SUV', 'Sports Car', 'Sedan', 'Other'
  ];





  useEffect(() => {
    fetchBrokers();
    fetchStats();
  }, [searchTerm, specialtyFilter]);

  const fetchBrokers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (specialtyFilter !== 'all') params.append('specialty', specialtyFilter);

      const response = await fetch(`${API_BASE}/api/brokers?${params}`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        setBrokers(result.data);
      } else {
        throw new Error('Failed to fetch brokers');
      }
    } catch (error) {
      console.error('Error fetching brokers:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/brokers/stats/overview`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching broker stats:', error);
    }
  };

  const fetchCommissionRange = async (brokerId, startDate, endDate) => {
    try {
      setLoadingCommission(true);
      console.log(`[BROKER COMMISSION] Fetching commission for broker ${brokerId} from ${startDate} to ${endDate}`);
      console.log(`[BROKER COMMISSION] API URL: ${API_BASE}/api/brokers/${brokerId}/commission-range?startDate=${startDate}&endDate=${endDate}`);
      
      const response = await fetch(
        `${API_BASE}/api/brokers/${brokerId}/commission-range?startDate=${startDate}&endDate=${endDate}`,
        {
          credentials: 'include',
          headers: getAuthHeaders()
        }
      );

      console.log(`[BROKER COMMISSION] Response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[BROKER COMMISSION] Response data:`, result);
        setCommissionData(result.data);
      } else {
        const errorText = await response.text();
        console.error(`[BROKER COMMISSION] Error response: ${errorText}`);
        throw new Error(`Failed to fetch commission data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching commission range:', error);
      setCommissionData(null);
    } finally {
      setLoadingCommission(false);
    }
  };

  const fetchFeesRange = async (brokerId, startDate, endDate) => {
    try {
      setLoadingCommission(true);
      console.log(`[BROKER FEES] Fetching fees for broker ${brokerId} from ${startDate} to ${endDate}`);
      console.log(`[BROKER FEES] API URL: ${API_BASE}/api/brokers/${brokerId}/fees-range?startDate=${startDate}&endDate=${endDate}`);
      
      const response = await fetch(
        `${API_BASE}/api/brokers/${brokerId}/fees-range?startDate=${startDate}&endDate=${endDate}`,
        {
          credentials: 'include',
          headers: getAuthHeaders()
        }
      );

      console.log(`[BROKER FEES] Response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[BROKER FEES] Response data:`, result);
        setCommissionData(result.data);
      } else {
        const errorText = await response.text();
        console.error(`[BROKER FEES] Error response: ${errorText}`);
        throw new Error(`Failed to fetch fees data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching fees range:', error);
      setCommissionData(null);
    } finally {
      setLoadingCommission(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingBroker 
        ? `${API_BASE}/api/brokers/${editingBroker._id}`
        : `${API_BASE}/api/brokers`;
      
      const method = editingBroker ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAddModal(false);
        setEditingBroker(null);
        resetForm();
        fetchBrokers();
        fetchStats();
      } else {
        throw new Error('Failed to save broker');
      }
    } catch (error) {
      console.error('Error saving broker:', error);
      setError(error.message);
    }
  };

  const handleDelete = async (brokerId) => {
    if (!window.confirm('Are you sure you want to delete this broker?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/brokers/${brokerId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        fetchBrokers();
        fetchStats();
      } else {
        throw new Error('Failed to delete broker');
      }
    } catch (error) {
      console.error('Error deleting broker:', error);
      setError(error.message);
    }
  };

  const handleEdit = (broker) => {
    setEditingBroker(broker);
    setFormData({
      name: broker.name || '',
      email: broker.email || '',
      phone: broker.phone || '',
      specialties: broker.specialties || [],
      notes: broker.notes || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialties: [],
      notes: ''
    });
  };

  const handleSpecialtyToggle = (specialty) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleDateRangeClick = (broker, type = 'commission') => {
    setDateRange({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      endDate: new Date().toISOString().split('T')[0] // today
    });
    setCommissionData(null);
    setShowDateRangeModal(true);
    
    // Set the broker with the calculation type
    setSelectedBroker({ ...broker, calculationType: type });
  };

  const handleCalculateCommission = () => {
    console.log(`[BROKER CALC] handleCalculateCommission called`);
    console.log(`[BROKER CALC] selectedBroker:`, selectedBroker);
    console.log(`[BROKER CALC] dateRange:`, dateRange);
    console.log(`[BROKER CALC] calculationType:`, selectedBroker?.calculationType);
    
    if (selectedBroker && dateRange.startDate && dateRange.endDate) {
      if (selectedBroker.calculationType === 'fees') {
        console.log(`[BROKER CALC] Calling fetchFeesRange`);
        fetchFeesRange(selectedBroker._id, dateRange.startDate, dateRange.endDate);
      } else {
        console.log(`[BROKER CALC] Calling fetchCommissionRange`);
        fetchCommissionRange(selectedBroker._id, dateRange.startDate, dateRange.endDate);
      }
    } else {
      console.error(`[BROKER CALC] Missing required data:`, {
        hasSelectedBroker: !!selectedBroker,
        hasStartDate: !!dateRange.startDate,
        hasEndDate: !!dateRange.endDate
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading && brokers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-6 h-48"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Broker Network</h1>
            <p className="text-gray-400">Manage your broker relationships and track performance</p>
          </div>
          <button
            onClick={() => {
              setEditingBroker(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors mt-4 md:mt-0"
          >
            <Plus className="h-5 w-5" />
            <span>Add Broker</span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Brokers</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Active</p>
                  <p className="text-2xl font-bold text-white">{stats.active}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-200" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-white">{stats.pending}</p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-200" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Top Volume</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.topBrokers?.[0] ? formatCurrency(stats.topBrokers[0].totalVolume) : '$0'}
                  </p>
                </div>
                <Star className="h-8 w-8 text-purple-200" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search brokers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Specialties</option>
              {specialtyOptions.map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Brokers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brokers.map((broker) => (
            <div key={broker._id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-1">{broker.name}</h3>

                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(broker)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(broker._id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-gray-300 text-sm">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="truncate">{broker.email}</span>
                </div>
                {broker.phone && (
                  <div className="flex items-center text-gray-300 text-sm">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{broker.phone}</span>
                  </div>
                )}

              </div>

              {broker.specialties?.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">Specialties:</p>
                  <div className="flex flex-wrap gap-1">
                    {broker.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm mb-4">
                <div>
                  <p className="text-gray-400">Commission</p>
                  <p className="text-white font-medium">{broker.commissionRate}%</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Volume</p>
                  <p className="text-white font-medium">{formatCurrency(broker.totalVolume)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Deals</p>
                  <p className="text-white font-medium">{broker.totalDeals}</p>
                </div>
              </div>

              {/* Broker Fee Information */}
              <div className="bg-gray-700 rounded-lg p-3 mb-4">
                <p className="text-gray-400 text-sm mb-2 font-medium">Broker Fees</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Total Earned</p>
                    <p className="text-green-400 font-medium">{formatCurrency(broker.totalFeesEarned || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Paid</p>
                    <p className="text-blue-400 font-medium">{formatCurrency(broker.totalFeesPaid || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Outstanding</p>
                    <p className="text-yellow-400 font-medium">{formatCurrency((broker.totalFeesEarned || 0) - (broker.totalFeesPaid || 0))}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Fee Deals</p>
                    <p className="text-white font-medium">{broker.feesHistory?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleDateRangeClick(broker, 'commission')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Calculate Fees</span>
                </button>
                <button
                  onClick={() => handleDateRangeClick(broker, 'fees')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Fee History</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {brokers.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No brokers found</h3>
            <p className="text-gray-500">Get started by adding your first broker to the network.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingBroker ? 'Edit Broker' : 'Add New Broker'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Specialties</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {specialtyOptions.map((specialty) => (
                    <label key={specialty} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.specialties.includes(specialty)}
                        onChange={() => handleSpecialtyToggle(specialty)}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">{specialty}</span>
                    </label>
                  ))}
                </div>
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBroker(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingBroker ? 'Update Broker' : 'Add Broker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Range Commission Modal */}
      {showDateRangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {selectedBroker?.calculationType === 'fees' ? 'Broker Fee History' : 'Broker Commission Calculator'} - {selectedBroker?.name}
              </h2>
              <button
                onClick={() => {
                  setShowDateRangeModal(false);
                  setSelectedBroker(null);
                  setCommissionData(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            </div>

            {/* Date Range Selection */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Select Date Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleCalculateCommission}
                disabled={loadingCommission || !dateRange.startDate || !dateRange.endDate}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>{loadingCommission ? 'Calculating...' : selectedBroker?.calculationType === 'fees' ? 'Calculate Fees' : 'Calculate Commission'}</span>
              </button>
            </div>

            {/* Commission Results */}
            {commissionData && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Total Fees Earned</p>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(commissionData.summary.totalFeesEarned)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total Deals</p>
                        <p className="text-2xl font-bold text-white">
                          {commissionData.summary.totalDeals}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-200" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Total Fees Paid</p>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(commissionData.summary.totalFeesPaid)}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-200" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100 text-sm">Unpaid Fees</p>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(commissionData.summary.totalFeesUnpaid)}
                        </p>
                      </div>
                      <Star className="h-8 w-8 text-yellow-200" />
                    </div>
                  </div>
                </div>

                {/* Monthly Breakdown */}
                {commissionData.monthlyBreakdown && commissionData.monthlyBreakdown.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Monthly Breakdown</h3>
                    <div className="space-y-2">
                      {commissionData.monthlyBreakdown.map((month, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-600 rounded-lg p-3">
                          <div>
                            <p className="text-white font-medium">{month.month}</p>
                            <p className="text-gray-300 text-sm">{month.dealCount} deals</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-semibold">
                              {formatCurrency(month.totalEarned)}
                            </p>
                            <p className="text-gray-400 text-xs">
                              Paid: {formatCurrency(month.totalPaid)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Fees */}
                {commissionData.fees && commissionData.fees.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Individual Fees</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600">
                            <th className="text-left py-2 text-gray-300">Date</th>
                            <th className="text-left py-2 text-gray-300">VIN</th>
                            <th className="text-left py-2 text-gray-300">Vehicle</th>
                            <th className="text-left py-2 text-gray-300">Sales Person</th>
                            <th className="text-center py-2 text-gray-300">Status</th>
                            <th className="text-right py-2 text-gray-300">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commissionData.fees.map((fee, index) => (
                            <tr key={index} className="border-b border-gray-600">
                              <td className="py-2 text-white">
                                {new Date(fee.date).toLocaleDateString()}
                              </td>
                              <td className="py-2 text-white">{fee.dealVin || 'N/A'}</td>
                              <td className="py-2 text-white">{fee.dealVehicle || 'N/A'}</td>
                              <td className="py-2 text-white">{fee.salesPerson?.name || 'N/A'}</td>
                              <td className="py-2 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  fee.paid 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {fee.paid ? 'Paid' : 'Unpaid'}
                                </span>
                              </td>
                              <td className="py-2 text-right text-green-400 font-semibold">
                                {formatCurrency(fee.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(!commissionData.monthlyBreakdown || commissionData.monthlyBreakdown.length === 0) && 
                 (!commissionData.fees || commissionData.fees.length === 0) && (
                  <div className="text-center py-8">
                    <DollarSign className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No fee data found</h3>
                    <p className="text-gray-500">No broker fees found for the selected date range.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerNetworkPage; 