import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Chart } from 'react-google-charts';
import { generateEcoTip } from '../services/geminiService';
import type { GeminiTip } from '../services/geminiService';
import { Leaf, Flame, Award, Calendar, Loader, CheckCircle } from 'lucide-react';

// Wait, the schedule service is imported from scheduleCalendarEvent. Let's make sure the import is correct:
// In our file list, we created: src/services/googleCalendarService.ts
// So we must import it from '../services/googleCalendarService'! Let's check: Yes.

import { scheduleCalendarEvent as syncCalendar } from '../services/googleCalendarService';

interface LogItem {
  timestamp: string;
  transportKms: number;
  transportType: string;
  dietType: string;
  energyKwh: number;
  carbonSavedKg: number;
}

export const Dashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [geminiTip, setGeminiTip] = useState<GeminiTip | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [calendarLink, setCalendarLink] = useState<string>('');

  useEffect(() => {
    const fetchLogsAndTip = async () => {
      if (!user) return;
      try {
        setLoadingLogs(true);
        const logsRef = collection(db, 'users', user.uid, 'dailyLogs');
        const q = query(logsRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedLogs: LogItem[] = [];
        querySnapshot.forEach((doc) => {
          fetchedLogs.push(doc.data() as LogItem);
        });
        setLogs(fetchedLogs);

        // Feed latest dailyLog (if available) to Gemini
        if (fetchedLogs.length > 0) {
          setLoadingTip(true);
          const latestLog = fetchedLogs[0];
          const tip = await generateEcoTip(latestLog);
          setGeminiTip(tip);
        } else {
          // If no logs, load a generic recommendation
          setGeminiTip({
            tip: "Log your first daily emissions entry to receive personalized, AI-driven action plans!",
            estimatedSavingsKg: 1.0,
          });
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoadingLogs(false);
        setLoadingTip(false);
      }
    };

    fetchLogsAndTip();
  }, [user]);

  const handleSyncToCalendar = async () => {
    if (!geminiTip) return;
    setSyncStatus('syncing');
    try {
      const link = await syncCalendar({
        tip: geminiTip.tip,
        estimatedSavingsKg: geminiTip.estimatedSavingsKg,
      });
      setCalendarLink(link);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 5000);
    } catch (error) {
      console.error("Calendar sync failed:", error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  // Group emissions saved for the Google Chart
  const getChartData = () => {
    let transportTotal = 0;
    let dietTotal = 0;
    let energyTotal = 0;

    // Standard baselines vs choices to visualize what savings come from where
    logs.forEach((log) => {
      // transport
      const transportFactor = log.transportType === 'bicycle' || log.transportType === 'walking' ? 0 
        : log.transportType === 'electric-car' ? 0.05
        : log.transportType === 'bus' ? 0.08
        : log.transportType === 'train' ? 0.04
        : 0.18;
      const transportSaved = (0.20 - transportFactor) * log.transportKms;
      transportTotal += Math.max(0, transportSaved);

      // diet
      const dietFactor = log.dietType === 'vegan' ? 0.9 
        : log.dietType === 'vegetarian' ? 1.3 
        : log.dietType === 'low-meat' ? 1.7 
        : 2.5;
      dietTotal += Math.max(0, 2.5 - dietFactor);

      // energy
      energyTotal += Math.max(0, (12 - log.energyKwh) * 0.45);
    });

    return [
      ['Source', 'Savings in kg CO2'],
      ['Transport Savings', parseFloat(transportTotal.toFixed(1))],
      ['Diet Savings', parseFloat(dietTotal.toFixed(1))],
      ['Energy Savings', parseFloat(energyTotal.toFixed(1))],
    ];
  };

  const chartData = getChartData();
  const totalCarbonSaved = logs.reduce((sum, log) => sum + log.carbonSavedKg, 0);

  return (
    <main id="main-content" className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full text-left" tabIndex={-1}>
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Welcome back, <span className="text-primary">{userProfile?.displayName || user?.displayName || 'Eco Hero'}</span>!
        </h1>
        <p className="text-gray-400 mt-2 text-base md:text-lg">
          Track and reduce your daily environmental footprint using real-time insights.
        </p>
      </header>

      {/* Stats Cards Section */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" aria-label="Overview stats">
        <article className="bg-dark-card border border-slate-800 rounded-2xl p-6 flex items-center space-x-4 shadow-xl backdrop-blur-md">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-primary">
            <Leaf className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Carbon Saved</h2>
            <p className="text-3xl font-bold text-white mt-1">{totalCarbonSaved.toFixed(1)} <span className="text-lg font-medium text-emerald-500">kg</span></p>
          </div>
        </article>

        <article className="bg-dark-card border border-slate-800 rounded-2xl p-6 flex items-center space-x-4 shadow-xl backdrop-blur-md">
          <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
            <Flame className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Current Streak</h2>
            <p className="text-3xl font-bold text-white mt-1">{userProfile?.currentStreak || 0} <span className="text-lg font-medium text-orange-400">Days</span></p>
          </div>
        </article>

        <article className="bg-dark-card border border-slate-800 rounded-2xl p-6 flex items-center space-x-4 shadow-xl backdrop-blur-md">
          <div className="p-3 bg-violet-500/10 rounded-xl text-accent">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Eco Points Earned</h2>
            <p className="text-3xl font-bold text-white mt-1">{userProfile?.totalPoints || 0} <span className="text-lg font-medium text-accent">pts</span></p>
          </div>
        </article>
      </section>

      {/* Main Grid: AI Insights & Data Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gemini Tips Section */}
        <section aria-labelledby="ai-recommendations-title" className="bg-dark-card border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-xl backdrop-blur-md">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-primary/20 text-primary text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">AI Powered</span>
              <h2 id="ai-recommendations-title" className="text-xl md:text-2xl font-bold text-white">Daily Eco-Challenge</h2>
            </div>
            
            {loadingTip ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-2">
                <Loader className="w-8 h-8 animate-spin text-primary" />
                <p>Gemini is tailoring your eco tip...</p>
              </div>
            ) : geminiTip ? (
              <div className="space-y-4">
                <blockquote className="text-lg font-medium text-slate-100 italic border-l-4 border-primary pl-4 py-1">
                  "{geminiTip.tip}"
                </blockquote>
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-emerald-400 font-medium">Estimated savings if completed:</span>
                  <span className="text-lg font-bold text-emerald-300">+{geminiTip.estimatedSavingsKg} kg CO2</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No active recommendation available.</p>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleSyncToCalendar}
              disabled={syncStatus === 'syncing' || !geminiTip}
              className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-slate-900 font-bold px-6 py-3 rounded-xl transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              aria-label="Sync this eco challenge to Google Calendar"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : syncStatus === 'success' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Synced!</span>
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  <span>Sync to Calendar</span>
                </>
              )}
            </button>
            {syncStatus === 'success' && calendarLink && (
              <a
                href={calendarLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm font-semibold flex items-center space-x-1"
              >
                <span>View in Google Calendar &rarr;</span>
              </a>
            )}
            {syncStatus === 'error' && (
              <span className="text-red-400 text-sm font-medium">Sync failed. Try again.</span>
            )}
          </div>
        </section>

        {/* Visualizations Section */}
        <section aria-labelledby="visualizations-title" className="bg-dark-card border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <h2 id="visualizations-title" className="text-xl md:text-2xl font-bold text-white mb-6">Historical Emission Savings</h2>
            
            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-2">
                <Loader className="w-8 h-8 animate-spin text-primary" />
                <p>Loading charts...</p>
              </div>
            ) : logs.length > 0 ? (
              <div className="w-full overflow-hidden flex items-center justify-center" style={{ minHeight: '300px' }}>
                <Chart
                  chartType="PieChart"
                  data={chartData}
                  width="100%"
                  height="300px"
                  options={{
                    backgroundColor: 'transparent',
                    legend: {
                      position: 'bottom',
                      textStyle: { color: '#9ca3af', fontSize: 13 }
                    },
                    pieSliceBorderColor: 'transparent',
                    slices: {
                      0: { color: '#10b981' }, // Transport: Emerald
                      1: { color: '#3b82f6' }, // Diet: Blue
                      2: { color: '#8b5cf6' }, // Energy: Violet
                    },
                    pieHole: 0.4,
                    chartArea: { width: '90%', height: '80%' },
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border border-dashed border-slate-800 rounded-xl p-6">
                <Leaf className="w-12 h-12 text-slate-700" />
                <h3 className="text-white font-semibold">No Data Visualizations Yet</h3>
                <p className="text-gray-400 text-sm max-w-sm">
                  Log your daily transport, diet, and energy metrics to populate your carbon savings pie chart.
                </p>
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
};
export default Dashboard;
