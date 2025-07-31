import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Calendar,
  DollarSign,
  User,
  Building,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUpDown,
  Plus,
  Settings,
  BarChart3
} from 'lucide-react';
import { useAuth } from './AuthContext';

const AllDealsPage = () => {
  const { getAuthHeaders } = useAuth();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dealTypeFilter, setDealTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    pending: 0
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';

  // Fetch all deals
  const fetchDeals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/deals`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }
      
      const data = await response.json();
      setDeals(data.deals || data.data || []);
      
      // Calculate stats
      const total = data.deals?.length || data.data?.length || 0;
      const active = data.deals?.filter(d => d.status === 'active').length || 0;
      const completed = data.deals?.filter(d => d.status === 'completed').length || 0;
      const pending = data.deals?.filter(d => d.status === 'pending').length || 0;
      
      setStats({ total, active, completed, pending });
    } catch (error) {
      console.error('Error fetching deals:', error);
      setError('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  // Filter and sort deals
  const filteredAndSortedDeals = deals
    .filter(deal => {
      const matchesSearch = 
        deal.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.rpStockNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.vehicle?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.vehicle?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.seller?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || deal.status === statusFilter;
      const matchesType = dealTypeFilter === 'all' || deal.dealType === dealTypeFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const dealDate = new Date(deal.createdAt || deal.dateCreated);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (dateFilter) {
          case 'today':
            matchesDate = dealDate >= today;
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = dealDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = dealDate >= monthAgo;
            break;
        }
      }
      
      return matchesSearch && matchesStatus && matchesType && matchesDate;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle nested properties
      if (sortBy === 'vehicle') {
        aValue = `${a.vehicle?.year} ${a.vehicle?.make} ${a.vehicle?.model}`;
        bValue = `${b.vehicle?.year} ${b.vehicle?.make} ${b.vehicle?.model}`;
      }
      
      if (sortBy === 'seller') {
        aValue = a.seller?.name || '';
        bValue = b.seller?.name || '';
      }
      
      if (sortBy === 'buyer') {
        aValue = a.buyer?.name || '';
        bValue = b.buyer?.name || '';
      }
      
      // Handle dates
      if (sortBy === 'createdAt' || sortBy === 'dateCreated') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Handle deal selection
  const handleDealSelection = (dealId) => {
    setSelectedDeals(prev => 
      prev.includes(dealId) 
        ? prev.filter(id => id !== dealId)
        : [...prev, dealId]
    );
  };

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedDeals.length === filteredAndSortedDeals.length) {
      setSelectedDeals([]);
    } else {
      setSelectedDeals(filteredAndSortedDeals.map(deal => deal._id));
    }
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return badges[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get deal type badge styling
  const getDealTypeBadge = (dealType) => {
    const badges = {
      'wholesale-d2d': 'bg-purple-100 text-purple-800 border-purple-200',
      'wholesale-private': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'wholesale-flip': 'bg-pink-100 text-pink-800 border-pink-200',
      'retail-pp': 'bg-orange-100 text-orange-800 border-orange-200',
      'retail-d2d': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'retail-auction': 'bg-teal-100 text-teal-800 border-teal-200',
      'retail-dtod': 'bg-cyan-100 text-cyan-800 border-cyan-200'
    };
    return badges[dealType] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => window.history.back()}
                className="mr-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition-colors"
              >
                <Car className="h-5 w-5 text-white" />
              </button>
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-3 mr-4 shadow-lg shadow-purple-500/25">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">All Deals</h1>
                  <p className="text-gray-300 text-sm">Complete deal management and oversight</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fetchDeals()}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={() => window.location.href = '/deals/new'}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg shadow-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Deal
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Deals</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-3">
                <Car className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Deals</p>
                <p className="text-2xl font-bold text-green-400">{stats.active}</p>
              </div>
              <div className="bg-green-500/20 rounded-lg p-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-2xl font-bold text-blue-400">{stats.completed}</p>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-3">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-3">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Filters & Search</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Deal Type Filter */}
            <select
              value={dealTypeFilter}
              onChange={(e) => setDealTypeFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="wholesale-d2d">Wholesale D2D</option>
              <option value="wholesale-private">Wholesale Private</option>
              <option value="wholesale-flip">Wholesale Flip</option>
              <option value="retail-pp">Retail PP</option>
              <option value="retail-d2d">Retail D2D</option>
              <option value="retail-auction">Retail Auction</option>
              <option value="retail-dtod">Retail D2D</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                  <option value="status">Status</option>
                  <option value="dealType">Deal Type</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Sort Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="flex items-end">
                <div className="text-gray-300 text-sm">
                  {filteredAndSortedDeals.length} of {deals.length} deals
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Deals Table */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading deals...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedDeals.length === filteredAndSortedDeals.length && filteredAndSortedDeals.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Deal Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Parties
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredAndSortedDeals.map((deal) => (
                    <tr key={deal._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedDeals.includes(deal._id)}
                          onChange={() => handleDealSelection(deal._id)}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {deal.vehicle?.year} {deal.vehicle?.make} {deal.vehicle?.model}
                          </div>
                          <div className="text-sm text-gray-400">
                            VIN: {deal.vin}
                          </div>
                          <div className="text-sm text-gray-400">
                            Stock: {deal.rpStockNumber || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDealTypeBadge(deal.dealType)}`}>
                            {deal.dealType}
                          </span>
                          <div className="text-sm text-gray-400 mt-1">
                            {formatCurrency(deal.financials?.purchasePrice)} → {formatCurrency(deal.financials?.salePrice)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-300">
                            <User className="h-3 w-3 inline mr-1" />
                            {deal.seller?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-300">
                            <Building className="h-3 w-3 inline mr-1" />
                            {deal.buyer?.name || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(deal.status)}`}>
                          {deal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(deal.createdAt || deal.dateCreated)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => window.location.href = `/deals/${deal._id}`}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => window.location.href = `/deals/${deal._id}/edit`}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Edit Deal"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => window.location.href = `/deals/${deal._id}/documents`}
                            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
                            title="Documents"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredAndSortedDeals.length === 0 && (
                <div className="p-8 text-center">
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No deals found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedDeals.length > 0 && (
          <div className="fixed bottom-6 right-6 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 shadow-lg">
            <div className="flex items-center space-x-4">
              <span className="text-white text-sm">
                {selectedDeals.length} deal(s) selected
              </span>
              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                Export Selected
              </button>
              <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                Bulk Update
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllDealsPage; 