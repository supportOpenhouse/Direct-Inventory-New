import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Leads from './pages/Leads.jsx';
import FollowUps from './pages/FollowUps.jsx';
import Pipeline from './pages/Pipeline.jsx';
import PostToken from './pages/PostToken.jsx';
import Rejected from './pages/Rejected.jsx';
import Report from './pages/Report.jsx';
import ReportDetail from './pages/ReportDetail.jsx';
import Users from './pages/Users.jsx';
import Logs from './pages/Logs.jsx';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Admin always passes; otherwise the role must be in `roles`.
  if (roles && !roles.includes(user.role) && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Home />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/post-token" element={<PostToken />} />
        <Route path="/rejected" element={<Rejected />} />
        {/* Report — admin/manager see all (scoped on the backend); RMs are
            redirected to their own report via the sidebar's "My Report". */}
        <Route path="/report" element={<RequireAuth roles={['manager']}><Report /></RequireAuth>} />
        <Route path="/report/detail" element={<ReportDetail />} />
        <Route path="/my-report" element={<ReportDetail />} />
        <Route path="/users" element={<RequireAuth roles={[]}><Users /></RequireAuth>} />
        <Route path="/logs" element={<RequireAuth roles={[]}><Logs /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
