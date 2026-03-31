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
import ShareDash from './components/ShareDash';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Something went wrong.</h1>
          <pre className="text-sm bg-white p-4 rounded text-red-600 overflow-auto border border-red-100">{this.state.error?.toString()}</pre>
          <pre className="text-xs bg-white p-4 mt-2 rounded text-slate-700 overflow-auto border border-slate-200">{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function PrivateRoute({ children, requireProfile = true }) {
  const { currentUser, userProfile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" />;
  if (requireProfile && !userProfile) return <Navigate to="/onboarding" />;
  return children;
}

function Layout({ children }) {
  const [mobileMenuOpen, ReactSetMobileMenuOpen] = React.useState(false);
  const { currentUser } = useAuth();
  
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 w-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Activity className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-slate-800 tracking-tight">BPly</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-6">
              {currentUser ? (
                <>
                  <Link to="/dashboard" className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-2 transition-colors">
                    <Activity className="w-4 h-4" /> Log
                  </Link>
                  <Link to="/history" className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-2 transition-colors">
                    <HistoryIcon className="w-4 h-4" /> History & PDF
                  </Link>
                  <Link to="/share" className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-2 transition-colors">
                    <Users className="w-4 h-4" /> Share
                  </Link>
                  <Link to="/settings" className="text-slate-600 hover:text-blue-600 font-medium flex items-center gap-2 transition-colors">
                    <User className="w-4 h-4" /> Profile
                  </Link>
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

            {/* Mobile Hamburger Button */}
            <div className="sm:hidden flex items-center">
              <button onClick={() => ReactSetMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600 hover:text-blue-600 p-2 focus:outline-none">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white border-t border-slate-100 shadow-md">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {currentUser ? (
                <>
                  <Link onClick={() => ReactSetMobileMenuOpen(false)} to="/dashboard" className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-blue-500" /> Log Reading
                  </Link>
                  <Link onClick={() => ReactSetMobileMenuOpen(false)} to="/history" className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-3">
                    <HistoryIcon className="w-5 h-5 text-blue-500" /> History & PDF
                  </Link>
                  <Link onClick={() => ReactSetMobileMenuOpen(false)} to="/share" className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-500" /> Share Access
                  </Link>
                  <Link onClick={() => ReactSetMobileMenuOpen(false)} to="/settings" className="w-full text-left px-3 py-3 rounded-md text-base font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-500" /> Profile
                  </Link>
                  <button 
                    onClick={() => { ReactSetMobileMenuOpen(false); signOut(auth); }}
                    className="w-full text-left mt-2 block px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                </>
              ) : (
                <Link onClick={() => ReactSetMobileMenuOpen(false)} to="/login" className="w-full text-center block px-3 py-3 rounded-md text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm">
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

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/shared/:userId" element={<SharedView />} />
              
              {/* Private Routes */}
              <Route path="/onboarding" element={
                <PrivateRoute requireProfile={false}>
                  <Onboarding />
                </PrivateRoute>
              } />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/history" element={
                <PrivateRoute>
                  <History />
                </PrivateRoute>
              } />
              <Route path="/share" element={
                <PrivateRoute>
                  <ShareDash />
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute>
                  <Settings />
                </PrivateRoute>
              } />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
