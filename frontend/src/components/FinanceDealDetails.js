import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './AuthContext';

const FinanceDealDetails = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);


  const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';

  // Add this helper function near the top of the file
  function getDocumentUrl(doc, API_BASE) {
    if (!doc) return '';
    // If filePath is absolute, extract the filename and build the web path
    if (doc.filePath && doc.filePath.startsWith('/uploads/')) {
      return `${API_BASE}${doc.filePath}`;
    }
    if (doc.filePath && doc.filePath.includes('/uploads/documents/')) {
      // Handles both absolute and relative
      const idx = doc.filePath.indexOf('/uploads/documents/');
      return `${API_BASE}${doc.filePath.slice(idx)}`;
    }
    if (doc.filePath && (doc.filePath.includes('Desktop') || doc.filePath.includes('rp-exotics-unified'))) {
      // Extract filename from absolute path
      const fileName = doc.fileName || doc.filePath.split('/').pop();
      return `${API_BASE}/uploads/documents/${fileName}`;
    }
    if (doc.downloadUrl) return doc.downloadUrl;
    if (doc.fileName) return `${API_BASE}/api/documents/download/${doc.fileName}`;
    return '';
  }

  useEffect(() => {
    setLoading(true);
    const headers = { ...getAuthHeaders() };
    fetch(`${API_BASE ? API_BASE : ''}/api/backoffice/deals/${dealId}`, {
      credentials: 'include',
      headers
    })
      .then(res => {
        if (!res.ok) throw new Error('Deal not found');
        return res.json();
      })
      .then(async data => {
        const deal = data.deal || data.data || data;
        const dealDocs = (data.deal && data.deal.documents) ? data.deal.documents : [];
        const vehicleDocs = Array.isArray(data.vehicleRecordDocuments) ? data.vehicleRecordDocuments : [];
        console.log('[FinanceDealDetails] Deal documents:', dealDocs);
        console.log('[FinanceDealDetails] Vehicle record documents:', vehicleDocs);
        // Merge, avoiding duplicates by fileName, and only show current (latest) documents
        let allDocs = [...dealDocs];
        const vehicleDocFileNames = new Set(vehicleDocs.map(d => d.fileName));
        vehicleDocs.forEach(doc => {
          if (!allDocs.some(d => d.fileName === doc.fileName)) allDocs.push(doc);
        });
        // Filter out any docs whose fileName is not in the current vehicleDocs (for generated docs)
        allDocs = allDocs.filter(doc => {
          // Always show extra_doc (uploaded) files
          if (doc.type === 'extra_doc' || doc.documentType === 'extra_doc') return true;
          // For generated docs, only show if present in vehicleDocs
          return vehicleDocFileNames.has(doc.fileName);
        });
        console.log('[FinanceDealDetails] Filtered document list:', allDocs);
        setDeal(deal);
        setDocuments(prev => {
          if (allDocs.length === 0) {
            console.warn('[FinanceDealDetails] setDocuments called with empty array!');
          } else {
            console.log('[FinanceDealDetails] setDocuments called with:', allDocs);
          }
          return allDocs;
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [dealId]);

  useEffect(() => {
    console.log('[FinanceDealDetails] documents state changed:', documents);
  }, [documents]);



  const handleEditToggle = () => {
    if (!isEditing) {
      // Helper function to join address parts
      const joinAddress = (address) => {
        if (!address) return '';
        const { street, city, state, zip } = address;
        return [street, city, state, zip].filter(Boolean).join(', ');
      };

      // Initialize edit data with current deal values
      setEditData({
        'seller.name': deal.seller?.name || '',
        'seller.licenseNumber': deal.seller?.licenseNumber || '',
        'seller.contact.phone': deal.seller?.contact?.phone || deal.seller?.phone || '',
        'seller.contact.email': deal.seller?.contact?.email || deal.seller?.email || '',
        'seller.contact.address': joinAddress(deal.seller?.contact?.address || deal.seller?.address),
        'buyer.name': deal.buyer?.name || '',
        'buyer.company': deal.buyer?.company || '',
        'buyer.licenseNumber': deal.buyer?.licenseNumber || '',
        'buyer.contact.phone': deal.buyer?.contact?.phone || deal.buyer?.phone || '',
        'buyer.contact.email': deal.buyer?.contact?.email || deal.buyer?.email || '',
        'buyer.contact.address': joinAddress(deal.buyer?.contact?.address || deal.buyer?.address),
        'buyer.tier': deal.buyer?.tier || '',
        purchasePrice: deal.purchasePrice || '',
        listPrice: deal.listPrice || '',
        killPrice: deal.killPrice || '',
        mileage: deal.mileage || '',
        color: deal.color || '',
        exteriorColor: deal.exteriorColor || '',
        interiorColor: deal.interiorColor || '',
        rpStockNumber: deal.rpStockNumber || '',
        notes: deal.notes || '',
        generalNotes: deal.generalNotes || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      
      // Always include regenerateDocuments flag
      const updateData = {
        ...editData,
        regenerateDocuments: true
      };
      
      const response = await fetch(`${API_BASE}/api/backoffice/deals/${dealId}/update-and-regenerate`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        // Try to parse and show backend error message
        let errorMsg = 'Failed to update deal';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || JSON.stringify(errorData);
        } catch (parseErr) {
          // fallback to status text if JSON parse fails
          errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      // Clear documents state before fetching new data
      setDocuments([]);
      // Refresh the deal data
      const dealHeaders = { ...getAuthHeaders() };
      const dealResponse = await fetch(`${API_BASE}/api/backoffice/deals/${dealId}`, {
        credentials: 'include',
        headers: dealHeaders
      });
      
      if (dealResponse.ok) {
        const data = await dealResponse.json();
        const deal = data.deal || data.data || data;
        const dealDocs = (data.deal && data.deal.documents) ? data.deal.documents : [];
        const vehicleDocs = Array.isArray(data.vehicleRecordDocuments) ? data.vehicleRecordDocuments : [];
        
        let allDocs = [...dealDocs];
        const existingNames = new Set(allDocs.map(d => d.fileName));
        vehicleDocs.forEach(doc => {
          if (!existingNames.has(doc.fileName)) allDocs.push(doc);
        });
        
        setDeal(deal);
        setDocuments(allDocs);
      }

      setIsEditing(false);
      
      // Show toast notification after closing the edit form
      toast.success('Deal updated and documents regenerated successfully!', { position: 'bottom-right' });
    } catch (error) {
      console.error('Error updating deal:', error);
      // Try to extract a more detailed error message from the backend
      if (error.response) {
        // If using fetch, error.response may not exist, so try to parse error from response
        try {
          const errorData = await error.response.json();
          toast.error('Error updating deal: ' + (errorData.message || JSON.stringify(errorData)), { position: 'bottom-right' });
        } catch (parseErr) {
          toast.error('Error updating deal: ' + error.message, { position: 'bottom-right' });
        }
      } else if (error instanceof Response) {
        // If error is a Response object (fetch error)
        try {
          const errorData = await error.json();
          toast.error('Error updating deal: ' + (errorData.message || JSON.stringify(errorData)), { position: 'bottom-right' });
        } catch (parseErr) {
          toast.error('Error updating deal: ' + error.statusText, { position: 'bottom-right' });
        }
      } else {
        // Try to extract error message from fetch response if available
        if (error && error.message && error.message.startsWith('Failed to update deal')) {
          // Try to get more info from the response body
          try {
            const response = error.response || error;
            if (response && response.json) {
              const errorData = await response.json();
              toast.error('Error updating deal: ' + (errorData.message || JSON.stringify(errorData)), { position: 'bottom-right' });
            } else {
              toast.error('Error updating deal: ' + error.message, { position: 'bottom-right' });
            }
          } catch (parseErr) {
            toast.error('Error updating deal: ' + error.message, { position: 'bottom-right' });
          }
        } else {
          toast.error('Error updating deal: ' + error.message, { position: 'bottom-right' });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (doc) => {
    console.log('handleDownload called with doc:', doc);
    let downloadUrl;
    
    // For extra_doc files (uploaded documents), use the backoffice endpoint
    if (doc.type === 'extra_doc') {
      // Use documentId if available (new format), otherwise use type (old format)
      const identifier = doc.documentId || doc.type;
      downloadUrl = `${API_BASE}/api/backoffice/deals/${dealId}/documents/${identifier}/download`;
      console.log('extra_doc download URL:', downloadUrl);
      
      // For extra_doc files, use fetch with credentials since they require authentication
      try {
        const response = await fetch(downloadUrl, { credentials: 'include' });
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = doc.fileName || doc.name;
          document.body.appendChild(link);
          link.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(link);
        } else {
          throw new Error('Failed to download document');
        }
      } catch (error) {
        console.error('Error downloading document:', error);
        alert('Error downloading document');
      }
    } else {
      // For generated documents, use the documents endpoint with filename
      downloadUrl = `${API_BASE}/api/documents/download/${doc.fileName || doc.name}`;
      console.log('generated document download URL:', downloadUrl);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.fileName || doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleView = (doc) => {
    console.log('handleView called with doc:', doc);
    let viewUrl;
    
    // For extra_doc files (uploaded documents), use the backoffice endpoint
    if (doc.type === 'extra_doc') {
      // Use documentId if available (new format), otherwise use type (old format)
      const identifier = doc.documentId || doc.type;
      viewUrl = `${API_BASE}/api/backoffice/deals/${dealId}/documents/${identifier}/download`;
      console.log('extra_doc view URL:', viewUrl);
      
      // Navigate to the route without fileName for extra_doc files
      const navigateUrl = `/deals/${dealId}/documents/view`;
      console.log('Navigating to:', navigateUrl);
      navigate(navigateUrl, { 
        state: { viewUrl } 
      });
    } else {
      // For generated documents, use the documents endpoint with filename
      viewUrl = `${API_BASE}/api/documents/download/${doc.fileName || doc.name}`;
      console.log('generated document view URL:', viewUrl);
      
      const navigateUrl = `/deals/${dealId}/documents/${encodeURIComponent(doc.fileName || doc.name)}/view`;
      console.log('Navigating to:', navigateUrl);
      navigate(navigateUrl, { 
        state: { viewUrl } 
      });
    }
  };

  const renderEditForm = () => {
    if (!isEditing) return null;

    return (
      <div className="bg-white/10 rounded-xl p-6 border border-white/20 mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Edit Deal Information</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seller Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Seller Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Seller Name</label>
              <input
                type="text"
                value={editData['seller.name'] || ''}
                onChange={(e) => handleInputChange('seller.name', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seller name"
              />
            </div>

            {/* Only show license number for non-retail-pp deals */}
            {deal?.dealType !== 'retail-pp' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">License Number</label>
                <input
                  type="text"
                  value={editData['seller.licenseNumber'] || ''}
                  onChange={(e) => handleInputChange('seller.licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dealer license number"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={editData['seller.contact.phone'] || ''}
                onChange={(e) => handleInputChange('seller.contact.phone', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={editData['seller.contact.email'] || ''}
                onChange={(e) => handleInputChange('seller.contact.email', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
              <input
                type="text"
                value={editData['seller.contact.address'] || ''}
                onChange={(e) => handleInputChange('seller.contact.address', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full address (street, city, state, zip)"
              />
            </div>
          </div>

          {/* Buyer Information - Show for wholesale-flip and wholesale-d2d deals */}
          {(deal?.dealType === 'wholesale-flip' || deal?.dealType === 'wholesale-d2d') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Buyer Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Buyer Name</label>
                <input
                  type="text"
                  value={editData['buyer.name'] || ''}
                  onChange={(e) => handleInputChange('buyer.name', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Buyer/dealer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
                <input
                  type="text"
                  value={editData['buyer.company'] || ''}
                  onChange={(e) => handleInputChange('buyer.company', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">License Number</label>
                <input
                  type="text"
                  value={editData['buyer.licenseNumber'] || ''}
                  onChange={(e) => handleInputChange('buyer.licenseNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dealer license number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editData['buyer.contact.phone'] || ''}
                  onChange={(e) => handleInputChange('buyer.contact.phone', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editData['buyer.contact.email'] || ''}
                  onChange={(e) => handleInputChange('buyer.contact.email', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={editData['buyer.contact.address'] || ''}
                  onChange={(e) => handleInputChange('buyer.contact.address', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full address (street, city, state, zip)"
                />
              </div>

              {/* Only show buyer tier if buyer is a dealer */}
              {typeof deal?.buyer?.type === 'string' && deal.buyer.type.toLowerCase() === 'dealer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Buyer Tier</label>
                  <select
                    value={editData['buyer.tier'] || ''}
                    onChange={e => handleInputChange('buyer.tier', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Tier</option>
                    <option value="Tier 1">Tier 1 (Pay Upon Title)</option>
                    <option value="Tier 2">Tier 2 (Pay Prior to Release)</option>
                    <option value="Tier 3">Tier 3</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Vehicle Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Vehicle Information</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Purchase Price</label>
                <input
                  type="number"
                  value={editData.purchasePrice || ''}
                  onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">List Price</label>
                <input
                  type="number"
                  value={editData.listPrice || ''}
                  onChange={(e) => handleInputChange('listPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Kill Price</label>
                <input
                  type="number"
                  value={editData.killPrice || ''}
                  onChange={(e) => handleInputChange('killPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Mileage</label>
                <input
                  type="number"
                  value={editData.mileage || ''}
                  onChange={(e) => handleInputChange('mileage', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                <input
                  type="text"
                  value={editData.color || ''}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Color"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Exterior</label>
                <input
                  type="text"
                  value={editData.exteriorColor || ''}
                  onChange={(e) => handleInputChange('exteriorColor', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Exterior color"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Interior</label>
                <input
                  type="text"
                  value={editData.interiorColor || ''}
                  onChange={(e) => handleInputChange('interiorColor', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Interior color"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Stock Number</label>
              <input
                type="text"
                value={editData.rpStockNumber || ''}
                onChange={(e) => handleInputChange('rpStockNumber', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="RP Stock Number"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes & Regenerate Documents'}
          </button>
          <button
            onClick={handleEditToggle}
            disabled={saving}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  console.log('[FinanceDealDetails] documents state:', documents);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center">
      <div className="flex flex-col items-center">
        <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <div className="text-white text-lg font-semibold">Loading deal details...</div>
      </div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center">
      <div className="flex flex-col items-center">
        <svg className="h-10 w-10 text-red-400 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
        <div className="text-red-400 text-lg font-semibold">Error loading deal: {error}</div>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  console.log('[FinanceDealDetails] Rendering documents (from state):', documents);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8 flex flex-col items-center">
      <ToastContainer position="bottom-right" autoClose={3500} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="dark" />
      <button className="mb-6 flex items-center text-blue-400 hover:text-blue-300 font-medium self-start" onClick={() => navigate(-1)}>
        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>
      
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Deal Documents</h1>
          <div className="flex gap-3">
            <button
              onClick={handleEditToggle}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Cancel Edit' : 'Edit Deal'}
            </button>
          </div>
        </div>

        {/* Deal Summary */}
        {deal && (
          <div className="bg-white/10 rounded-xl p-6 border border-white/20 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Deal Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
              <div>
                <span className="text-gray-300">Vehicle:</span>
                <div className="font-semibold">{deal.vehicle}</div>
              </div>
              <div>
                <span className="text-gray-300">VIN:</span>
                <div className="font-semibold">{deal.vin}</div>
              </div>
              <div>
                <span className="text-gray-300">Seller:</span>
                <div className="font-semibold">{deal.seller?.name}</div>
              </div>
              <div>
                <span className="text-gray-300">Purchase Price:</span>
                <div className="font-semibold">${deal.purchasePrice?.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-300">Deal Type:</span>
                <div className="font-semibold">{deal.dealType}</div>
              </div>
              <div>
                <span className="text-gray-300">Status:</span>
                <div className="font-semibold">{deal.currentStage}</div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Form */}
        {renderEditForm()}

        {/* Documents */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          alignItems: 'center',
          marginTop: '32px',
        }}>
          {documents.map((doc, idx) => {
            const docType = doc.type || doc.documentType || 'unknown';
            console.log(`[FinanceDealDetails] Rendering document ${idx}:`, doc);
            return (
              <div
                key={doc.fileName || doc.documentNumber || idx}
                style={{
                  minWidth: 480,
                  maxWidth: 600,
                  width: '100%',
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  boxShadow: '0 4px 24px 0 rgba(0,0,0,0.07)',
                  padding: '24px 28px',
                  margin: '0 auto',
                  transition: 'box-shadow 0.2s',
                  fontFamily: 'inherit',
                  color: '#222',
                  position: 'relative',
                  outline: 'none',
                }}
                onMouseOver={e => e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0,0,0,0.13)'}
                onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 24px 0 rgba(0,0,0,0.07)'}
              >
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: 16, 
                  marginBottom: 12, 
                  color: '#1a202c',
                  wordBreak: 'break-word',
                  lineHeight: '1.4'
                }}>
                  <div style={{ marginBottom: 8 }}>
                    {doc.fileName}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {docType === 'vehicle_record_pdf' && (
                      <span style={{
                        background: 'linear-gradient(90deg, #f6d365 0%, #fda085 100%)',
                        color: '#fff',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-block',
                      }}>
                        Vehicle Record PDF
                      </span>
                    )}
                    {docType === 'retail_pp_buy' && (
                      <span style={{
                        background: 'linear-gradient(90deg, #4fd1c5 0%, #38b2ac 100%)',
                        color: '#fff',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-block',
                      }}>
                        Retail PP Contract
                      </span>
                    )}
                    {docType === 'wholesale_pp_buy' && (
                      <span style={{
                        background: 'linear-gradient(90deg, #667eea 0%, #5a67d8 100%)',
                        color: '#fff',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-block',
                      }}>
                        Wholesale PP Contract
                      </span>
                    )}
                    {docType === 'wholesale_bos' && (
                      <span style={{
                        background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
                        color: '#fff',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-block',
                      }}>
                        Wholesale BOS
                      </span>
                    )}
                    {docType === 'wholesale_purchase_order' && (
                      <span style={{
                        background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
                        color: '#fff',
                        borderRadius: 6,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-block',
                      }}>
                        Wholesale Purchase Order
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ 
                  fontSize: 14, 
                  marginBottom: 6,
                  wordBreak: 'break-word',
                  lineHeight: '1.4'
                }}>
                  <b>Type:</b> {
                    docType === 'retail_pp_buy' ? 'Retail Private Party Purchase Contract' :
                    docType === 'wholesale_pp_buy' ? 'Wholesale Private Party Purchase Contract' :
                    docType === 'wholesale_bos' ? 'Wholesale Bill of Sale' :
                    docType === 'vehicle_record_pdf' ? 'Vehicle Record PDF' :
                    docType === 'bill_of_sale' ? 'Bill of Sale' :
                    docType === 'wholesale_purchase_order' ? 'Wholesale Purchase Order' :
                    docType === 'extra_doc' ? 'Additional Document' :
                    docType
                  }
                </div>
                <div style={{ 
                  fontSize: 14, 
                  marginBottom: 16,
                  wordBreak: 'break-word'
                }}>
                  <b>Size:</b> {doc.fileSize ? `${doc.fileSize.toLocaleString()} bytes` : 'N/A'}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    onClick={() => handleView(doc)}
                    style={{
                      padding: '10px 22px',
                      background: 'linear-gradient(90deg, #4fd1c5 0%, #38b2ac 100%)',
                      color: '#fff',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 15,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px 0 rgba(79,209,197,0.13)',
                      transition: 'background 0.2s, box-shadow 0.2s',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #38b2ac 0%, #319795 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 16px 0 rgba(56,178,172,0.18)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #4fd1c5 0%, #38b2ac 100%)';
                      e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(79,209,197,0.13)';
                    }}
                  >
                    View
                  </button>
                  <a
                    href={getDocumentUrl(doc, API_BASE)}
                    download
                    style={{
                      padding: '10px 22px',
                      background: 'linear-gradient(90deg, #667eea 0%, #5a67d8 100%)',
                      color: '#fff',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 15,
                      textDecoration: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px 0 rgba(102,126,234,0.13)',
                      transition: 'background 0.2s, box-shadow 0.2s',
                      display: 'inline-block',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #5a67d8 0%, #434190 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 16px 0 rgba(90,103,216,0.18)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'linear-gradient(90deg, #667eea 0%, #5a67d8 100%)';
                      e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(102,126,234,0.13)';
                    }}
                  >
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FinanceDealDetails; 