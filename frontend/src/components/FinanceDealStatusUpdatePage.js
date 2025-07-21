import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, X, Save, Shield } from 'lucide-react';

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

export default function FinanceDealStatusUpdatePage() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [selectedStage, setSelectedStage] = useState('');
  const [notes, setNotes] = useState('');
  const [lienStatus, setLienStatus] = useState('none');
  const [lienEta, setLienEta] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDeal() {
      setLoading(true);
      try {
        const token = window.localStorage.getItem('token');
        const res = await fetch(`/api/deals/${dealId}`, {
          credentials: 'include',
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (!res.ok) throw new Error('Deal not found');
        const data = await res.json();
        const d = data.deal || data.data || data;
        setDeal(d);
        setSelectedStage(d.currentStage || 'contract_received');
        setNotes(d.notes || d.generalNotes || '');
        setLienStatus(d.titleInfo?.lienStatus || 'none');
        setLienEta(d.titleInfo?.lienEta ? new Date(d.titleInfo.lienEta).toISOString().split('T')[0] : '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDeal();
  }, [dealId]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const token = window.localStorage.getItem('token');
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStage: selectedStage,
          notes,
          updatedAt: new Date(),
          ...(deal.dealType === 'retail-pp' && selectedStage === 'title_processing' ? { lienStatus, lienEta } : {})
        })
      });
      if (!res.ok) throw new Error('Failed to update deal status');
      navigate('/finance/deals');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-400">{error}</div>;
  if (!deal) return null;

  // Debug: log seller info
  console.log('[UpdateStatusPage] deal.seller:', deal.seller);
  console.log('[UpdateStatusPage] deal.seller?.type:', deal.seller?.type);

  const stages = dealStages[deal.dealType] || dealStages.wholesale;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-8">
      <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Update Deal Status</h3>
          <button onClick={() => navigate('/finance/deals')} className="text-gray-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
        </div>
        <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">{deal.vehicle || `${deal.year} ${deal.make} ${deal.model}`}</span>
            <span className="text-gray-400 text-sm">Stock #{deal.rpStockNumber || deal.stockNumber || 'N/A'}</span>
          </div>
          <div className="text-gray-300 text-sm">Seller: {deal.seller?.name || deal.seller || 'Unknown'} • Deal Type: {deal.dealType?.replace('-', ' ').toUpperCase()}</div>
        </div>
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">Current Progress</label>
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const isSelected = stage.id === selectedStage;
              const isActive = isSelected;
              const isPast = stages.findIndex(s => s.id === selectedStage) > index;
              return (
                <div key={stage.id} onClick={() => setSelectedStage(stage.id)} className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : isPast ? 'bg-green-500/10 border-green-500/30' : stage.id === deal.currentStage ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isPast ? <CheckCircle className="h-5 w-5 text-green-400" /> : isActive ? <Clock className="h-5 w-5 text-blue-400" /> : stage.id === deal.currentStage ? <Clock className="h-5 w-5 text-orange-400" /> : <div className="h-5 w-5 rounded-full border border-gray-500" />}
                      <div>
                        <p className="text-white font-medium">{stage.label}</p>
                        <p className="text-gray-400 text-sm">{stage.description}</p>
                      </div>
                    </div>
                    {isSelected && <div className="bg-blue-500 rounded-full p-1"><CheckCircle className="h-4 w-4 text-white" /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Editable Lien Info for Retail PP Buy in Title Processing, or Wholesale Flip with Private Seller */}
        {((deal.dealType === 'retail-pp') || (deal.dealType === 'wholesale-flip' && typeof deal.seller?.type === 'string' && deal.seller.type.toLowerCase() === 'private')) && selectedStage === 'title_processing' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
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
                const isActive = lienStatus === status;
                const isCompleted = arr.indexOf(lienStatus) > idx;
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
                <span className="text-gray-300 text-sm">Lien Status</span>
                <select value={lienStatus} onChange={e => setLienStatus(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="payoff_requested">Payoff Requested</option>
                  <option value="payoff_received">Payoff Received</option>
                  <option value="lien_release_pending">Release Pending</option>
                  <option value="lien_released">Lien Released</option>
                </select>
              </div>
              <div>
                <span className="text-gray-300 text-sm">ETA to Lien Release</span>
                <input type="date" value={lienEta} onChange={e => setLienEta(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        )}
        {/* Show warning if wholesale-flip and seller type is missing */}
        {deal.dealType === 'wholesale-flip' && selectedStage === 'title_processing' && !deal.seller?.type && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-yellow-300">
            <strong>Warning:</strong> Seller type is missing for this deal. Lien sub-status will only show if seller type is set to 'private'.
          </div>
        )}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">Update Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={4} placeholder="Add notes about this status update..." />
        </div>
        <div className="flex items-center justify-end space-x-3">
          <button onClick={() => navigate('/finance/deals')} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">Cancel</button>
          <button onClick={handleUpdate} disabled={saving} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50">
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Update Status'}</span>
          </button>
        </div>
      </div>
    </div>
  );
} 