import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Edit3,
  Save,
  X,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Shield,
  TrendingUp,
  Filter,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Archive,
  Eye,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

const FinanceStatusDashboard = () => {
  const navigate = useNavigate();
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDealType, setFilterDealType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDeal, setEditingDeal] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.REACT_APP_API_URL;

  // Deal status workflow stages
  const dealStages = {
    wholesale: [
      { id: 'contract_received', label: 'Contract Received', description: 'Initial paperwork received' },
      { id: 'title_processing', label: 'Title Processing', description: 'Title documentation in progress' },
      { id: 'payment_approved', label: 'Payment Approved', description: 'Payment authorization completed' },
      { id: 'funds_disbursed', label: 'Funds Disbursed', description: 'Payment sent to seller' },
      { id: 'title_received', label: 'Title Received', description: 'Clean title in hand' },
      { id: 'deal_complete', label: 'Deal Complete', description: 'All documentation finalized' }
    ],
    retail: [
      { id: 'vehicle_acquired', label: 'Vehicle Acquired', description: 'Vehicle purchased and in inventory' },
      { id: 'title_processing', label: 'Title Processing', description: 'Title work in progress' },
      { id: 'inspection_complete', label: 'Inspection Complete', description: 'Vehicle inspection finalized' },
      { id: 'photos_complete', label: 'Photos Complete', description: 'Professional photos taken' },
      { id: 'listing_ready', label: 'Ready to List', description: 'Vehicle ready for sale' },
      { id: 'listed_active', label: 'Listed & Active', description: 'Vehicle actively marketed' },
      { id: 'buyer_contract', label: 'Buyer Contract', description: 'Sale contract executed' },
      { id: 'financing_approved', label: 'Financing Approved', description: 'Buyer financing completed' },
      { id: 'delivery_scheduled', label: 'Delivery Scheduled', description: 'Delivery appointment set' },
      { id: 'deal_complete', label: 'Deal Complete', description: 'Vehicle delivered, payment received' }
    ],
    auction: [
      { id: 'vehicle_acquired', label: 'Vehicle Acquired', description: 'Won at auction' },
      { id: 'transport_arranged', label: 'Transport Arranged', description: 'Shipping scheduled' },
      { id: 'vehicle_arrived', label: 'Vehicle Arrived', description: 'Vehicle delivered to RP' },
      { id: 'title_processing', label: 'Title Processing', description: 'Title documentation' },
      { id: 'inspection_complete', label: 'Inspection Complete', description: 'Condition verified' },
      { id: 'ready_for_sale', label: 'Ready for Sale', description: 'Ready to list or wholesale' },
      { id: 'deal_complete', label: 'Deal Complete', description: 'Final sale completed' }
    ]
  };

  // Fetch deals from backend
  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const token = window.localStorage.getItem('token');
      const response = await fetch(`/api/deals`, {
        credentials: 'include',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }
      
      const data = await response.json();
      const dealsData = data.deals || data.data || [];
      
      // Transform backend data to match frontend format
      const transformedDeals = dealsData.map(deal => ({
        id: deal._id || deal.id,
        stockNumber: deal.rpStockNumber || deal.stockNumber,
        vin: deal.vin,
        vehicle: `${deal.year || ''} ${deal.make || ''} ${deal.model || ''}`.trim(),
        dealType: deal.dealType || 'wholesale',
        currentStage: deal.currentStage || 'contract_received',
        seller: deal.seller?.name || 'Unknown',
        buyerContact: deal.buyer?.name || 'Pending',
        purchasePrice: deal.purchasePrice || 0,
        salePrice: deal.listPrice || deal.salePrice || 0,
        payoffBalance: deal.payoffBalance || 0,
        createdDate: new Date(deal.createdAt || deal.createdDate).toISOString().split('T')[0],
        lastUpdated: new Date(deal.updatedAt || deal.lastUpdated).toISOString().split('T')[0],
        priority: deal.priority || 'medium',
        notes: deal.notes || deal.generalNotes || '',
        paymentMethod: deal.paymentMethod || 'Check',
        requiresContract: true,
        documentation: {
          contract: { status: 'received', date: deal.createdDate },
          title: { status: deal.titleInfo?.status === 'clean' ? 'received' : 'pending', date: deal.titleInfo?.titleReceivedDate },
          odometer: { status: 'pending', date: null },
          paymentApproval: { status: 'approved', date: deal.createdDate }
        },
        titleInfo: deal.titleInfo || {},
        wholesalePrice: deal.wholesalePrice || null, // Added for wholesale-flip deals
      }));
      
      setDeals(transformedDeals);
    } catch (error) {
      console.error('Error fetching deals:', error);
      // Fallback to sample data if API fails
      setDeals([
        {
          id: 1,
          stockNumber: 'RP2025001',
          vin: 'SBM14FCA4LW004366',
          vehicle: '2020 McLaren 720S',
          dealType: 'wholesale',
          currentStage: 'payment_approved',
          seller: 'Ian Hutchinson',
          buyerContact: 'P Gelber',
          purchasePrice: 220000,
          salePrice: 244995,
          payoffBalance: 226000,
          createdDate: '2025-07-11',
          lastUpdated: '2025-07-11',
          priority: 'high',
          notes: 'Car is here at RP on consignment. All docs printed and turned in to Tammie.',
          paymentMethod: 'Check',
          requiresContract: true,
          documentation: {
            contract: { status: 'received', date: '2025-07-11' },
            title: { status: 'pending', date: null },
            odometer: { status: 'pending', date: null },
            paymentApproval: { status: 'approved', date: '2025-07-11' }
          },
          titleInfo: {},
          wholesalePrice: 230000 // Added for sample data
        },
        {
          id: 2,
          stockNumber: 'RP2025002',
          vin: '1HGBH41JXMN109186',
          vehicle: '2019 Ferrari F8 Tributo',
          dealType: 'retail',
          currentStage: 'title_processing',
          seller: 'Midwest Auto Group',
          buyerContact: 'Pending',
          purchasePrice: 285000,
          salePrice: 315000,
          payoffBalance: 0,
          createdDate: '2025-07-10',
          lastUpdated: '2025-07-11',
          priority: 'medium',
          notes: 'Waiting on title from previous owner. Expected next week.',
          paymentMethod: 'Wire Transfer',
          requiresContract: true,
          documentation: {
            contract: { status: 'received', date: '2025-07-10' },
            title: { status: 'pending', date: null },
            odometer: { status: 'received', date: '2025-07-10' },
            paymentApproval: { status: 'approved', date: '2025-07-10' }
          },
          titleInfo: {},
          wholesalePrice: null // Added for sample data
        },
        {
          id: 3,
          stockNumber: 'RP2025003',
          vin: '1G1RC6E3XD0109186',
          vehicle: '2020 Toyota Camry',
          dealType: 'wholesale-flip',
          currentStage: 'title_processing',
          seller: 'Local Dealer',
          buyerContact: 'Pending',
          purchasePrice: 180000,
          salePrice: 200000,
          payoffBalance: 185000,
          createdDate: '2025-07-09',
          lastUpdated: '2025-07-09',
          priority: 'high',
          notes: 'Car is in good condition. Need to verify title and odometer.',
          paymentMethod: 'Cash',
          requiresContract: false,
          documentation: {
            contract: { status: 'received', date: '2025-07-09' },
            title: { status: 'pending', date: null },
            odometer: { status: 'pending', date: null },
            paymentApproval: { status: 'approved', date: '2025-07-09' }
          },
          titleInfo: {},
          wholesalePrice: 195000 // Added for sample data
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStageInfo = (dealType, currentStage) => {
    const stages = dealStages[dealType] || dealStages.wholesale;
    return stages.find(stage => stage.id === currentStage) || stages[0];
  };

  const getStageProgress = (dealType, currentStage) => {
    const stages = dealStages[dealType] || dealStages.wholesale;
    const currentIndex = stages.findIndex(stage => stage.id === currentStage);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  const getStatusColor = (stage) => {
    const colorMap = {
      'contract_received': 'blue',
      'vehicle_acquired': 'blue',
      'title_processing': 'orange',
      'payment_approved': 'green',
      'inspection_complete': 'green',
      'listing_ready': 'purple',
      'deal_complete': 'green',
      'transport_arranged': 'orange',
      'funds_disbursed': 'green'
    };
    return colorMap[stage] || 'gray';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    return colors[priority] || 'gray';
  };

  const updateDealStatus = async (dealId, newStage, notes = '', lienStatus, lienEta) => {
    try {
      const token = window.localStorage.getItem('token');
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          currentStage: newStage,
          notes: notes,
          updatedAt: new Date(),
          // Only send lien fields if present
          ...(lienStatus && newStage === 'title_processing' ? { lienStatus } : {}),
          ...(lienEta && newStage === 'title_processing' ? { lienEta } : {}),
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to update deal status');
      }

      // Update local state
      setDeals(deals.map(deal => 
        deal.id === dealId 
          ? { 
              ...deal, 
              currentStage: newStage, 
              lastUpdated: new Date().toISOString().split('T')[0],
              notes: notes || deal.notes,
              titleInfo: {
                ...deal.titleInfo,
                lienStatus: lienStatus || deal.titleInfo?.lienStatus,
                lienEta: lienEta || deal.titleInfo?.lienEta
              }
            }
          : deal
      ));
      setEditingDeal(null);
    } catch (error) {
      console.error('Error updating deal status:', error);
      alert('Failed to update deal status. Please try again.');
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesStatus = filterStatus === 'all' || deal.currentStage === filterStatus;
    const matchesDealType = filterDealType === 'all' || deal.dealType === filterDealType;
    const matchesSearch = searchTerm === '' || 
      deal.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.stockNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.seller.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesDealType && matchesSearch;
  });

  const StatusUpdateModal = ({ deal, onClose, onUpdate }) => {
    const [selectedStage, setSelectedStage] = useState(deal.currentStage);
    const [notes, setNotes] = useState(deal.notes);
    const [lienStatus, setLienStatus] = useState(deal.titleInfo?.lienStatus || 'none');
    const [lienEta, setLienEta] = useState(deal.titleInfo?.lienEta ? new Date(deal.titleInfo.lienEta).toISOString().split('T')[0] : '');
    
    const stages = dealStages[deal.dealType] || dealStages.wholesale;
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Update Deal Status</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{deal.vehicle}</span>
                <span className="text-gray-400 text-sm">Stock #{deal.stockNumber}</span>
              </div>
              <div className="text-gray-300 text-sm">
                Seller: {deal.seller} • Deal Type: {deal.dealType.charAt(0).toUpperCase() + deal.dealType.slice(1)}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-white font-medium mb-3">Current Progress</label>
            <div className="space-y-3">
              {stages.map((stage, index) => {
                const isActive = stage.id === deal.currentStage;
                const isPast = stages.findIndex(s => s.id === deal.currentStage) > index;
                const isSelected = stage.id === selectedStage;
                
                return (
                  <div 
                    key={stage.id}
                    onClick={() => setSelectedStage(stage.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-blue-500/20 border-blue-500/50' 
                        : isPast 
                          ? 'bg-green-500/10 border-green-500/30'
                          : isActive
                            ? 'bg-orange-500/10 border-orange-500/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {isPast ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : isActive ? (
                          <Clock className="h-5 w-5 text-orange-400" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-gray-500" />
                        )}
                        <div>
                          <p className="text-white font-medium">{stage.label}</p>
                          <p className="text-gray-400 text-sm">{stage.description}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="bg-blue-500 rounded-full p-1">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editable Lien Info for Retail PP Buy in Title Processing */}
          {deal.dealType === 'retail-pp' && selectedStage === 'title_processing' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <h4 className="text-blue-300 font-semibold mb-2 flex items-center"><Shield className="h-4 w-4 mr-2 text-blue-400" />Lien on Title</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-gray-300 text-sm">Lien Status</span>
                  <select
                    value={lienStatus}
                    onChange={e => setLienStatus(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="payoff_requested">Payoff Requested</option>
                    <option value="payoff_received">Payoff Received</option>
                    <option value="lien_release_pending">Release Pending</option>
                    <option value="lien_released">Lien Released</option>
                  </select>
                </div>
                <div>
                  <span className="text-gray-300 text-sm">ETA to Lien Release</span>
                  <input
                    type="date"
                    value={lienEta}
                    onChange={e => setLienEta(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-white font-medium mb-3">Update Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Add notes about this status update..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onUpdate(deal.id, selectedStage, notes, lienStatus, lienEta)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Update Status</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white text-lg">Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Finance Status Dashboard</h1>
                <p className="text-gray-300">Track and update deal progression through the pipeline</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={fetchDeals}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filterDealType}
              onChange={(e) => setFilterDealType(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Deal Types</option>
              <option value="wholesale">Wholesale</option>
              <option value="retail">Retail</option>
              <option value="auction">Auction</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="contract_received">Contract Received</option>
              <option value="title_processing">Title Processing</option>
              <option value="payment_approved">Payment Approved</option>
              <option value="listing_ready">Ready to List</option>
              <option value="deal_complete">Complete</option>
            </select>

            <div className="text-white text-sm flex items-center">
              <span className="text-gray-400">Showing:</span>
              <span className="ml-2 font-medium">{filteredDeals.length} deals</span>
            </div>
          </div>
        </div>

        {/* Deals Grid */}
        <div className="space-y-4">
          {filteredDeals.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white text-lg font-medium mb-2">No deals found</h3>
                <p className="text-gray-400">Try adjusting your filters or search terms.</p>
              </div>
            </div>
          ) : (
            filteredDeals.map((deal) => {
              const stageInfo = getStageInfo(deal.dealType, deal.currentStage);
              const progress = getStageProgress(deal.dealType, deal.currentStage);
              const statusColor = getStatusColor(deal.currentStage);
              const priorityColor = getPriorityColor(deal.priority);

              return (
                <div key={deal.id} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-3">
                        <Car className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-xl font-bold text-white">{deal.vehicle}</h3>
                          <span className="bg-gray-500/20 text-gray-400 text-xs font-medium px-2 py-1 rounded-full">
                            {deal.dealType.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-gray-300 text-sm">
                          <span>Stock #{deal.stockNumber}</span>
                          <span>•</span>
                          <span>{deal.seller}</span>
                          <span>•</span>
                          <span>Created: {deal.createdDate}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setEditingDeal(deal)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span>Update Status</span>
                      </button>
                    </div>
                  </div>

                  {/* Status Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Progress</span>
                      <div className="flex items-center space-x-2">
                        <span className={`bg-${statusColor}-500/20 text-${statusColor}-400 text-xs font-medium px-2 py-1 rounded-full`}>
                          {stageInfo.label}
                        </span>
                        <span className="text-gray-400 text-xs">{Math.round(progress)}% Complete</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`bg-gradient-to-r from-${statusColor}-500 to-${statusColor}-400 h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Deal Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Purchase Price</span>
                        <DollarSign className="h-4 w-4 text-green-400" />
                      </div>
                      <p className="text-white font-bold text-lg">${deal.purchasePrice.toLocaleString()}</p>
                    </div>

                    {deal.dealType === 'wholesale-flip' ? (
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Wholesale Price</span>
                          <TrendingUp className="h-4 w-4 text-blue-400" />
                        </div>
                        <p className="text-white font-bold text-lg">${deal.wholesalePrice?.toLocaleString() || 'N/A'}</p>
                      </div>
                    ) : (
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">List Price</span>
                          <TrendingUp className="h-4 w-4 text-blue-400" />
                        </div>
                        <p className="text-white font-bold text-lg">${deal.salePrice.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Documentation Status */}
                  <div className="mb-4">
                    <h4 className="text-white font-medium mb-3">Documentation Status</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(deal.documentation).map(([doc, info]) => (
                        <div key={doc} className="flex items-center space-x-2">
                          {info.status === 'received' || info.status === 'approved' ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : info.status === 'pending' ? (
                            <Clock className="h-4 w-4 text-orange-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className="text-gray-300 text-sm capitalize">
                            {doc.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lien Info Card for Retail PP Buy Deals in Title Processing */}
                  {deal.dealType === 'retail-pp' && deal.currentStage === 'title_processing' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                      <h4 className="text-blue-300 font-semibold mb-2 flex items-center"><Shield className="h-4 w-4 mr-2 text-blue-400" />Lien on Title</h4>
                      {/* Lien Sub-Status Stepper */}
                      <div className="flex items-center justify-between mb-4 mt-2">
                        {['payoff_requested', 'payoff_received', 'lien_release_pending', 'lien_released'].map((status, idx, arr) => {
                          const statusLabels = {
                            payoff_requested: 'Payoff Requested',
                            payoff_received: 'Payoff Received',
                            lien_release_pending: 'Release Pending',
                            lien_released: 'Lien Released'
                          };
                          const isActive = deal.titleInfo?.lienStatus === status;
                          const isCompleted = arr.indexOf(deal.titleInfo?.lienStatus) > idx;
                          return (
                            <React.Fragment key={status}>
                              <div className="flex flex-col items-center">
                                <div className={`rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm mb-1 transition-all duration-200 ${isActive ? 'bg-blue-500 text-white shadow-lg scale-110' : isCompleted ? 'bg-green-400 text-white' : 'bg-gray-400 text-white/70'}`}>{idx + 1}</div>
                                <span className={`text-xs font-medium ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-400'}`}>{statusLabels[status]}</span>
                              </div>
                              {idx < arr.length - 1 && (
                                <div className={`flex-1 h-1 mx-1 md:mx-2 rounded-full ${isCompleted ? 'bg-green-400' : isActive ? 'bg-blue-400' : 'bg-gray-400/40'}`}></div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-gray-300 text-sm">Lien Holder</span>
                          <div className="text-white font-bold text-base">{deal.titleInfo?.lienHolder || 'None'}</div>
                        </div>
                        <div>
                          <span className="text-gray-300 text-sm">Lien Status</span>
                          <div className="text-white font-bold text-base capitalize">{deal.titleInfo?.lienStatus?.replace(/_/g, ' ') || 'None'}</div>
                        </div>
                        <div>
                          <span className="text-gray-300 text-sm">ETA to Lien Release</span>
                          <div className="text-white font-bold text-base">{deal.titleInfo?.lienEta ? new Date(deal.titleInfo.lienEta).toLocaleDateString() : 'TBD'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {deal.notes && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <p className="text-orange-300 text-sm">{deal.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Status Update Modal */}
        {editingDeal && (
          <StatusUpdateModal
            deal={editingDeal}
            onClose={() => setEditingDeal(null)}
            onUpdate={updateDealStatus}
          />
        )}
      </div>
    </div>
  );
};

export default FinanceStatusDashboard; 