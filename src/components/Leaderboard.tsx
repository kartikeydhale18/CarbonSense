import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Trophy, User as UserIcon, Loader, ShieldAlert } from 'lucide-react';

interface LeaderboardUser {
  uid: string;
  displayName: string;
  totalPoints: number;
  isCurrentUser?: boolean;
}

export const Leaderboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const colRef = collection(db, 'leaderboard');
        const q = query(colRef, orderBy('totalPoints', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);

        const dbUsers: LeaderboardUser[] = [];
        querySnapshot.forEach((doc) => {
          dbUsers.push({
            uid: doc.id,
            ...doc.data(),
          } as LeaderboardUser);
        });

        const currentLiveUser: LeaderboardUser | null = userProfile
          ? {
              uid: user?.uid || 'current',
              displayName: userProfile.displayName || 'You',
              totalPoints: userProfile.totalPoints || 0,
              isCurrentUser: true,
            }
          : null;

        const mergedList = [...dbUsers];

        // Add current user if not already present in the Firestore rankings
        if (currentLiveUser && !mergedList.some((u) => u.uid === currentLiveUser.uid)) {
          mergedList.push(currentLiveUser);
        }

        // Sort descending by points
        mergedList.sort((a, b) => b.totalPoints - a.totalPoints);
        setLeaderboard(mergedList);
      } catch (error) {
        console.error('Error reading leaderboard (could be due to strict rules):', error);
        // Fallback to show only current user on query failure
        const currentLiveUser: LeaderboardUser | null = userProfile
          ? {
              uid: user?.uid || 'current',
              displayName: userProfile.displayName || 'You (Local)',
              totalPoints: userProfile.totalPoints || 0,
              isCurrentUser: true,
            }
          : null;
        const mergedList = currentLiveUser ? [currentLiveUser] : [];
        setLeaderboard(mergedList);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [userProfile, user]);

  return (
    <main
      id="main-content"
      className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full text-left"
      tabIndex={-1}
    >
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
          <Trophy className="w-9 h-9 text-amber-400" />
          <span>Global Leaderboard</span>
        </h1>
        <p className="text-gray-400 mt-2 text-base">
          Compete with other eco-citizens. Build streaks and save emissions to rise to the top!
        </p>
      </header>

      {/* Info panel explaining security rules context */}
      <div className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong>Security Protocol Enforced:</strong> The leaderboard collection is strictly
          read-only for client connections. Leaderboard ranks are dynamically generated safely to
          block client-side score modification.
        </p>
      </div>

      <div className="bg-dark-card border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-2">
            <Loader className="w-8 h-8 animate-spin text-primary" />
            <p>Loading rankings...</p>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {leaderboard.map((item, index) => {
              const rank = index + 1;
              const isPodium = rank <= 3;
              const podiumColors =
                rank === 1
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : rank === 2
                    ? 'text-slate-300 bg-slate-400/10 border-slate-400/30'
                    : 'text-amber-600 bg-amber-700/10 border-amber-700/30';

              return (
                <div
                  key={`${item.uid || 'competitor'}-${index}`}
                  className={`flex items-center justify-between p-4 md:p-6 transition duration-150 ${
                    item.isCurrentUser
                      ? 'bg-primary/5 border-l-4 border-l-primary'
                      : 'hover:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Rank Indicator */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border text-sm ${
                        isPodium ? podiumColors : 'text-gray-500 bg-slate-900 border-slate-800'
                      }`}
                    >
                      {rank}
                    </div>

                    {/* Avatar Icon */}
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-gray-400">
                      <UserIcon className="w-5 h-5" />
                    </div>

                    <div>
                      <span className="block text-base font-bold text-white flex items-center space-x-2">
                        <span>{item.displayName}</span>
                        {item.isCurrentUser && (
                          <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            You
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">Rank #{rank} Global</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-lg font-extrabold text-white">
                      {item.totalPoints}
                    </span>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Points
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 space-y-2">
            <Trophy className="w-12 h-12 text-slate-700" />
            <p className="text-sm font-semibold text-white">No Rankings Available</p>
            <p className="text-xs text-gray-500">Sign in and earn points to see yourself here!</p>
          </div>
        )}
      </div>
    </main>
  );
};
export default Leaderboard;
