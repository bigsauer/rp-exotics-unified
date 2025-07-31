import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  PenTool, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Mail,
  Copy,
  Eye,
  EyeOff,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const DocumentSignatureWorkflow = ({ dealId, documentType, onComplete }) => {
  const { user, getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Finance Sign, 2: Create Client Key, 3: Send to Client, 4: Complete
  const [financeSignature, setFinanceSignature] = useState(null);
  const [clientApiKey, setClientApiKey] = useState(null);
  const [signatureRequest, setSignatureRequest] = useState(null);
  const [clientSignature, setClientSignature] = useState(null);
  const [error, setError] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'https://astonishing-chicken-production.up.railway.app';

  // Step 1: Finance person signs the document
  const handleFinanceSign = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, create an API key for the finance person if they don't have one
      const financeApiKey = await createFinanceApiKey();

      // Create signature request for finance person
      const signatureRequest = await createSignatureRequest(
        dealId,
        documentType,
        user.firstName + ' ' + user.lastName,
        user.email,
        'internal',
        financeApiKey
      );

      // Finance person signs the document
      const signature = await signDocument(
        signatureRequest.signature.signatureId,
        financeApiKey,
        user.firstName + ' ' + user.lastName
      );

      setFinanceSignature(signature);
      setStep(2);
      toast.success('Document signed by finance team!');
    } catch (error) {
      console.error('Error signing document:', error);
      setError(error.message);
      toast.error('Failed to sign document');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create API key for client
  const handleCreateClientApiKey = async () => {
    try {
      setLoading(true);
      setError(null);

      const clientKey = await createClientApiKey(dealId);
      setClientApiKey(clientKey);
      setStep(3);
      toast.success('Client API key created!');
    } catch (error) {
      console.error('Error creating client API key:', error);
      setError(error.message);
      toast.error('Failed to create client API key');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Send document to client for signature
  const handleSendToClient = async () => {
    try {
      setLoading(true);
      setError(null);

      const request = await createClientSignatureRequest(
        dealId,
        documentType,
        clientApiKey
      );

      setSignatureRequest(request);
      setStep(4);
      toast.success('Document sent to client for signature!');
    } catch (error) {
      console.error('Error sending to client:', error);
      setError(error.message);
      toast.error('Failed to send document to client');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const createFinanceApiKey = async () => {
    const response = await fetch(`${API_BASE}/api/apikeys`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Finance Signature Key - ${user.firstName} ${user.lastName}`,
        description: 'API key for finance team document signing',
        type: 'internal',
        entityId: user._id,
        entityType: 'User',
        permissions: {
          signAgreements: true,
          viewDocuments: true,
          createSignatures: true
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create finance API key');
    }

    const data = await response.json();
    return data.apiKey.key;
  };

  const createClientApiKey = async (dealId) => {
    const response = await fetch(`${API_BASE}/api/apikeys`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Client Signature Key - Deal ${dealId}`,
        description: 'API key for client document signing',
        type: 'customer',
        entityId: dealId,
        entityType: 'Deal',
        permissions: {
          signAgreements: true,
          viewDocuments: true,
          createSignatures: false
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create client API key');
    }

    const data = await response.json();
    return data.apiKey.key;
  };

  const createSignatureRequest = async (documentId, documentType, signerName, signerEmail, signerType, apiKey) => {
    const response = await fetch(`${API_BASE}/api/signatures/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        documentId,
        documentType,
        signerName,
        signerEmail,
        signerType
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create signature request');
    }

    return await response.json();
  };

  const signDocument = async (signatureId, apiKey, typedSignature) => {
    const response = await fetch(`${API_BASE}/api/signatures/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        signatureId,
        typedSignature,
        ipAddress: '127.0.0.1',
        userAgent: navigator.userAgent
      })
    });

    if (!response.ok) {
      throw new Error('Failed to sign document');
    }

    return await response.json();
  };

  const createClientSignatureRequest = async (documentId, documentType, apiKey) => {
    const response = await fetch(`${API_BASE}/api/signatures/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        documentId,
        documentType,
        signerName: 'Client Signature Required',
        signerEmail: 'client@example.com',
        signerType: 'customer'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create client signature request');
    }

    return await response.json();
  };

  // Check for client signature completion
  useEffect(() => {
    if (step === 4 && signatureRequest) {
      const checkInterval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE}/api/signatures/status/${signatureRequest.signature.signatureId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.signature.status === 'signed') {
              setClientSignature(data.signature);
              setStep(5);
              toast.success('Client has signed the document!');
              if (onComplete) {
                onComplete({
                  financeSignature,
                  clientSignature: data.signature,
                  clientApiKey
                });
              }
            }
          }
        } catch (error) {
          console.error('Error checking signature status:', error);
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(checkInterval);
    }
  }, [step, signatureRequest]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getClientSignatureLink = () => {
    if (!clientApiKey || !signatureRequest) return '';
    return `${window.location.origin}/sign/${signatureRequest.signature.signatureId}?key=${clientApiKey}`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Document Signature Workflow</h2>
        <p className="text-gray-300">Complete document signing process from finance to client</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNumber 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-gray-300'
              }`}>
                {stepNumber}
              </div>
              {stepNumber < 5 && (
                <div className={`w-16 h-1 mx-2 ${
                  step > stepNumber ? 'bg-blue-600' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>Finance Sign</span>
          <span>Create Key</span>
          <span>Send to Client</span>
          <span>Client Sign</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Step 1: Finance Sign */}
      {step === 1 && (
        <div className="text-center">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 inline-block mb-4">
            <PenTool className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Step 1: Finance Team Signs</h3>
          <p className="text-gray-300 mb-4">
            The finance team will sign the document first to authorize the agreement.
          </p>
          <button
            onClick={handleFinanceSign}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Signing Document...
              </div>
            ) : (
              <div className="flex items-center">
                <PenTool className="h-4 w-4 mr-2" />
                Sign as Finance Team
              </div>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Create Client API Key */}
      {step === 2 && (
        <div className="text-center">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 inline-block mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Step 2: Create Client Access</h3>
          <p className="text-gray-300 mb-4">
            Create a secure API key for the client to sign the document.
          </p>
          <button
            onClick={handleCreateClientApiKey}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating Client Key...
              </div>
            ) : (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Create Client API Key
              </div>
            )}
          </button>
        </div>
      )}

      {/* Step 3: Send to Client */}
      {step === 3 && (
        <div className="text-center">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 inline-block mb-4">
            <Send className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Step 3: Send to Client</h3>
          <p className="text-gray-300 mb-4">
            Send the document to the client for their signature.
          </p>
          <button
            onClick={handleSendToClient}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending to Client...
              </div>
            ) : (
              <div className="flex items-center">
                <Send className="h-4 w-4 mr-2" />
                Send to Client
              </div>
            )}
          </button>
        </div>
      )}

      {/* Step 4: Client Signature Pending */}
      {step === 4 && (
        <div className="text-center">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 inline-block mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Step 4: Client Signature Pending</h3>
          <p className="text-gray-300 mb-4">
            The document has been sent to the client. Waiting for their signature...
          </p>
          
          {/* Client API Key Display */}
          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <h4 className="text-white font-medium mb-2">Client API Key</h4>
            <div className="flex items-center space-x-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={clientApiKey}
                readOnly
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono text-sm"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => copyToClipboard(clientApiKey)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Client Signature Link */}
          <div className="bg-white/5 rounded-lg p-4 mb-4">
            <h4 className="text-white font-medium mb-2">Client Signature Link</h4>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={getClientSignatureLink()}
                readOnly
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
              />
              <button
                onClick={() => copyToClipboard(getClientSignatureLink())}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Send this link to your client for them to sign the document
            </p>
          </div>

          <div className="flex items-center justify-center text-yellow-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
            <span>Waiting for client signature...</span>
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 5 && (
        <div className="text-center">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 inline-block mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Document Fully Signed!</h3>
          <p className="text-gray-300 mb-4">
            Both finance team and client have signed the document. The agreement is now legally binding.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Finance Signature</h4>
              <p className="text-gray-300 text-sm">
                Signed by: {financeSignature?.signature?.signerName}
              </p>
              <p className="text-gray-400 text-xs">
                {new Date(financeSignature?.signature?.signatureData?.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Client Signature</h4>
              <p className="text-gray-300 text-sm">
                Signed by: {clientSignature?.signerName}
              </p>
              <p className="text-gray-400 text-xs">
                {new Date(clientSignature?.signatureData?.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Download className="h-4 w-4 mr-2 inline" />
            Download Signed Document
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentSignatureWorkflow; 