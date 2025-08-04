import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
          <Route path="/deals/new" element={<RequireAuth><NewDealEntry /></RequireAuth>} />
          <Route path="/deals/status" element={<RequireAuth><DealStatusPage /></RequireAuth>} />
          <Route path="/deals/all" element={<RequireAuth><AllDealsPage /></RequireAuth>} />
          <Route path="/users" element={<RequireAuth><UserManagementPage /></RequireAuth>} />
          <Route path="/apikeys" element={<RequireAuth><ApiKeyManagement /></RequireAuth>} />
          <Route path="/sign/:signatureId" element={<DocumentSignature />} />
          <Route path="/signatures/:signatureId/compliance" element={<RequireAuth><SignatureComplianceReport /></RequireAuth>} />
          <Route path="/dealers" element={<RequireAuth><DealerNetworkPage /></RequireAuth>} />
          <Route path="/brokers" element={<RequireAuth><BrokerNetworkPage /></RequireAuth>} />
          <Route path="/finance/deals" element={<RequireAuth><FinanceDashboard /></RequireAuth>} />
          <Route path="/finance/deals/:dealId" element={<RequireAuth><FinanceDealDetails /></RequireAuth>} />
          <Route path="/finance/status" element={<RequireAuth><FinanceStatusDashboard /></RequireAuth>} />
          <Route path="/finance/deals/:dealId/update-status" element={<RequireAuth><FinanceDealStatusUpdatePage /></RequireAuth>} />
          <Route path="/deals/:dealId/documents/:fileName/view" element={<PDFViewer />} />
          <Route path="/deals/:dealId/documents/view" element={<PDFViewer />} />
          <Route path="/deals/:dealId/documents/:fileName/enhanced-view" element={<EnhancedPDFViewer />} />
          <Route path="/deals/:dealId/documents/enhanced-view" element={<EnhancedPDFViewer />} />
                  <Route path="/transport" element={<RequireAuth><TransportManagementPage /></RequireAuth>} />
        <Route path="/transport/new" element={<RequireAuth><NewTransportPage /></RequireAuth>} />
        <Route path="/it" element={<RequireClaytonAuth><ITPage /></RequireClaytonAuth>} />
          <Route path="/" element={<RequireAuth><BeautifulDarkLanding /></RequireAuth>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
