import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/environment';
import analytics from '../services/analytics';

// Document Viewer Component
const DocumentViewer = ({ signatureData, signedUrls, fetchSignedUrl }) => {
  const [documentUrl, setDocumentUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const originalUrl = signatureData?.signature?.documentUrl || signatureData?.documentUrl;
        if (!originalUrl) {
          setError('No document URL available');
          return;
        }

        console.log('DocumentViewer - Original URL:', originalUrl);
        
        // If it's already a backend URL, use it as is
        if (originalUrl.includes('/api/documents/')) {
          setDocumentUrl(originalUrl);
          return;
        }
        
        // If it's an S3 URL, get a signed URL
        if (originalUrl.includes('s3.amazonaws.com')) {
          const fileName = originalUrl.split('/').pop();
          console.log('DocumentViewer - Extracted fileName:', fileName);
          if (fileName) {
            const signedUrl = await fetchSignedUrl(fileName);
            console.log('DocumentViewer - fetchSignedUrl result:', signedUrl);
            if (signedUrl) {
              setDocumentUrl(signedUrl);
              console.log('DocumentViewer - Set documentUrl to:', signedUrl);
            } else {
              setError('Failed to load document - please try again');
            }
          } else {
            setError('Invalid document URL');
          }
        } else {
          setDocumentUrl(originalUrl);
          console.log('DocumentViewer - Set documentUrl to original URL:', originalUrl);
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [signatureData, signedUrls, fetchSignedUrl]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Document Preview</h3>
          <p className="text-sm text-gray-600">Loading document...</p>
        </div>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Document Preview</h3>
          <p className="text-sm text-gray-600">Error loading document</p>
        </div>
        <div className="p-6 text-center">
          <div className="text-red-500 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">Document Preview</h3>
        <p className="text-sm text-gray-600">
          {signatureData?.signature?.documentType || signatureData?.documentType || 'Document'} - Please review all terms and conditions
        </p>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-gray-900">PDF Document</span>
            </div>
            <a 
              href={documentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Open in New Tab
            </a>
          </div>
          
          {/* PDF Embed */}
          <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '400px' }}>
            {console.log('DocumentViewer - Rendering iframe with documentUrl:', documentUrl)}
            <iframe
              src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full"
              title="Document Preview"
              onError={(e) => {
                console.error('PDF iframe failed to load:', e);
                console.error('Document URL:', documentUrl);
              }}
            />
          </div>
          
          {/* Fallback if iframe fails */}
          <div className="text-center py-4 text-sm text-gray-500">
            <p>If the document doesn't load above, you can:</p>
            <a 
              href={documentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Open Document in New Tab
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility function to get document URL with fallback
const getDocumentUrl = (originalUrl) => {
  if (!originalUrl) return null;
  
  // If it's already a backend URL, use it as is
  if (originalUrl.includes('/api/documents/')) {
    return originalUrl;
  }
  
  // If it's an S3 URL, convert to backend URL
  if (originalUrl.includes('s3.amazonaws.com')) {
    const fileName = originalUrl.split('/').pop();
    if (fileName) {
      return `${API_BASE}/api/documents/serve/${fileName}`;
    }
  }
  
  // Return original URL if we can't convert it
  return originalUrl;
};

const DocumentSignature = ({ signatureId, onSignatureComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [consent, setConsent] = useState({
    intentToSign: false,
    electronicBusiness: false
  });
  const [signatureImage, setSignatureImage] = useState(null);
  const [typedSignature, setTypedSignature] = useState('');
  const [selectedFont, setSelectedFont] = useState('Dancing Script');
  const [signatureMethod, setSignatureMethod] = useState('draw'); // 'draw' or 'type'
  const [signedUrls, setSignedUrls] = useState({}); // Cache for signed URLs

  // Signature font options
  const signatureFonts = [
    { name: 'Dancing Script', value: 'Dancing Script', style: 'font-family: "Dancing Script", cursive;' },
    { name: 'Great Vibes', value: 'Great Vibes', style: 'font-family: "Great Vibes", cursive;' },
    { name: 'Pacifico', value: 'Pacifico', style: 'font-family: "Pacifico", cursive;' },
    { name: 'Satisfy', value: 'Satisfy', style: 'font-family: "Satisfy", cursive;' },
    { name: 'Kaushan Script', value: 'Kaushan Script', style: 'font-family: "Kaushan Script", cursive;' },
    { name: 'Allura', value: 'Allura', style: 'font-family: "Allura", cursive;' },
    { name: 'Alex Brush', value: 'Alex Brush', style: 'font-family: "Alex Brush", cursive;' },
    { name: 'Tangerine', value: 'Tangerine', style: 'font-family: "Tangerine", cursive;' }
  ];

  // Handle font selection with analytics
  const handleFontSelection = (fontValue) => {
    setSelectedFont(fontValue);
    analytics.trackUserInteraction('signature_font_selected', {
      fontName: fontValue,
      signatureId,
      step: 3
    });
  };
  
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    // Initialize session ID if not exists
    if (!sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', Math.random().toString(36).substring(2, 15));
    }
    
    if (signatureId) {
      fetchSignatureStatus();
      // Track signature page view
      analytics.trackPageView('Document Signature', `/sign/${signatureId}`);
      analytics.trackSignatureStep(1, 'signature_page', signatureId);
    }
  }, [signatureId]);

  const fetchSignedUrl = async (fileName) => {
    try {
      // Check if we already have a signed URL for this file
      if (signedUrls[fileName]) {
        return signedUrls[fileName];
      }
      
      console.log(`[DOCUMENT] Using backend-served URL for: ${fileName}`);
      const backendUrl = `${API_BASE}/api/documents/serve/${fileName}`;
      setSignedUrls(prev => ({ ...prev, [fileName]: backendUrl }));
      console.log(`[DOCUMENT] ✅ Backend URL generated for: ${fileName}`);
      return backendUrl;
    } catch (error) {
      console.error(`[DOCUMENT] ❌ Error generating backend URL for ${fileName}:`, error);
      return null;
    }
  };

  const getDocumentUrlWithSignedUrl = async (originalUrl) => {
    if (!originalUrl) return null;
    
    // If it's already a backend URL, use it as is
    if (originalUrl.includes('/api/documents/')) {
      return originalUrl;
    }
    
    // If it's an S3 URL, get a signed URL
    if (originalUrl.includes('s3.amazonaws.com')) {
      const fileName = originalUrl.split('/').pop();
      if (fileName) {
        const signedUrl = await fetchSignedUrl(fileName);
        return signedUrl || originalUrl; // Fallback to original URL if signed URL fails
      }
    }
    
    // Return original URL if we can't convert it
    return originalUrl;
  };

  const fetchSignatureStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/signatures/status/${signatureId}`);
      
      console.log('Signature status response:', response.data);
      console.log('Document URL from response:', response.data?.signature?.documentUrl);
      console.log('Full signature data structure:', JSON.stringify(response.data, null, 2));
      setSignatureData(response.data);
      
      // Pre-fetch signed URL for the document
      const documentUrl = response.data?.signature?.documentUrl || response.data?.documentUrl;
      if (documentUrl && documentUrl.includes('s3.amazonaws.com')) {
        const fileName = documentUrl.split('/').pop();
        await fetchSignedUrl(fileName);
      }
      
      if (response.data.status === 'signed') {
        setStep(4); // Show completion
      }
    } catch (error) {
      setError('Failed to load signature request');
      console.error('Error fetching signature status:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordConsent = async (consentType) => {
    try {
      setLoading(true);
      const endpoint = consentType === 'intent' 
        ? `${API_BASE}/api/signatures/consent/intent-to-sign`
        : `${API_BASE}/api/signatures/consent/electronic-business`;
      
      await axios.post(endpoint, {
        signatureId,
        ipAddress: null, // Will be captured by backend
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        sessionId: sessionStorage.getItem('sessionId') || Math.random().toString(36).substring(2, 15)
      });

      setConsent(prev => ({
        ...prev,
        [consentType === 'intent' ? 'intentToSign' : 'electronicBusiness']: true
      }));

      // Track consent event
      analytics.trackConsentEvent(consentType, 'signature_document', signatureId);

      if (consentType === 'electronicBusiness') {
        setStep(3); // Move to signature step
        analytics.trackSignatureStep(3, 'signature_document', signatureId);
      }
    } catch (error) {
      setError(`Failed to record ${consentType} consent`);
      console.error('Error recording consent:', error);
      analytics.trackError('consent_recording_failed', error.message, { consentType, signatureId });
    } finally {
      setLoading(false);
    }
  };

  const handleConsentSubmit = async () => {
    try {
      if (!consent.intentToSign) {
        await recordConsent('intent');
      }
      if (!consent.electronicBusiness) {
        await recordConsent('electronicBusiness');
      }
      
      // Advance to the next step after recording consent
      setStep(2);
      analytics.trackSignatureStep(2, 'signature_document', signatureId);
    } catch (error) {
      console.error('Error recording consent:', error);
      setError('Failed to record consent. Please try again.');
      analytics.trackError('consent_submit_failed', error.message, { signatureId });
    }
  };

  const startDrawing = (e) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    setSignatureImage(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImage(null);
  };

  const submitSignature = async () => {
    // Prevent multiple submissions
    if (loading) {
      console.log('Signature submission already in progress, ignoring duplicate click');
      return;
    }

    if (signatureMethod === 'draw' && !signatureImage) {
      setError('Please draw your signature');
      analytics.trackError('signature_validation_failed', 'No signature drawn', { signatureId });
      return;
    }
    if (signatureMethod === 'type' && !typedSignature.trim()) {
      setError('Please type your signature');
      analytics.trackError('signature_validation_failed', 'No signature typed', { signatureId });
      return;
    }

    try {
      setLoading(true);
      const signatureData = {
        signatureId,
        signatureImage: signatureMethod === 'draw' ? signatureImage : null,
        typedSignature: signatureMethod === 'type' ? typedSignature : null,
        signatureFont: signatureMethod === 'type' ? selectedFont : null,
        coordinates: { x: 100, y: 200, page: 1 }, // Default coordinates
        ipAddress: null, // Will be captured by backend
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        sessionId: sessionStorage.getItem('sessionId') || Math.random().toString(36).substring(2, 15)
      };

      // Add security headers for signature submission
      const response = await axios.post(`${API_BASE}/api/signatures/sign`, signatureData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Signature-Session': sessionStorage.getItem('sessionId') || 'unknown'
        }
      });

      setSignatureData(response.data);
      setStep(4);
      
      // Track successful signature completion
      analytics.trackSignatureCompletion('signature_document', signatureId, signatureMethod);
      analytics.trackSignatureStep(4, 'signature_document', signatureId);
      
      if (onSignatureComplete) {
        onSignatureComplete(response.data);
      }
    } catch (error) {
      console.error('Error submitting signature:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to submit signature';
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please check your access credentials.';
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.error || 'Invalid signature data. Please try again.';
        } else if (error.response.status === 404) {
          errorMessage = 'Signature request not found. Please contact support.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again in a moment.';
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
      analytics.trackError('signature_submission_failed', error.message, { signatureId, signatureMethod });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Processing...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Error</div>
        <div className="text-red-600">{error}</div>
        <button 
          onClick={() => setError(null)}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= stepNumber ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {stepNumber}
            </div>
            {stepNumber < 4 && (
              <div className={`w-16 h-1 mx-2 ${
                step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
              }`}></div>
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Legal Consent */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Legal Consent</h2>
            <p className="text-gray-600">Please review and agree to the following terms</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="intentToSign"
                checked={consent.intentToSign}
                onChange={(e) => setConsent(prev => ({ ...prev, intentToSign: e.target.checked }))}
                className="mt-1 h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="intentToSign" className="text-sm text-gray-700">
                <strong>Intent to Sign Electronically:</strong> I agree to sign this document electronically. 
                I understand that my electronic signature is legally binding and has the same effect as a handwritten signature.
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="electronicBusiness"
                checked={consent.electronicBusiness}
                onChange={(e) => setConsent(prev => ({ ...prev, electronicBusiness: e.target.checked }))}
                className="mt-1 h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="electronicBusiness" className="text-sm text-gray-700">
                <strong>Consent to Electronic Business:</strong> I consent to conduct business electronically. 
                I understand that electronic signatures and records are legally binding and admissible in court.
              </label>
            </div>
          </div>

          <button
            onClick={handleConsentSubmit}
            disabled={!consent.intentToSign || !consent.electronicBusiness}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Continue to Signature
          </button>
        </div>
      )}

      {/* Step 2: Document Review */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Review</h2>
            <p className="text-gray-600">Please review the document before signing</p>
          </div>

          {signatureData && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Document Details</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Document Type: {signatureData.signature?.documentType}</div>
                <div>Signer: {signatureData.signature?.signerName}</div>
                <div>Status: {signatureData.signature?.status}</div>
              </div>
            </div>
          )}

          {/* Document Viewer */}
          <DocumentViewer 
            signatureData={signatureData}
            signedUrls={signedUrls}
            fetchSignedUrl={fetchSignedUrl}
          />
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-900">Important Notice</h4>
                <p className="text-sm text-blue-800 mt-1">
                  By proceeding to sign, you acknowledge that you have read and understood all terms and conditions in this document. 
                  Your electronic signature will be legally binding.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-400"
            >
              Back to Consent
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
            >
              Proceed to Signature
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Signature */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign Document</h2>
            <p className="text-gray-600">Please provide your signature below</p>
          </div>

          {/* Signature Method Toggle */}
          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => setSignatureMethod('draw')}
              className={`px-4 py-2 rounded-lg font-medium ${
                signatureMethod === 'draw' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Draw Signature
            </button>
            <button
              onClick={() => setSignatureMethod('type')}
              className={`px-4 py-2 rounded-lg font-medium ${
                signatureMethod === 'type' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Type Signature
            </button>
          </div>

          {/* Signature Area */}
          {signatureMethod === 'draw' ? (
            <div className="space-y-4">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="border-2 border-gray-300 rounded-lg cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <button
                onClick={clearSignature}
                className="text-gray-600 hover:text-gray-800 underline"
              >
                Clear Signature
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Font Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Choose Signature Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {signatureFonts.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => handleFontSelection(font.value)}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${
                        selectedFont === font.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div 
                        className="text-lg font-medium"
                        style={{ fontFamily: font.value, fontSize: '18px' }}
                      >
                        {typedSignature || 'Your Name'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{font.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Signature Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Type Your Signature
                </label>
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Type your full name as signature"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>

              {/* Signature Preview */}
              {typedSignature && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Signature Preview
                  </label>
                  <div className="border-2 border-gray-200 rounded-lg p-6 bg-white">
                    <div 
                      className="text-center text-2xl font-medium text-gray-800"
                      style={{ 
                        fontFamily: selectedFont,
                        fontSize: '28px',
                        lineHeight: '1.2'
                      }}
                    >
                      {typedSignature}
                    </div>
                    <div className="text-center text-sm text-gray-500 mt-2">
                      {selectedFont} • {typedSignature.length} characters
                    </div>
                  </div>
                </div>
              )}

              {/* Font Size and Style Controls */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Customize Appearance
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleFontSelection('Dancing Script')}
                    className={`px-3 py-2 text-sm rounded border ${
                      selectedFont === 'Dancing Script'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    style={{ fontFamily: 'Dancing Script' }}
                  >
                    Elegant
                  </button>
                  <button
                    onClick={() => handleFontSelection('Great Vibes')}
                    className={`px-3 py-2 text-sm rounded border ${
                      selectedFont === 'Great Vibes'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    style={{ fontFamily: 'Great Vibes' }}
                  >
                    Formal
                  </button>
                  <button
                    onClick={() => handleFontSelection('Pacifico')}
                    className={`px-3 py-2 text-sm rounded border ${
                      selectedFont === 'Pacifico'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    style={{ fontFamily: 'Pacifico' }}
                  >
                    Casual
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={submitSignature}
            disabled={loading || (signatureMethod === 'draw' && !signatureImage) || (signatureMethod === 'type' && !typedSignature.trim())}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing Document...' : 'Sign Document'}
          </button>
        </div>
      )}

      {/* Step 4: Completion */}
      {step === 4 && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Signed Successfully!</h2>
            <p className="text-gray-600">Your signature has been recorded and the document is now legally binding.</p>
          </div>

          {signatureData && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Signature Details</h3>
              <div className="text-sm text-green-700 space-y-1">
                <div>Signed by: {signatureData.signature?.signerName}</div>
                <div>Date: {new Date(signatureData.signature?.signatureData?.timestamp).toLocaleString()}</div>
                <div>Status: {signatureData.signature?.status}</div>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500">
            A copy of the signed document has been sent to your email address.
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSignature; 