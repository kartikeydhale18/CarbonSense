import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { exportLogsToSheets } from '../services/googleSheetsService';
import {
  User,
  Shield,
  Flame,
  Award,
  Download,
  Loader,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

interface DailyLogData {
  timestamp: string;
  transportKms: number;
  transportType: string;
  dietType: string;
  energyKwh: number;
  carbonSavedKg: number;
}

export const Profile: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const [logs, setLogs] = useState<DailyLogData[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>(
    'idle',
  );
  const [sheetUrl, setSheetUrl] = useState<string>('');

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user) return;
      try {
        setLoadingLogs(true);
        const logsRef = collection(db, 'users', user.uid, 'dailyLogs');
        const q = query(logsRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        const fetchedLogs: DailyLogData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedLogs.push(doc.data() as DailyLogData);
        });
        setLogs(fetchedLogs);
      } catch (error) {
        console.error('Error fetching logs for export:', error);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchLogs();
  }, [user?.uid]);

  const handleExport = async () => {
    if (logs.length === 0) {
      alert('You need to submit at least one daily log before exporting.');
      return;
    }
    setExportStatus('exporting');
    try {
      const url = await exportLogsToSheets(logs);
      setSheetUrl(url);
      setExportStatus('success');
    } catch (error) {
      console.error('Export to Google Sheets failed:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 5000);
    }
  };

  const badgeMetadata = [
    {
      id: 'Commute Champion',
      title: 'Commute Champion',
      desc: 'Accumulate over 500 total Eco Points to claim this milestone.',
      reqPoints: 500,
    },
    {
      id: 'Eco Novice',
      title: 'Eco Novice',
      desc: 'Log your first daily emissions entry.',
      reqPoints: 10,
    },
    {
      id: 'Streak Warrior',
      title: 'Streak Warrior',
      desc: 'Reach a streak of 3 consecutive daily logs.',
      reqPoints: 100, // mock rule
    },
  ];

  return (
    <main
      id="main-content"
      className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full text-left"
      tabIndex={-1}
    >
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Eco Profile</h1>
        <p className="text-gray-400 mt-2 text-base">
          Manage your account settings, review streak stats, track badges, and export logs.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card & Details */}
        <section aria-label="User Account Summary" className="md:col-span-1 space-y-6">
          <div className="bg-dark-card border border-slate-800 rounded-2xl p-6 text-center shadow-xl backdrop-blur-md">
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full mx-auto flex items-center justify-center text-gray-400 mb-4">
              <User className="w-10 h-10" />
            </div>

            <h2 className="text-xl font-bold text-white leading-tight">
              {userProfile?.displayName || user?.displayName || 'Eco Warrior'}
            </h2>
            <p className="text-xs text-gray-400 mt-1 mb-6 break-all">
              {userProfile?.email || user?.email || 'N/A'}
            </p>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Current Streak
                </span>
                <span className="text-2xl font-bold text-white flex items-center justify-center mt-1">
                  <Flame className="w-5 h-5 text-orange-400 mr-1" />
                  {userProfile?.currentStreak || 0}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Highest Streak
                </span>
                <span className="text-2xl font-bold text-white flex items-center justify-center mt-1">
                  <Shield className="w-5 h-5 text-emerald-400 mr-1" />
                  {userProfile?.highestStreak || 0}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="mt-8 w-full bg-slate-900 hover:bg-slate-800 text-gray-300 font-semibold px-4 py-2.5 rounded-xl border border-slate-800 transition duration-200 cursor-pointer"
            >
              Sign Out
            </button>
          </div>

          {/* Export to Sheets Panel */}
          <div className="bg-dark-card border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
            <h3 className="text-base font-bold text-white mb-3">Backup logs</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Export all historic carbon savings log records directly into a clean, new Google Sheet
              spreadsheet via Google OAuth 2.0.
            </p>

            <button
              onClick={handleExport}
              disabled={exportStatus === 'exporting' || loadingLogs}
              className="w-full bg-primary hover:bg-primary-dark text-slate-900 font-bold px-4 py-3 rounded-xl transition duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
              aria-label="Export carbon logs to Google Sheets"
            >
              {exportStatus === 'exporting' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : exportStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Exported!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export to Sheets</span>
                </>
              )}
            </button>

            {exportStatus === 'success' && sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 hover:text-emerald-300 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition duration-200"
              >
                <span>Open Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {exportStatus === 'error' && (
              <p className="text-rose-400 text-xs mt-3 font-semibold text-center">
                Export failed. Try again.
              </p>
            )}
          </div>
        </section>

        {/* Badges System */}
        <section
          aria-labelledby="badges-section-title"
          className="md:col-span-2 bg-dark-card border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-md"
        >
          <h2
            id="badges-section-title"
            className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center space-x-2"
          >
            <Award className="w-6 h-6 text-primary animate-bounce" />
            <span>Badges & Achievements</span>
          </h2>

          <div className="space-y-6">
            {badgeMetadata.map((badge) => {
              // Determine if badge is unlocked (persisted in DB or meets rules dynamically)
              const isUnlocked =
                userProfile?.unlockedBadges?.includes(badge.id) ||
                (badge.id === 'Commute Champion'
                  ? (userProfile?.totalPoints || 0) >= 500
                  : badge.id === 'Eco Novice'
                    ? logs.length > 0
                    : badge.id === 'Streak Warrior'
                      ? (userProfile?.highestStreak || 0) >= 3
                      : false);

              return (
                <div
                  key={badge.id}
                  className={`p-4 md:p-5 rounded-xl border flex items-start space-x-4 transition duration-200 ${
                    isUnlocked
                      ? 'bg-emerald-950/10 border-emerald-900/40 text-emerald-400'
                      : 'bg-slate-900/40 border-slate-800 text-gray-500'
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl flex-shrink-0 ${
                      isUnlocked
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-900 text-gray-600'
                    }`}
                  >
                    <Award className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`text-base font-bold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}
                      >
                        {badge.title}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isUnlocked
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-900 text-gray-600'
                        }`}
                      >
                        {isUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-1 leading-relaxed ${isUnlocked ? 'text-gray-400' : 'text-slate-600'}`}
                    >
                      {badge.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};
export default Profile;
