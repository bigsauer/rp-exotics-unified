import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const EnhancedPDFViewer = () => {
  const { fileName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getAuthHeaders, token, user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  
  const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';
  const viewUrl = location.state?.viewUrl || `${API_BASE}/api/documents/download/${encodeURIComponent(fileName || 'document')}`;
  const documentTitle = fileName || 'Document';
  const dealId = location.state?.dealId;
  const documentType = location.state?.documentType;

  useEffect(() => {
    const fetchPDF = async () => {
      if (!fileName) {
        console.error('[EnhancedPDFViewer] No fileName provided');
        setError('No document specified');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(viewUrl, {
          method: 'GET',
          credentials: 'include',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } else if (response.status === 404) {
          setError('Document not found. It may have been deleted or not yet generated.');
        } else {
          const errorText = await response.text();
          setError(`Failed to load PDF: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('[EnhancedPDFViewer] Error loading PDF:', error);
        setError(`Error loading PDF: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPDF();
  }, [fileName, viewUrl, getAuthHeaders, token, user]);

  // Signature drawing functionality
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
          documentType,
          fileName,
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
            documentUrl: viewUrl,
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
          documentUrl: viewUrl,
          dealId,
          documentType
        }),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Document sent to client for signature!');
        setShowSignatureModal(false);
        setSignatureStep(1);
        setClientEmail('');
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

  const handleIframeError = () => {
    console.error('[EnhancedPDFViewer] Iframe failed to load:', pdfUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-8">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-8">
        <div className="text-red-400 text-center">
          <p>Error loading PDF: {error}</p>
          <button 
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-8">
      {/* Header with navigation and signature button */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        <button
          className="flex items-center text-blue-400 hover:text-blue-300 font-medium"
          onClick={() => navigate(-1)}
        >
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        {/* Signature button for finance personnel */}
        {user?.role === 'finance' && (
          <button
            onClick={() => setShowSignatureModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Sign Document
          </button>
        )}
      </div>

      {/* PDF Viewer */}
      <div className="w-full max-w-5xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex items-center justify-center">
        <iframe
          src={pdfUrl}
          title={documentTitle}
          className="w-full h-full border-0"
          onError={handleIframeError}
        />
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

export default EnhancedPDFViewer; 