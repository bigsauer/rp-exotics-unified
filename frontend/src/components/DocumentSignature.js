import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const DocumentSignature = ({ signatureId, apiKey, onSignatureComplete }) => {
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
  const [signatureMethod, setSignatureMethod] = useState('draw'); // 'draw' or 'type'
  
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (signatureId) {
      fetchSignatureStatus();
    }
  }, [signatureId]);

  const fetchSignatureStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/signatures/status/${signatureId}`, {
        headers: { 'x-api-key': apiKey }
      });
      setSignatureData(response.data);
      
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
        ? '/api/signatures/consent/intent-to-sign'
        : '/api/signatures/consent/electronic-business';
      
      await axios.post(endpoint, {
        signatureId,
        ipAddress: 'client-ip', // In production, get actual IP
        userAgent: navigator.userAgent
      }, {
        headers: { 'x-api-key': apiKey }
      });

      setConsent(prev => ({
        ...prev,
        [consentType === 'intent' ? 'intentToSign' : 'electronicBusiness']: true
      }));

      if (consentType === 'electronicBusiness') {
        setStep(3); // Move to signature step
      }
    } catch (error) {
      setError(`Failed to record ${consentType} consent`);
      console.error('Error recording consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentSubmit = async () => {
    if (!consent.intentToSign) {
      await recordConsent('intent');
    }
    if (!consent.electronicBusiness) {
      await recordConsent('electronicBusiness');
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
    if (signatureMethod === 'draw' && !signatureImage) {
      setError('Please draw your signature');
      return;
    }
    if (signatureMethod === 'type' && !typedSignature.trim()) {
      setError('Please type your signature');
      return;
    }

    try {
      setLoading(true);
      const signatureData = {
        signatureId,
        signatureImage: signatureMethod === 'draw' ? signatureImage : null,
        typedSignature: signatureMethod === 'type' ? typedSignature : null,
        coordinates: { x: 100, y: 200, page: 1 }, // Default coordinates
        ipAddress: 'client-ip', // In production, get actual IP
        userAgent: navigator.userAgent
      };

      const response = await axios.post('/api/signatures/sign', signatureData, {
        headers: { 'x-api-key': apiKey }
      });

      setSignatureData(response.data);
      setStep(4);
      
      if (onSignatureComplete) {
        onSignatureComplete(response.data);
      }
    } catch (error) {
      setError('Failed to submit signature');
      console.error('Error submitting signature:', error);
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

          <button
            onClick={() => setStep(3)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
          >
            Proceed to Signature
          </button>
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
            <div className="space-y-4">
              <input
                type="text"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                placeholder="Type your full name as signature"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <button
            onClick={submitSignature}
            disabled={(signatureMethod === 'draw' && !signatureImage) || (signatureMethod === 'type' && !typedSignature.trim())}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Sign Document
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