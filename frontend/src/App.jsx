import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import VendorDashboard from './pages/VendorDashboard';
import VendorProfile from './pages/VendorProfile';
import VendorDocuments from './pages/VendorDocuments';
import ComplianceDashboard from './pages/ComplianceDashboard';
import VendorReviews from './pages/VendorReviews';
import FinanceDashboard from './pages/FinanceDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminVendors from './pages/AdminVendors';
import AdminAuditLogs from './pages/AdminAuditLogs';


// Simple Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />; // or a 403 Forbidden page
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/vendor-dashboard" element={
            <ProtectedRoute allowedRoles={['Vendor']}>
              <VendorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/vendor-profile" element={
            <ProtectedRoute allowedRoles={['Vendor']}>
              <VendorProfile />
            </ProtectedRoute>
          } />
          <Route path="/vendor-documents" element={
            <ProtectedRoute allowedRoles={['Vendor']}>
              <VendorDocuments />
            </ProtectedRoute>
          } />
          <Route path="/documents" element={
            <ProtectedRoute allowedRoles={['Vendor']}>
              <VendorDocuments />
            </ProtectedRoute>
          } />
          <Route path="/compliance-dashboard" element={
            <ProtectedRoute allowedRoles={['Compliance Officer']}>
              <ComplianceDashboard />
            </ProtectedRoute>
          } />
          <Route path="/vendor-reviews" element={
            <ProtectedRoute allowedRoles={['Compliance Officer']}>
              <VendorReviews />
            </ProtectedRoute>
          } />
          <Route path="/finance-dashboard" element={
            <ProtectedRoute allowedRoles={['Finance Team']}>
              <FinanceDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin-dashboard" element={
            <ProtectedRoute allowedRoles={['Super Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin-vendors" element={
            <ProtectedRoute allowedRoles={['Super Admin']}>
              <AdminVendors />
            </ProtectedRoute>
          } />
          <Route path="/admin-audit-logs" element={
            <ProtectedRoute allowedRoles={['Super Admin']}>
              <AdminAuditLogs />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
