import React, { useState, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Leaf, Flame, Trophy, User, LogIn, Loader } from 'lucide-react';

// Lazy loading the tab components to satisfy the optimization requirement
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const LogForm = React.lazy(() => import('./components/LogForm'));
const Leaderboard = React.lazy(() => import('./components/Leaderboard'));
const Profile = React.lazy(() => import('./components/Profile'));

type Tab = 'dashboard' | 'log' | 'leaderboard' | 'profile';

const Navigation: React.FC<{ activeTab: Tab; setActiveTab: (tab: Tab) => void }> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Leaf },
    { id: 'log', label: 'Daily Log', icon: Flame },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4" aria-label="Main Navigation">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Logo Section */}
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <Leaf className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-xl font-extrabold text-white tracking-wider">CarbonSense</span>
        </div>

        {/* Tab Buttons */}
        <ul className="flex items-center space-x-1 md:space-x-2" role="tablist">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} role="presentation">
                <button
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${item.id}`}
                  id={`tab-${item.id}`}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-slate-900 shadow-lg shadow-primary/20'
                      : 'text-gray-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

      </div>
    </nav>
  );
};

const LoadingSpinner: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-gray-400 space-y-3">
    <Loader className="w-10 h-10 animate-spin text-primary" />
    <p className="text-sm font-medium tracking-wide">Loading CarbonSense...</p>
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading, login } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Pre-authentication landing & login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Glow ambient background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

        <main className="max-w-md w-full text-center space-y-8 z-10">
          <header className="space-y-4">
            <div className="inline-flex p-4 bg-primary/10 rounded-2xl text-primary animate-float mb-2">
              <Leaf className="w-12 h-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-none">
              Carbon<span className="text-primary">Sense</span>
            </h1>
            <p className="text-gray-400 text-sm md:text-base max-w-sm mx-auto leading-relaxed">
              Track your daily habits, visualize emissions savings, unlock achievements, and earn rewards through gamified actions.
            </p>
          </header>

          <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-white">Start your journey</h2>
            <p className="text-xs text-gray-400">
              Sign in with your Google account to initialize your profile and start recording logs.
            </p>

            <button
              onClick={login}
              className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center space-x-3 transition duration-200 cursor-pointer shadow-lg"
              aria-label="Sign in with your Google account"
            >
              <LogIn className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>
          </section>
          
          <footer className="text-[11px] text-gray-500 font-semibold tracking-wider uppercase">
            &copy; {new Date().getFullYear()} CarbonSense. All rights reserved.
          </footer>
        </main>
      </div>
    );
  }

  // Post-authentication main layout
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col">
        <Suspense fallback={<LoadingSpinner />}>
          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="flex-1 flex flex-col"
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'log' && <LogForm />}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'profile' && <Profile />}
          </div>
        </Suspense>
      </div>

      <footer className="border-t border-slate-900 bg-slate-950/40 py-6 text-center text-xs text-gray-500 font-semibold uppercase tracking-wider">
        &copy; {new Date().getFullYear()} CarbonSense Platform.
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
