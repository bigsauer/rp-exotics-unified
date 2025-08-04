import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './AuthContext';

const FinanceDealDetails = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders, user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Signature-related state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureStep, setSignatureStep] = useState(1);
  const [signatureData, setSignatureData] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [typedSignature, setTypedSignature] = useState('');
  const [signatureMethod, setSignatureMethod] = useState('draw');
  const [consent, setConsent] = useState({
    intentToSign: false,
    electronicBusiness: false
  });
  const [sendingToClient, setSendingToClient] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);


  const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';

  // Add this helper function near the top of the file
  function getDocumentUrl(doc, API_BASE) {
    if (!doc) return '';
    
    // Prioritize cloud URLs
    if (doc.cloudUrl) return doc.cloudUrl;
    if (doc.filePath && doc.filePath.startsWith('http')) return doc.filePath;
    
    // Fallback to local paths (for backward compatibility)
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
      return `${API_BASE}/api/documents/download/${fileName}`;
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
        console.log('[FinanceDealDetails] Deal documents length:', dealDocs.length);
        console.log('[FinanceDealDetails] Vehicle record documents length:', vehicleDocs.length);
        console.log('[FinanceDealDetails] Deal object structure:', Object.keys(deal || {}));
        console.log('[FinanceDealDetails] Deal documents structure:', deal?.documents ? Object.keys(deal.documents[0] || {}) : 'No documents');
        // Merge all documents, avoiding duplicates by fileName
        let allDocs = [...dealDocs];
        const vehicleDocFileNames = new Set(vehicleDocs.map(d => d.fileName));
        
        // Add vehicle record documents that aren't already in dealDocs
        vehicleDocs.forEach(doc => {
          if (!allDocs.some(d => d.fileName === doc.fileName)) {
            allDocs.push(doc);
          }
        });
        
        // Show all documents - don't filter them out
        // This ensures all documents are displayed properly
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

  // Canvas drawing functionality for signature
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const handleMouseDown = (e) => {
      isDrawingRef.current = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    
    const handleMouseMove = (e) => {
      if (!isDrawingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    
    const handleMouseUp = () => {
      isDrawingRef.current = false;
    };
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [showSignatureModal]);



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

  const handleDownloadDocument = async (doc, dealId) => {
    try {
      let downloadUrl;
      
      if (doc.type === 'extra_doc' && doc.documentId) {
        // For new extra_doc files with documentId
        downloadUrl = `${API_BASE}/api/backoffice/deals/${dealId}/documents/${doc.documentId}/download`;
      } else if (doc.type === 'extra_doc') {
        // For old extra_doc files without documentId
        downloadUrl = `${API_BASE}/api/backoffice/deals/${dealId}/documents/extra_doc/download`;
      } else if (doc.fileName) {
        // For generated documents
        downloadUrl = `${API_BASE}/api/documents/download/${doc.fileName || doc.name}`;
      } else {
        toast.error('Download URL not available for this document');
        return;
      }

      console.log('[FinanceDealDetails] Downloading document:', doc.type, downloadUrl);
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName || doc.name || `${doc.type}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Document downloaded successfully!');
      } else if (response.status === 404) {
        console.warn('[FinanceDealDetails] Document not found (404):', doc.fileName || doc.name);
        toast.error('Document not found. It may have been deleted or not yet generated.');
      } else {
        const errorText = await response.text();
        console.error('[FinanceDealDetails] Download failed:', response.status, errorText);
        toast.error('Failed to download document');
      }
    } catch (error) {
      console.error('[FinanceDealDetails] Error downloading document:', error);
      toast.error('Error downloading document');
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
      
      // Navigate to the enhanced viewer for extra_doc files
      const navigateUrl = `/deals/${dealId}/documents/enhanced-view`;
      console.log('Navigating to:', navigateUrl);
      navigate(navigateUrl, { 
        state: { 
          viewUrl,
          dealId,
          documentType: doc.type
        } 
      });
    } else {
      // For generated documents, use the documents endpoint with filename
      viewUrl = `${API_BASE}/api/documents/download/${doc.fileName || doc.name}`;
      console.log('generated document view URL:', viewUrl);
      
      // Navigate to the enhanced viewer for generated documents
      const navigateUrl = `/deals/${dealId}/documents/${encodeURIComponent(doc.fileName || doc.name)}/enhanced-view`;
      console.log('Navigating to:', navigateUrl);
      navigate(navigateUrl, { 
        state: { 
          viewUrl,
          dealId,
          documentType: doc.type
        } 
      });
    }
  };

  const handleRetryDocumentGeneration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/documents/generate/${dealId}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dealType2SubType: deal.dealType2SubType,
          dealType2: deal.dealType2,
          sellerType: deal.sellerType || 'private',
          buyerType: deal.buyerType || 'dealer'
        }),
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Document generation retry successful! ${result.documentCount || 0} document(s) generated.`);
        // Refresh the page to show new documents
        window.location.reload();
      } else {
        const errorText = await response.text();
        toast.error(`Document generation retry failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error retrying document generation:', error);
      toast.error('Failed to retry document generation');
    } finally {
      setLoading(false);
    }
  };

  // Signature-related functions
  const handleSignDocument = (doc) => {
    setSelectedDocument(doc);
    setShowSignatureModal(true);
    setSignatureStep(1);
    clearSignature();
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureImage(null);
    setTypedSignature('');
  };

  const captureSignature = () => {
    if (signatureMethod === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const dataURL = canvas.toDataURL();
      setSignatureImage(dataURL);
    } else if (signatureMethod === 'type' && typedSignature.trim()) {
      // Create a canvas with typed signature using cursive font
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 100;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1a1a1a'; // Dark gray for better signature appearance
      
      // Try to load a cursive font, fallback to system cursive
      ctx.font = 'bold 36px "Brush Script MT", "Lucida Handwriting", "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add some variation to make it look more handwritten
      const text = typedSignature.trim();
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Draw the signature with slight rotation for authenticity
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-0.02); // Slight tilt
      ctx.fillText(text, 0, 0);
      ctx.restore();
      
      setSignatureImage(canvas.toDataURL());
    }
  };

  const handleFinanceSign = async () => {
    // Skip consent requirements for internal finance personnel
    const isFinanceUser = user?.role === 'finance';
    
    if (!isFinanceUser && (!consent.intentToSign || !consent.electronicBusiness)) {
      toast.error('Please check both consent boxes to proceed');
      return;
    }

    captureSignature();
    if (!signatureImage) {
      toast.error('Please provide a signature');
      return;
    }

    try {
      setLoading(true);
      
      // Get client information for audit trail
      const clientInfo = {
        ipAddress: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => data.ip).catch(() => 'unknown'),
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      };

      // Create signature record with full legal compliance
      const signatureResponse = await fetch(`${API_BASE}/api/signatures`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dealId,
          documentType: selectedDocument.type || selectedDocument.documentType,
          fileName: selectedDocument.fileName || selectedDocument.name,
          signerType: 'finance',
          signerName: user?.firstName + ' ' + user?.lastName,
          signerEmail: user?.email,
          signatureImage,
          consent: {
            intentToSign: isFinanceUser ? true : consent.intentToSign,
            electronicBusiness: isFinanceUser ? true : consent.electronicBusiness,
            timestamp: new Date().toISOString()
          },
          // Enhanced audit trail
          auditTrail: {
            ipAddress: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent,
            screenResolution: clientInfo.screenResolution,
            timezone: clientInfo.timezone,
            language: clientInfo.language,
            sessionId: sessionStorage.getItem('sessionId') || 'unknown',
            documentUrl: getDocumentUrl(selectedDocument, API_BASE),
            signatureMethod: signatureMethod
          }
        }),
        credentials: 'include'
      });

      if (signatureResponse.ok) {
        const result = await signatureResponse.json();
        setSignatureData(result);
        setSignatureStep(2);
        toast.success('Document signed successfully! ✅ Legal compliance verified');
      } else {
        const errorText = await signatureResponse.text();
        toast.error(`Failed to sign document: ${errorText}`);
      }
    } catch (error) {
      console.error('Error signing document:', error);
      toast.error('Failed to sign document');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToClient = async () => {
    if (!clientEmail.trim()) {
      toast.error('Please enter client email address');
      return;
    }

    try {
      setSendingToClient(true);
      
      const response = await fetch(`${API_BASE}/api/signatures/${signatureData._id}/send-to-client`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientEmail: clientEmail.trim(),
          documentUrl: getDocumentUrl(selectedDocument, API_BASE),
          dealId,
          documentType: selectedDocument.type || selectedDocument.documentType
        }),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Document sent to client for signature!');
        setShowSignatureModal(false);
        setSignatureStep(1);
        setClientEmail('');
        setSelectedDocument(null);
      } else {
        const errorText = await response.text();
        toast.error(`Failed to send to client: ${errorText}`);
      }
    } catch (error) {
      console.error('Error sending to client:', error);
      toast.error('Failed to send document to client');
    } finally {
      setSendingToClient(false);
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
            {deal.documentGenerationStatus === 'failed' && (
              <button
                onClick={handleRetryDocumentGeneration}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Retry Document Generation
              </button>
            )}
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
              <div>
                <span className="text-gray-300">Document Generation:</span>
                <div className={`font-semibold ${
                  deal.documentGenerationStatus === 'completed' ? 'text-green-400' :
                  deal.documentGenerationStatus === 'failed' ? 'text-red-400' :
                  deal.documentGenerationStatus === 'in_progress' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {deal.documentGenerationStatus === 'completed' ? '✅ Completed' :
                   deal.documentGenerationStatus === 'failed' ? '❌ Failed' :
                   deal.documentGenerationStatus === 'in_progress' ? '⏳ In Progress' :
                   '⏳ Pending'}
                </div>
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
          {documents.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: '24px 28px',
              textAlign: 'center',
              color: '#666'
            }}>
              <h3>No documents found</h3>
              <p>Documents will appear here once they are generated or uploaded.</p>
            </div>
          ) : (
            documents.map((doc, idx) => {
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
                  <button
                    onClick={() => handleDownloadDocument(doc, dealId)}
                    style={{
                      padding: '10px 22px',
                      background: 'linear-gradient(90deg, #667eea 0%, #5a67d8 100%)',
                      color: '#fff',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 15,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px 0 rgba(102,126,234,0.13)',
                      transition: 'background 0.2s, box-shadow 0.2s',
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
                  </button>
                  {/* Sign Document button for finance users */}
                  {user?.role === 'finance' && (
                    <button
                      onClick={() => handleSignDocument(doc)}
                      style={{
                        padding: '10px 22px',
                        background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 15,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px 0 rgba(16,185,129,0.13)',
                        transition: 'background 0.2s, box-shadow 0.2s',
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = 'linear-gradient(90deg, #059669 0%, #047857 100%)';
                        e.currentTarget.style.boxShadow = '0 4px 16px 0 rgba(5,150,105,0.18)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
                        e.currentTarget.style.boxShadow = '0 2px 8px 0 rgba(16,185,129,0.13)';
                      }}
                    >
                      Sign Document
                    </button>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Sign Document</h2>
                <button
                  onClick={() => {
                    setShowSignatureModal(false);
                    setSignatureStep(1);
                    clearSignature();
                    setSelectedDocument(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {signatureStep === 1 && (
                <div className="space-y-6">
                  {/* Legal Consent - Only show for non-finance users */}
                  {user?.role !== 'finance' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">Legal Consent</h3>
                      <div className="space-y-3">
                        <label className="flex items-start">
                          <input
                            type="checkbox"
                            checked={consent.intentToSign}
                            onChange={(e) => setConsent({...consent, intentToSign: e.target.checked})}
                            className="mt-1 mr-3"
                          />
                          <span className="text-sm text-blue-800">
                            I intend to sign this document electronically and agree that my electronic signature is the legal equivalent of my manual/handwritten signature.
                          </span>
                        </label>
                        <label className="flex items-start">
                          <input
                            type="checkbox"
                            checked={consent.electronicBusiness}
                            onChange={(e) => setConsent({...consent, electronicBusiness: e.target.checked})}
                            className="mt-1 mr-3"
                          />
                          <span className="text-sm text-blue-800">
                            I consent to conduct business electronically and agree that electronic signatures are legally binding.
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Signature Method Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Signature Method</h3>
                    <div className="flex space-x-4 mb-4">
                      <button
                        onClick={() => setSignatureMethod('draw')}
                        className={`px-4 py-2 rounded-lg border ${
                          signatureMethod === 'draw' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        Draw Signature
                      </button>
                      <button
                        onClick={() => setSignatureMethod('type')}
                        className={`px-4 py-2 rounded-lg border ${
                          signatureMethod === 'type' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        Type Signature
                      </button>
                    </div>

                    {/* Signature Input */}
                    {signatureMethod === 'draw' && (
                      <div className="border-2 border-gray-300 rounded-lg p-4">
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={100}
                          className="border border-gray-300 rounded cursor-crosshair"
                          style={{ backgroundColor: 'white' }}
                        />
                        <button
                          onClick={clearSignature}
                          className="mt-2 text-sm text-red-600 hover:text-red-800"
                        >
                          Clear Signature
                        </button>
                      </div>
                    )}

                    {signatureMethod === 'type' && (
                      <div>
                        <input
                          type="text"
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          placeholder="Type your signature here..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sign Button */}
                  <button
                    onClick={handleFinanceSign}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Signing...' : 'Sign Document'}
                  </button>
                </div>
              )}

              {signatureStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="h-6 w-6 text-green-600 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-800 font-semibold">Document signed successfully!</span>
                    </div>
                  </div>

                  {/* Download Signed Document */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Download Signed Document</h3>
                    <p className="text-sm text-blue-800 mb-4">
                      Your signature has been placed on the document. Download the signed version below.
                    </p>
                    <button
                      onClick={() => window.open(`${API_BASE}/api/signatures/${signatureData._id}/download`, '_blank')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Signed PDF
                    </button>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Send to Client for Signature</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Client Email Address
                        </label>
                        <input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="client@example.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <button
                        onClick={handleSendToClient}
                        disabled={sendingToClient || !clientEmail.trim()}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {sendingToClient ? 'Sending...' : 'Send to Client'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDealDetails; 