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
import FinanceDealStatusUpdatePage from './components/FinanceDealStatusUpdatePage';
import DealStatusPage from './components/DealStatusPage';
import UserManagementPage from './components/UserManagementPage';
import AllDealsPage from './components/AllDealsPage';

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
          <Route path="/dealers" element={<RequireAuth><DealerNetworkPage /></RequireAuth>} />
          <Route path="/finance/deals" element={<RequireAuth><FinanceDashboard /></RequireAuth>} />
          <Route path="/finance/deals/:dealId" element={<RequireAuth><FinanceDealDetails /></RequireAuth>} />
          <Route path="/finance/status" element={<RequireAuth><FinanceStatusDashboard /></RequireAuth>} />
          <Route path="/finance/deals/:dealId/update-status" element={<RequireAuth><FinanceDealStatusUpdatePage /></RequireAuth>} />
          <Route path="/deals/:dealId/documents/:fileName/view" element={<PDFViewer />} />
          <Route path="/deals/:dealId/documents/view" element={<PDFViewer />} />
          <Route path="/" element={<RequireAuth><BeautifulDarkLanding /></RequireAuth>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
