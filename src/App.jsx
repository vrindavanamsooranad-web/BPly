import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { auth } from './firebase/config';
import { signOut } from 'firebase/auth';
import { Activity, History as HistoryIcon, LogOut, Menu, X, User, Users } from 'lucide-react';

import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Home from './components/Home';
import Settings from './components/Settings';
import SharedView from './components/SharedView';

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('[BPly] Caught by error boundary:', err?.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8 space-y-6 animate-pulse max-w-2xl mx-auto pt-12">
          <div className="h-8 w-48 bg-slate-200 rounded-xl" />
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div className="h-5 w-64 bg-slate-200 rounded-lg" />
            <div className="h-4 w-48 bg-slate-100 rounded-md" />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-12 w-full bg-slate-200 rounded-xl mt-2" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div className="h-5 w-40 bg-slate-200 rounded-lg" />
            <div className="h-56 w-full bg-slate-100 rounded-xl" />
          </div>
          <p className="text-center text-xs text-slate-400 pt-2">
            Recovering…&nbsp;
            <button onClick={() => window.location.reload()} className="underline text-slate-500 hover:text-slate-700">
              Reload
            </button>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Private Route ────────────────────────────────────────────────────────────
function PrivateRoute({ children, requireProfile = true }) {
  const { currentUser, userProfile, loading } = useAuth();
  if (loading) return null; // Handled smoothly by AuthContext splash screen
  if (!currentUser) return <Navigate to="/login" replace />;
  if (requireProfile && !userProfile) return <Navigate to="/onboarding" replace />;
  return children;
}

// ─── Layout / Nav ─────────────────────────────────────────────────────────────
function NavLink({ to, icon: Icon, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-2 transition-colors"
    >
      <Icon className="w-4 h-4" /> {label}
    </Link>
  );
}

function Layout({ children }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { currentUser } = useAuth();
  const close = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 w-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Activity className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-slate-800 tracking-tight">BPly</span>
            </Link>

            {/* Desktop */}
            <div className="hidden sm:flex items-center gap-6">
              {currentUser ? (
                <>
                  <NavLink to="/dashboard" icon={Activity}     label="Log" />
                  <NavLink to="/history"   icon={HistoryIcon}  label="History & PDF" />
                  <NavLink to="/settings"  icon={User}         label="Profile" />
                  <button
                    onClick={() => signOut(auth)}
                    className="text-slate-600 hover:text-red-600 font-medium flex items-center gap-2 transition-colors ml-4"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : (
                <Link to="/login" className="bg-blue-600 text-white px-5 py-2 rounded-full font-semibold hover:bg-blue-700 transition shadow-sm">
                  Login / Sign Up
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <div className="sm:hidden">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-slate-600 hover:text-blue-600 p-2 focus:outline-none"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden bg-white border-t border-slate-100 shadow-md">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {currentUser ? (
                <>
                  <Link onClick={close} to="/dashboard" className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-blue-500" /> Log Reading
                  </Link>
                  <Link onClick={close} to="/history" className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-3">
                    <HistoryIcon className="w-5 h-5 text-blue-500" /> History &amp; PDF
                  </Link>
                  <Link onClick={close} to="/settings" className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-500" /> Profile
                  </Link>
                  <button
                    onClick={() => { close(); signOut(auth); }}
                    className="w-full text-left mt-2 px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                </>
              ) : (
                <Link onClick={close} to="/login" className="w-full text-center block px-3 py-3 rounded-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm">
                  Login / Sign Up
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Public routes */}
              <Route path="/"                element={<Home />} />
              <Route path="/login"           element={<Login />} />
              <Route path="/shared/:userId"  element={<SharedView />} />

              {/* Private routes */}
              <Route path="/onboarding" element={
                <PrivateRoute requireProfile={false}><Onboarding /></PrivateRoute>
              } />
              <Route path="/dashboard" element={
                <PrivateRoute><Dashboard /></PrivateRoute>
              } />
              <Route path="/history" element={
                <PrivateRoute><History /></PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute><Settings /></PrivateRoute>
              } />

              {/* Catch-all: redirect any unknown path to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
