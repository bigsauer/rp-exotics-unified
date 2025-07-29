import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Users, 
  ArrowLeft, 
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const DealerNetworkPage = () => {
  // All hooks must be at the top level
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  // MAXIMUM DEBUGGING
  console.log('All process.env variables:', process.env);
  console.log('window.location:', window.location.href);
  const API_BASE = process.env.REACT_APP_API_URL;
  console.log('DealerNetworkPage API_BASE:', API_BASE);
  if (!API_BASE) {
    alert('REACT_APP_API_URL is not set! API requests will fail. Please set this variable in your Vercel project settings and redeploy.');
  }

  // Helper to ensure all API calls use the correct backend URL
  function getApiUrl(path) {
    console.log('[DEBUG] getApiUrl called with path:', path);
    if (!API_BASE) {
      throw new Error('REACT_APP_API_URL is not set!');
    }
    const url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
    console.log('[DEBUG] Constructed API URL:', url);
    if (!url.startsWith('https://astonishing-chicken-production.up.railway.app')) {
      console.error('[DEBUG] API call is NOT going to the backend! URL:', url);
      alert('API call is NOT going to the backend! Check your environment variable and redeploy.');
    }
    return url;
  }

  // All useState hooks at the top
  const [dealers, setDealers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    region: 'all',
    dealerType: 'all',
    status: 'all',
    rating: 'all'
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showAddDealer, setShowAddDealer] = useState(false);
  const [editDealer, setEditDealer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [addFormData, setAddFormData] = useState({
    dealerName: '',
    contactPerson: '',
    contact: { phone: '', email: '' },
    licenseNumber: '',
    status: 'Active',
    fullAddress: ''
  });
  const [addingDealer, setAddingDealer] = useState(false);

  // All useEffect hooks at the top
  useEffect(() => {
    console.log('[DEBUG] DealerNetworkPage useEffect running');
    console.log('[DEBUG] API_BASE:', API_BASE);
    const loadDealers = async () => {
      setLoading(true);
      setError('');
      try {
        const url = getApiUrl('/api/dealers');
        console.log('[DEBUG] Fetching dealers from:', url);
        const fetchOptions = {};
        console.log('[DEBUG] Fetch options:', fetchOptions);
        const response = await fetch(url, fetchOptions);
        const contentType = response.headers.get('content-type');
        console.log('[DEBUG] Dealer fetch response status:', response.status, 'content-type:', contentType);
        let data;
        if (!response.ok) {
          const text = await response.text();
          console.error('[DEBUG] Dealer fetch failed:', response.status, text);
          setError(`Dealer fetch failed: ${response.status} ${text}`);
          setLoading(false);
          return;
        }
        try {
          data = await response.json();
          console.log('[DEBUG] Dealer fetch JSON response:', data);
        } catch (jsonErr) {
          const text = await response.text();
          console.error('[DEBUG] Dealer fetch response is not JSON:', text);
          setError('Dealer fetch response is not JSON. Raw response: ' + text.slice(0, 300));
          setLoading(false);
          return;
        }
        setDealers(data.data || data.dealers || []);
        setLoading(false);
      } catch (error) {
        console.error('[DEBUG] Error loading dealers:', error);
        setError('Error loading dealers: ' + error.message);
        setLoading(false);
      }
    };
    loadDealers();
  }, [API_BASE, currentUser]);

  const handleEditDealer = async (dealerId, dealerData) => {
    // Map form data to backend schema
    const body = {
      name: editFormData.dealerName,
      company: editFormData.dealerName,
      licenseNumber: editFormData.licenseNumber || '',
      contact: {
        person: editFormData.contactPerson || '',
        phone: editFormData.contact?.phone || '',
        email: editFormData.contact?.email || '',
        address: parseAddress(editFormData.fullAddress)
      },
      status: editFormData.status || 'Active',
    };
    console.log('Sending dealer update body:', body);
    try {
      const response = await fetch(`${API_BASE}/api/dealers/${dealerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies/session are sent
        body: JSON.stringify(body),
      });
      const updated = await response.json();
      if (updated && updated.success && updated.data) {
        setDealers(prev => prev.map(d => d.id === dealerId ? updated.data : d));
        setEditDealer(null);
        setEditFormData({});
        setSuccessMessage('Dealer updated successfully!');
        setTimeout(() => setSuccessMessage(''), 2000);
        console.log('Updated dealer:', updated.data);
      } else {
        setSuccessMessage('Failed to update dealer.');
        setTimeout(() => setSuccessMessage(''), 2000);
        console.error('Update response:', updated);
      }
    } catch (error) {
      setSuccessMessage('Error updating dealer.');
      setTimeout(() => setSuccessMessage(''), 2000);
      console.error('Error updating dealer:', error);
    }
  };

  const openEditModal = (dealer) => {
    setEditDealer(dealer);
    setEditFormData({
      dealerName: dealer.company || dealer.name || '',
      contactPerson: dealer.contact?.person || '',
      contact: dealer.contact || {},
      licenseNumber: dealer.licenseNumber || '',
      status: dealer.status || 'Active',
      fullAddress: joinAddress(dealer.contact?.address)
    });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editDealer) {
      handleEditDealer(editDealer.id, editFormData);
    }
  };

  const handleDeleteDealer = async (dealerId) => {
    try {
      const response = await fetch(`${API_BASE}/api/dealers/${dealerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setDealers(prev => prev.filter(d => d.id !== dealerId));
        setDeleteConfirm(null);
      } else {
        console.error('Error deleting dealer:', response.statusText);
        alert('Failed to delete dealer. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting dealer:', error);
      alert('Failed to delete dealer. Please try again.');
    }
  };

  const handleAddDealer = async (e) => {
    e.preventDefault();
    setAddingDealer(true);
    setSuccessMessage('');
    // Map form data to backend schema
    const body = {
      name: addFormData.dealerName,
      company: addFormData.dealerName,
      licenseNumber: addFormData.licenseNumber || '',
      type: 'Dealer',
      contact: {
        person: addFormData.contactPerson || '',
        phone: addFormData.contact?.phone || '',
        email: addFormData.contact?.email || '',
        address: parseAddress(addFormData.fullAddress)
      },
      status: addFormData.status || 'Active',
    };
    try {
      const response = await fetch(`${API_BASE}/api/dealers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (response.ok && result.success && result.data) {
        setDealers(prev => [result.data, ...prev]);
        setShowAddDealer(false);
        setAddFormData({ dealerName: '', contactPerson: '', contact: { phone: '', email: '' }, licenseNumber: '', status: 'Active', fullAddress: '' });
        setSuccessMessage('Dealer added successfully!');
        setTimeout(() => setSuccessMessage(''), 2000);
      } else {
        setSuccessMessage(result.error || 'Failed to add dealer.');
        setTimeout(() => setSuccessMessage(''), 2000);
      }
    } catch (error) {
      setSuccessMessage('Error adding dealer.');
      setTimeout(() => setSuccessMessage(''), 2000);
    } finally {
      setAddingDealer(false);
    }
  };

  const filteredDealers = dealers.filter(dealer => {
    const matchesSearch = (dealer.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (dealer.company?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (dealer.contact?.person?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesRegion = selectedFilters.region === 'all' || dealer.location?.includes(selectedFilters.region);
    const matchesType = selectedFilters.dealerType === 'all' || dealer.type === selectedFilters.dealerType;
    const matchesStatus = selectedFilters.status === 'all' || dealer.status === selectedFilters.status;

    return matchesSearch && matchesRegion && matchesType && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-green-500/20 text-green-400';
      case 'Inactive': return 'bg-red-500/20 text-red-400';
      case 'Pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Add a helper to join address parts into a single line
  function joinAddress(address) {
    if (!address) return '';
    const { street, city, state, zip } = address;
    return [street, city, state, zip].filter(Boolean).join(', ');
  }
  // Add a helper to parse a single line address into parts
  function parseAddress(full) {
    if (!full) return { street: '', city: '', state: '', zip: '' };
    const parts = full.split(',').map(s => s.trim());
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      zip: parts[3] || ''
    };
  }

  if (!currentUser) {
    return null;
  }

  const permissions = {
    admin: {
      canCreateDeals: true,
      canViewDeals: true,
      canEditDeals: true,
      canSearchDealers: true,
      canManageDealers: true,
      canAccessBackOffice: true,
      canViewReports: true,
      canViewFinancials: true,
      canManageUsers: true
    },
    sales: {
      canCreateDeals: true,
      canViewDeals: true,
      canEditDeals: true,
      canSearchDealers: true,
      canManageDealers: true,
      canAccessBackOffice: false,
      canViewReports: true,
      canViewFinancials: false,
      canManageUsers: false
    },
    finance: {
      canCreateDeals: false,
      canViewDeals: true,
      canEditDeals: true,
      canSearchDealers: true,
      canManageDealers: false,
      canAccessBackOffice: true,
      canViewReports: true,
      canViewFinancials: true,
      canManageUsers: false
    },
    viewer: {
      canCreateDeals: false,
      canViewDeals: true,
      canEditDeals: false,
      canSearchDealers: true,
      canManageDealers: false,
      canAccessBackOffice: false,
      canViewReports: true,
      canViewFinancials: false,
      canManageUsers: false
    }
  };

  // Get user's display name from profile or construct from firstName/lastName
  const getUserDisplayName = () => {
    if (!currentUser) return 'Guest';
    if (currentUser.profile?.displayName) {
      return currentUser.profile.displayName;
    }
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    if (currentUser.firstName) {
      return currentUser.firstName;
    }
    return currentUser.email?.split('@')[0] || 'User';
  };

  const userDisplayName = getUserDisplayName();
  const userPermissions = permissions[currentUser?.role] || permissions.viewer;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading dealer network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg font-bold mb-4">Error loading dealers</p>
          <pre className="bg-black/60 text-red-200 p-4 rounded-lg max-w-xl mx-auto overflow-x-auto text-left" style={{whiteSpace: 'pre-wrap'}}>{error}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="mr-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Dealer Network</h1>
                <p className="text-gray-300 text-sm">Manage your dealer contacts and relationships</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{userDisplayName}</p>
                <p className="text-gray-400 text-xs">{currentUser?.role || 'Guest'}</p>
              </div>
              {userPermissions.canManageDealers && (
                <button
                  onClick={() => setShowAddDealer(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Dealer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg transition-all">
          {successMessage}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search dealers by name, company, or contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={selectedFilters.region}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, region: e.target.value }))}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Regions</option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
              </select>

              <select
                value={selectedFilters.status}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm">View:</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              List
            </button>
          </div>
          <div className="text-gray-400 text-sm">
            {filteredDealers.length} of {dealers.length} dealers
          </div>
        </div>

        {/* Dealers Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDealers.map((dealer) => (
              <div key={dealer.id} className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{dealer.name}</h3>
                    <p className="text-gray-400 text-sm">{dealer.company}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(dealer.status)}`}>
                      {dealer.status}
                    </span>
                    {userPermissions.canManageDealers && (
                      <div className="relative">
                        <button 
                          onClick={() => setDeleteConfirm(dealer)}
                          className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                          title="Delete dealer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {dealer.contact?.person && (
                    <div className="flex items-center text-gray-300 text-sm">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      {dealer.contact.person}
                    </div>
                  )}
                  {dealer.contact?.phone && (
                    <div className="flex items-center text-gray-300 text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {dealer.contact.phone}
                    </div>
                  )}
                  {dealer.contact?.email && (
                    <div className="flex items-center text-gray-300 text-sm">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {dealer.contact.email}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-gray-400 text-xs">Deals: {dealer.totalDeals || 0}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">{dealer.totalDeals || 0} deals</p>
                    <p className="text-gray-400 text-xs">${(dealer.totalVolume || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                    <button 
                    onClick={() => setSelectedDealer(dealer)}
                    className="flex-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                    View Details
                    </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDealers.map((dealer) => (
              <div key={dealer.id} className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{dealer.name}</h3>
                      <p className="text-gray-400 text-sm">{dealer.company}</p>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      {dealer.contact?.person && (
                        <div className="flex items-center text-gray-300">
                          <Users className="h-4 w-4 mr-2 text-gray-400" />
                          {dealer.contact.person}
                        </div>
                      )}
                      {dealer.contact?.phone && (
                        <div className="flex items-center text-gray-300">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {dealer.contact.phone}
                        </div>
                      )}
                      {dealer.contact?.email && (
                        <div className="flex items-center text-gray-300">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {dealer.contact.email}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">{dealer.totalDeals || 0} deals</p>
                      <p className="text-gray-400 text-xs">${(dealer.totalVolume || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(dealer.status)}`}>
                      {dealer.status}
                    </span>
                        <button 
                      onClick={() => setSelectedDealer(dealer)}
                      className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                        >
                      View Details
                        </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredDealers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No dealers found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
            {userPermissions.canManageDealers && (
              <button
                onClick={() => setShowAddDealer(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Dealer</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dealer Modal would go here */}
      {/* For now, we'll just show a placeholder */}
      {showAddDealer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Add New Dealer</h3>
            <form onSubmit={handleAddDealer} className="space-y-4">
              <div>
                <label htmlFor="add-dealer-name" className="block text-sm font-medium text-gray-300 mb-1">Dealer Name</label>
                <input
                  type="text"
                  id="add-dealer-name"
                  value={addFormData.dealerName}
                  onChange={e => setAddFormData(prev => ({ ...prev, dealerName: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="add-contact-person" className="block text-sm font-medium text-gray-300 mb-1">Contact Person</label>
                <input
                  type="text"
                  id="add-contact-person"
                  value={addFormData.contactPerson}
                  onChange={e => setAddFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="add-contact-phone" className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="text"
                  id="add-contact-phone"
                  value={addFormData.contact.phone}
                  onChange={e => setAddFormData(prev => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="add-contact-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  id="add-contact-email"
                  value={addFormData.contact.email}
                  onChange={e => setAddFormData(prev => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Street, City, State, Zip"
                  value={addFormData.fullAddress || ''}
                  onChange={e => setAddFormData(prev => ({ ...prev, fullAddress: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="add-license-number" className="block text-sm font-medium text-gray-300 mb-1">Dealer License Number</label>
                <input
                  type="text"
                  id="add-license-number"
                  value={addFormData.licenseNumber || ''}
                  onChange={e => setAddFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="add-status" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  id="add-status"
                  value={addFormData.status}
                  onChange={e => setAddFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddDealer(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  disabled={addingDealer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  disabled={addingDealer}
                >
                  {addingDealer ? 'Saving...' : 'Add Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editDealer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Edit Dealer</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="edit-dealer-name" className="block text-sm font-medium text-gray-300 mb-1">Dealer Name</label>
                <input
                  type="text"
                  id="edit-dealer-name"
                  value={editFormData.dealerName}
                  onChange={e => setEditFormData(prev => ({ ...prev, dealerName: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="edit-contact-person" className="block text-sm font-medium text-gray-300 mb-1">Contact Person</label>
                <input
                  type="text"
                  id="edit-contact-person"
                  value={editFormData.contactPerson}
                  onChange={e => setEditFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="edit-contact-phone" className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="text"
                  id="edit-contact-phone"
                  value={editFormData.contact?.phone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="edit-contact-email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  id="edit-contact-email"
                  value={editFormData.contact?.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* Address Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Street, City, State, Zip"
                  value={editFormData.fullAddress || ''}
                  onChange={e => setEditFormData(prev => ({ ...prev, fullAddress: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {/* License Number Field */}
              <div>
                <label htmlFor="edit-license-number" className="block text-sm font-medium text-gray-300 mb-1">Dealer License Number</label>
                <input
                  type="text"
                  id="edit-license-number"
                  value={editFormData.licenseNumber || ''}
                  onChange={e => setEditFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  id="edit-status"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditDealer(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dealer Details Modal */}
      {selectedDealer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Dealer Details</h3>
              <button
                onClick={() => setSelectedDealer(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Dealer Name</label>
                    <p className="text-white font-medium">{selectedDealer.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Company</label>
                    <p className="text-white font-medium">{selectedDealer.company || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(selectedDealer.status)}`}>
                      {selectedDealer.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">License Number</label>
                    <p className="text-white font-medium">{selectedDealer.licenseNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedDealer.contact?.person && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Contact Person</label>
                      <p className="text-white font-medium">{selectedDealer.contact.person}</p>
                    </div>
                  )}
                  {selectedDealer.contact?.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
                      <p className="text-white font-medium">{selectedDealer.contact.phone}</p>
                    </div>
                  )}
                  {selectedDealer.contact?.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                      <p className="text-white font-medium">{selectedDealer.contact.email}</p>
                    </div>
                  )}
                  {selectedDealer.contact?.address && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Address</label>
                      <p className="text-white font-medium">{joinAddress(selectedDealer.contact.address)}</p>
                    </div>
                  )}
                </div>
              </div>



              {/* Recent Deals */}
              {selectedDealer.recentDeals && selectedDealer.recentDeals.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Recent Deals</h4>
                  <div className="space-y-2">
                    {selectedDealer.recentDeals.slice(0, 5).map((deal, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                        <div>
                          <p className="text-white font-medium">{deal.vehicle}</p>
                          <p className="text-sm text-gray-400">{new Date(deal.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">${deal.amount?.toLocaleString() || 'N/A'}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            deal.status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                            deal.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {deal.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedDealer.notes && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3">Notes</h4>
                  <p className="text-gray-300">{selectedDealer.notes}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setSelectedDealer(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
              {userPermissions.canManageDealers && (
                <button
                  onClick={() => {
                    openEditModal(selectedDealer);
                    setSelectedDealer(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Edit Dealer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Delete Dealer</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete <span className="text-white font-semibold">{deleteConfirm.name}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDealer(deleteConfirm.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerNetworkPage; 