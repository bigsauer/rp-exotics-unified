import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, CheckCircle, XCircle, Clock, 
  Car, Eye, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const FinanceDashboard = () => {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [vehicleRecords, setVehicleRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    dealType: '',
    search: ''
  });
  const [submittedDeals, setSubmittedDeals] = useState([]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const API_BASE = process.env.REACT_APP_API_URL;
    console.log('[DEBUG][FinanceDashboard] API_BASE:', API_BASE);
    console.log('[DEBUG][FinanceDashboard] Starting data fetch...');
    console.log('[DEBUG][FinanceDashboard] Current time:', new Date().toISOString());
    Promise.all([
      fetch(`${API_BASE}/api/documents/vehicle-records`, {
        credentials: 'include',
        headers: getAuthHeaders()
      })
        .then(res => {
          console.log('[DEBUG][FinanceDashboard] Vehicle records fetch response status:', res.status);
          return res.json();
        })
        .then(recordsData => {
          console.log('[DEBUG][FinanceDashboard] Vehicle records data received:', {
            success: recordsData.success,
            dataLength: recordsData.data?.length || 0,
            pagination: recordsData.pagination,
            sampleRecords: recordsData.data?.slice(0, 3).map(r => ({
              id: r._id,
              recordId: r.recordId,
              vin: r.vin,
              stockNumber: r.stockNumber,
              dealType: r.dealType,
              createdAt: r.createdAt
            }))
          });
          if (isMounted && recordsData.success) {
            setVehicleRecords(recordsData.data);
          }
        })
        .catch(err => { console.error('[DEBUG][FinanceDashboard] Error fetching vehicle records:', err); }),
      fetch(`${API_BASE}/api/documents/stats`, {
        credentials: 'include',
        headers: getAuthHeaders()
      })
        .then(res => {
          console.log('[DEBUG][FinanceDashboard] Stats fetch response status:', res.status);
          return res.json();
        })
        .then(statsData => {
          if (isMounted && statsData.success) {
            setStats(statsData.stats);
          }
        })
        .catch(err => { console.error('[DEBUG][FinanceDashboard] Error fetching stats:', err); }),
      fetch(`${API_BASE}/api/deals`, {
        credentials: 'include',
        headers: getAuthHeaders()
      })
        .then(res => {
          console.log('[DEBUG][FinanceDashboard] Deals fetch response status:', res.status);
          return res.json();
        })
        .then(data => {
          console.log('[DEBUG][FinanceDashboard] Deals data received:', {
            dealsLength: data.deals?.length || data.data?.length || 0,
            sampleDeals: (data.deals || data.data || []).slice(0, 3).map(d => ({
              id: d._id,
              vin: d.vin,
              stockNumber: d.stockNumber,
              dealType: d.dealType,
              createdAt: d.createdAt
            }))
          });
          if (isMounted) setSubmittedDeals(data.deals || data.data || []);
        })
        .catch(() => { if (isMounted) setSubmittedDeals([]); }),

    ]).finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [getAuthHeaders]);



  const fetchData = async () => {
    try {
      setLoading(true);
      const API_BASE = process.env.REACT_APP_API_URL;
      
      // Fetch vehicle records
      const recordsResponse = await fetch(`${API_BASE}/api/documents/vehicle-records`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      console.log('[DEBUG][FinanceDashboard] Vehicle records fetch response status:', recordsResponse.status);
      const recordsData = await recordsResponse.json();
      
      if (recordsData.success) {
        setVehicleRecords(recordsData.data);
      }

      // Fetch stats
      const statsResponse = await fetch(`${API_BASE}/api/documents/stats`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      console.log('[DEBUG][FinanceDashboard] Stats fetch response status:', statsResponse.status);
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        setStats(statsData.stats);
      }

    } catch (error) {
      console.error('[DEBUG][FinanceDashboard] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (recordId, documentIndex, status, notes = '') => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL;
      const url = `${API_BASE}/api/documents/vehicle-records/${recordId}/documents/${documentIndex}/status`;
      console.log('[DEBUG][FinanceDashboard] Updating status via:', url);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status, notes }),
        credentials: 'include'
      });
      console.log('[DEBUG][FinanceDashboard] Status update response status:', response.status);

      if (response.ok) {
        // Refresh data
        fetchData();
        alert('Status updated successfully');
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('[DEBUG][FinanceDashboard] Error updating status:', error);
      alert('Error updating status');
    }
  };

  const downloadDocument = async (fileName) => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL;
      const url = `${API_BASE}/api/documents/download/${fileName}`;
      console.log('[DEBUG][FinanceDashboard] Downloading document from:', url);
      const response = await fetch(url, {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const blob = await response.blob();
        const urlObj = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObj;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(urlObj);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download document');
      }
    } catch (error) {
      console.error('[DEBUG][FinanceDashboard] Error downloading document:', error);
      alert('Error downloading document');
    }
  };

  const deleteDeal = async (dealId) => {
    if (!window.confirm('Are you sure you want to delete this deal? This action cannot be undone.')) {
      return;
    }

    try {
      const API_BASE = process.env.REACT_APP_API_URL;
      const url = `${API_BASE}/api/deals/${dealId}`;
      console.log('[DEBUG][FinanceDashboard] Deleting deal via:', url);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: getAuthHeaders()
      });
      console.log('[DEBUG][FinanceDashboard] Delete deal response status:', response.status);

      if (response.ok) {
        // Refresh data
        fetchData();
        alert('Deal deleted successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete deal');
      }
    } catch (error) {
      console.error('[DEBUG][FinanceDashboard] Error deleting deal:', error);
      alert(`Error deleting deal: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      case 'sent_to_finance': return 'text-orange-400 bg-orange-500/20';
      case 'draft': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getDealTypeColor = (dealType) => {
    switch (dealType) {
      case 'retail': return 'text-blue-400 bg-blue-500/20';
      case 'wholesale': return 'text-purple-400 bg-purple-500/20';
      case 'consignment': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const filteredRecords = vehicleRecords.filter(record => {
    if (filters.status && record.status !== filters.status) return false;
    if (filters.dealType && record.dealType !== filters.dealType) return false;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        record.vin?.toLowerCase().includes(searchTerm) ||
        record.stockNumber?.toLowerCase().includes(searchTerm) ||
        record.recordId?.toLowerCase().includes(searchTerm) ||
        record.dealId?.vehicle?.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  // Compute filtered deals for the Submitted Deals section
  const filteredSubmittedDeals = submittedDeals.filter(deal => {
    // Status filter
    if (filters.status && deal.currentStage !== filters.status && deal.status !== filters.status) return false;
    // Deal type filter
    if (filters.dealType && deal.dealType !== filters.dealType) return false;
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const vehicle = (deal.vehicle || `${deal.year || ''} ${deal.make || ''} ${deal.model || ''}`).toLowerCase();
      const vin = (deal.vin || '').toLowerCase();
      const stock = (deal.rpStockNumber || deal.stockNumber || '').toLowerCase();
      if (!vehicle.includes(searchTerm) && !vin.includes(searchTerm) && !stock.includes(searchTerm)) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
      {/* Back Button */}
      <button className="mb-6 flex items-center text-blue-400 hover:text-blue-300 font-medium" onClick={() => navigate('/')}>
        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Finance Dashboard</h1>
        <p className="text-gray-400">Review and manage vehicle records and generated documents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl border border-blue-500/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-500/20 rounded-lg p-3 mr-4">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white mb-1">{stats.totalRecords || 0}</h4>
                <p className="text-gray-400 text-sm">Total Records</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-2xl border border-orange-500/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-orange-500/20 rounded-lg p-3 mr-4">
                <Clock className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white mb-1">{stats.pendingFinance || 0}</h4>
                <p className="text-gray-400 text-sm">Pending Review</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-2xl border border-green-500/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-green-500/20 rounded-lg p-3 mr-4">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white mb-1">{stats.approvedDocuments || 0}</h4>
                <p className="text-gray-400 text-sm">Approved</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-purple-500/20 rounded-lg p-3 mr-4">
                <Car className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white mb-1">{stats.draftDocuments || 0}</h4>
                <p className="text-gray-400 text-sm">Draft Documents</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Status</label>
            <select
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 w-full"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent_to_finance">Sent to Finance</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">Deal Type</label>
            <select
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 w-full"
              value={filters.dealType}
              onChange={e => setFilters(f => ({ ...f, dealType: e.target.value }))}
            >
              <option value="">All Deal Types</option>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="wholesale-d2d">Wholesale D2D</option>
              <option value="wholesale-pp">Wholesale PP</option>
              <option value="wholesale-flip">Wholesale Flip</option>
              <option value="retail-pp">Retail PP</option>
              <option value="retail-d2d">Retail D2D</option>
              <option value="consignment">Consignment</option>
              <option value="auction">Auction</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-gray-300 text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 w-full"
              placeholder="Search by VIN, Stock #, Vehicle, etc."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
        </div>
      </div>



      {/* Submitted Deals Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Submitted Deals</h2>
        {filteredSubmittedDeals.length === 0 ? (
          <div className="text-gray-400">No submitted deals found.</div>
        ) : (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Purchase ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Stock #</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">VIN</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                              {filteredSubmittedDeals.map(deal => (
                    <tr key={deal._id || deal.id} className="hover:bg-white/5">
                      <td className="px-6 py-6 whitespace-nowrap">
                  <div>
                          <div className="text-sm font-medium text-white">
                            {deal.vehicle || `${deal.year} ${deal.make} ${deal.model}`}
                          </div>
                          <div className="text-sm text-gray-400">
                            {deal.dealType} • {deal.dealType2SubType || deal.dealType2 || 'N/A'}
                          </div>
                  </div>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <span className="text-sm font-medium text-blue-400">{deal.rpStockNumber || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <span className="text-sm text-gray-300">{deal.stockNumber || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <span className="text-sm text-gray-300">{deal.vin || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <span className="text-sm font-medium text-white">${deal.purchasePrice?.toLocaleString() || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400`}>
                    {deal.currentStage || 'Unknown'}
                  </span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <span className="text-sm text-gray-300">{deal.assignedTo?.profile?.displayName || deal.assignedTo || 'Unassigned'}</span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                        <span className="text-sm text-gray-300">{deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </td>
                      <td className="px-6 py-6 whitespace-nowrap">
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate(`/finance/deals/${deal._id || deal.id}`)}
                            className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                            title="View Details"
                  >
                            <Eye className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => navigate(`/finance/deals/${deal._id || deal.id}/update-status`)}
                            className="text-green-400 hover:text-green-300 p-2 rounded-lg hover:bg-green-500/10 transition-colors"
                            title="Update Status"
                  >
                            <CheckCircle className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => deleteDeal(deal._id || deal.id)}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                    title="Delete Deal"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
          </div>
        )}
      </div>

      {/* Vehicle Records Table */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Vehicle Records</h2>
          <p className="text-gray-400 text-sm">Manage vehicle records and review generated documents</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Record ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">VIN</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Deal Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Documents</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredRecords.map((record) => (
                <tr key={record._id} className="hover:bg-white/5">
                  <td className="px-6 py-6 whitespace-nowrap">
                    <span className="text-sm font-medium text-white">{record.recordId}</span>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {record.year} {record.make} {record.model}
                      </div>
                      <div className="text-sm text-gray-400">Stock #{record.stockNumber}</div>
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{record.vin}</span>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getDealTypeColor(record.dealType)}`}>
                      {record.dealType}
                    </span>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="space-y-1">
                      {record.generatedDocuments?.map((doc, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                            {doc.documentType.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => downloadDocument(doc.fileName)}
                            className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-500/10 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap text-sm text-gray-300">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-6 whitespace-nowrap">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/10 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {record.generatedDocuments?.some(doc => doc.status === 'sent_to_finance') && (
                        <>
                          <button
                            onClick={() => {
                              const docIndex = record.generatedDocuments.findIndex(doc => doc.status === 'sent_to_finance');
                              handleStatusUpdate(record.recordId, docIndex, 'approved');
                            }}
                            className="text-green-400 hover:text-green-300 p-2 rounded-lg hover:bg-green-500/10 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              const docIndex = record.generatedDocuments.findIndex(doc => doc.status === 'sent_to_finance');
                              handleStatusUpdate(record.recordId, docIndex, 'rejected');
                            }}
                            className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {record.dealId && (
                        <button
                          onClick={() => deleteDeal(record.dealId)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Delete Deal"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No vehicle records found</p>
          </div>
        )}
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Vehicle Record Details</h3>
                <div className="flex items-center space-x-2">
                  {selectedRecord.dealId && (
                    <button
                      onClick={() => {
                        deleteDeal(selectedRecord.dealId);
                        setSelectedRecord(null);
                      }}
                      className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/20"
                      title="Delete Deal"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Vehicle Information</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Record ID:</span>
                      <p className="text-white">{selectedRecord.recordId}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Vehicle:</span>
                      <p className="text-white">{selectedRecord.year} {selectedRecord.make} {selectedRecord.model}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">VIN:</span>
                      <p className="text-white">{selectedRecord.vin}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Stock Number:</span>
                      <p className="text-white">{selectedRecord.stockNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Color:</span>
                      <p className="text-white">{selectedRecord.color || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Mileage:</span>
                      <p className="text-white">{selectedRecord.mileage?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Deal Information</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Deal Type:</span>
                      <p className="text-white">{selectedRecord.dealType}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Deal Type 2:</span>
                      <p className="text-white">{selectedRecord.dealType2}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Purchase Price:</span>
                      <p className="text-white">${selectedRecord.purchasePrice?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">List Price:</span>
                      <p className="text-white">${selectedRecord.listPrice?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Commission Rate:</span>
                      <p className="text-white">{selectedRecord.commission?.rate || 'N/A'}%</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Commission Amount:</span>
                      <p className="text-white">${selectedRecord.commission?.amount?.toLocaleString() || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h4 className="text-lg font-semibold text-white mb-4">Generated Documents</h4>
                <div className="space-y-4">
                  {selectedRecord.generatedDocuments?.map((doc, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-white font-medium">{doc.documentType.replace('_', ' ')}</h5>
                          <p className="text-gray-400 text-sm">Document #: {doc.documentNumber}</p>
                          <p className="text-gray-400 text-sm">Generated: {new Date(doc.generatedAt).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(doc.status)}`}>
                            {doc.status.replace('_', ' ')}
                          </span>
                          <button
                            onClick={() => downloadDocument(doc.fileName)}
                            className="text-blue-400 hover:text-blue-300"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {doc.status === 'sent_to_finance' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(selectedRecord.recordId, index, 'approved')}
                                className="text-green-400 hover:text-green-300"
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(selectedRecord.recordId, index, 'rejected')}
                                className="text-red-400 hover:text-red-300"
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDashboard; 