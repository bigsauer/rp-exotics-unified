import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import BeautifulDarkLanding from './components/BeautifulDarkLanding';
import NewDealEntry from './components/NewDealEntry';
import CompleteLoginFlow from './components/CompleteLoginFlow';
import { AuthProvider, useAuth } from './components/AuthContext';
import DealerNetworkPage from './components/DealerNetworkPage';
import FinanceDashboard from './components/FinanceDashboard';
import FinanceDealDetails from './components/FinanceDealDetails';
import FinanceStatusDashboard from './components/FinanceStatusDashboard';
import PDFViewer from './components/PDFViewer';
import EnhancedPDFViewer from './components/EnhancedPDFViewer';
import FinanceDealStatusUpdatePage from './components/FinanceDealStatusUpdatePage';
import DealStatusPage from './components/DealStatusPage';
import UserManagementPage from './components/UserManagementPage';
import AllDealsPage from './components/AllDealsPage';
import TransportManagementPage from './components/TransportManagementPage';
import NewTransportPage from './components/NewTransportPage';
import ITPage from './components/ITPage';
import RequireClaytonAuth from './components/RequireClaytonAuth';
import ApiKeyManagement from './components/ApiKeyManagement';
import DocumentSignature from './components/DocumentSignature';
import SignatureComplianceReport from './components/SignatureComplianceReport';
import BrokerNetworkPage from './components/BrokerNetworkPage';
import PerformanceTrackingPage from './components/PerformanceTrackingPage';
import AppLayout from './components/AppLayout';
import SellerUploadPage from './components/SellerUploadPage';

// Wrapper component to handle signature route parameters
function DocumentSignatureWrapper() {
  const { signatureId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Validate signature ID format for security
    if (!signatureId || !signatureId.startsWith('sig_') || signatureId.length < 20) {
      setError('Invalid signature request');
      setLoading(false);
      return;
    }

    // Add security headers and validation
    const validateSignatureRequest = async () => {
      try {
        // Verify the signature request exists and is valid
        const response = await fetch(`/api/signatures/status/${signatureId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          setError('Invalid or expired signature request');
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Error validating signature request:', error);
        setError('Unable to validate signature request');
        setLoading(false);
      }
    };

    validateSignatureRequest();
  }, [signatureId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating signature request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-4">Please contact the sender if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return <DocumentSignature signatureId={signatureId} />;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<CompleteLoginFlow />} />
          <Route path="/deals/new" element={<RequireAuth><AppLayout><NewDealEntry /></AppLayout></RequireAuth>} />
          <Route path="/deals/status" element={<RequireAuth><AppLayout><DealStatusPage /></AppLayout></RequireAuth>} />
          <Route path="/deals/all" element={<RequireAuth><AppLayout><AllDealsPage /></AppLayout></RequireAuth>} />
          <Route path="/users" element={<RequireAuth><AppLayout><UserManagementPage /></AppLayout></RequireAuth>} />
          <Route path="/apikeys" element={<RequireAuth><AppLayout><ApiKeyManagement /></AppLayout></RequireAuth>} />
          <Route path="/admin/performance" element={<RequireAuth><AppLayout><PerformanceTrackingPage /></AppLayout></RequireAuth>} />
          <Route path="/sign/:signatureId" element={<DocumentSignatureWrapper />} />
          <Route path="/seller-upload/:token" element={<SellerUploadPage />} />
          <Route path="/signatures/:signatureId/compliance" element={<RequireAuth><AppLayout><SignatureComplianceReport /></AppLayout></RequireAuth>} />
          <Route path="/dealers" element={<RequireAuth><AppLayout><DealerNetworkPage /></AppLayout></RequireAuth>} />
          <Route path="/brokers" element={<RequireAuth><AppLayout><BrokerNetworkPage /></AppLayout></RequireAuth>} />
          <Route path="/finance/deals" element={<RequireAuth><AppLayout><FinanceDashboard /></AppLayout></RequireAuth>} />
          <Route path="/finance/deals/:dealId" element={<RequireAuth><AppLayout><FinanceDealDetails /></AppLayout></RequireAuth>} />
          <Route path="/finance/status" element={<RequireAuth><AppLayout><FinanceStatusDashboard /></AppLayout></RequireAuth>} />
          <Route path="/finance/deals/:dealId/update-status" element={<RequireAuth><AppLayout><FinanceDealStatusUpdatePage /></AppLayout></RequireAuth>} />
          <Route path="/deals/:dealId/documents/:fileName/view" element={<PDFViewer />} />
          <Route path="/deals/:dealId/documents/view" element={<PDFViewer />} />
          <Route path="/deals/:dealId/documents/:fileName/enhanced-view" element={<EnhancedPDFViewer />} />
          <Route path="/deals/:dealId/documents/enhanced-view" element={<EnhancedPDFViewer />} />
          <Route path="/transport" element={<RequireAuth><AppLayout><TransportManagementPage /></AppLayout></RequireAuth>} />
          <Route path="/transport/new" element={<RequireAuth><AppLayout><NewTransportPage /></AppLayout></RequireAuth>} />
          <Route path="/it" element={<RequireClaytonAuth><AppLayout><ITPage /></AppLayout></RequireClaytonAuth>} />
          <Route path="/" element={<RequireAuth><BeautifulDarkLanding /></RequireAuth>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
