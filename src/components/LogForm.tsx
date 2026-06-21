import React, { useState } from 'react';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { calculateCarbonSaved, calculateStreakAndPoints } from '../utils/calculations';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import confetti from 'canvas-confetti';
import { MapPin, Navigation, Info, ShieldAlert, Sparkles, CheckCircle, Leaf } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Div icons to prevent default Leaflet asset path issues during bundling
const startIcon = L.divIcon({
  html: `<div class="w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-lg">A</div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const endIcon = L.divIcon({
  html: `<div class="w-6 h-6 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-lg">B</div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Map event listener component to handle user click coordinate selectors
const MapClickHandler: React.FC<{
  onMapClick: (latlng: L.LatLng) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

export const LogForm: React.FC = () => {
  const { user, refreshProfile } = useAuth();

  // Form states
  const [transportKms, setTransportKms] = useState<number>(0);
  const [transportType, setTransportType] = useState<string>('petrol-car');
  const [dietType, setDietType] = useState<string>('heavy-meat');
  const [energyKwh, setEnergyKwh] = useState<number>(12);

  // Map coordinates states
  const [startPoint, setStartPoint] = useState<L.LatLng | null>(null);
  const [endPoint, setEndPoint] = useState<L.LatLng | null>(null);
  const [mapHelperText, setMapHelperText] = useState(
    'Click on the map to set starting point (Marker A)',
  );

  // Submission & Alert States
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Haversine formula to compute distance
  const calculateGeodesicDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  const handleMapClick = (latlng: L.LatLng) => {
    if (!startPoint) {
      setStartPoint(latlng);
      setMapHelperText('Now click to set destination point (Marker B)');
    } else if (!endPoint) {
      setEndPoint(latlng);
      const distance = calculateGeodesicDistance(
        startPoint.lat,
        startPoint.lng,
        latlng.lat,
        latlng.lng,
      );
      setTransportKms(distance);
      setMapHelperText('Route configured! Click Reset Route to select a new one.');
    }
  };

  const resetRoute = () => {
    setStartPoint(null);
    setEndPoint(null);
    setTransportKms(0);
    setMapHelperText('Click on the map to set starting point (Marker A)');
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#8b5cf6'],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('You must be signed in to log data.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const carbonSaved = calculateCarbonSaved({
        transportKms,
        transportType,
        dietType,
        energyKwh,
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const userRef = doc(db, 'users', user.uid);

      let milestoneTriggered = false;
      let pointsAdded = 0;
      let newlyUnlockedBadges: string[] = [];

      // Perform a transaction to keep profile stats and log document updates consistent
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('User profile not found.');
        }

        const profile = userDoc.data();
        const streakData = calculateStreakAndPoints(
          profile.lastLoggedDate,
          todayStr,
          profile.currentStreak || 0,
          profile.highestStreak || 0,
          carbonSaved,
        );

        const newPoints = (profile.totalPoints || 0) + streakData.pointsToAdd;
        const newBadges = [...(profile.unlockedBadges || [])];
        const existingBadges = profile.unlockedBadges || [];

        pointsAdded = streakData.pointsToAdd;

        // 1. Award "Eco Novice" on first log
        if (!newBadges.includes('Eco Novice')) {
          newBadges.push('Eco Novice');
          milestoneTriggered = true;
        }

        // 2. Award "Streak Warrior" when current streak is >= 3
        if (streakData.newStreak >= 3 && !newBadges.includes('Streak Warrior')) {
          newBadges.push('Streak Warrior');
          milestoneTriggered = true;
        }

        // 3. Award "Commute Champion" when total points cross 500
        if (newPoints >= 500 && !newBadges.includes('Commute Champion')) {
          newBadges.push('Commute Champion');
          milestoneTriggered = true;
        }

        newlyUnlockedBadges = newBadges.filter((b) => !existingBadges.includes(b));

        // 1. Create a log document in the dailyLogs subcollection
        const logsColRef = collection(db, 'users', user.uid, 'dailyLogs');
        const newLogDocRef = doc(logsColRef);
        transaction.set(newLogDocRef, {
          timestamp: new Date().toISOString(),
          transportKms,
          transportType,
          dietType,
          energyKwh,
          carbonSavedKg: carbonSaved,
        });

        // 2. Update user profile
        transaction.update(userRef, {
          totalPoints: newPoints,
          currentStreak: streakData.newStreak,
          highestStreak: streakData.newHighestStreak,
          lastLoggedDate: todayStr,
          unlockedBadges: newBadges,
        });
      });

      setSuccessMsg(
        `Log recorded successfully! You saved ${carbonSaved} kg of CO2 and earned ${pointsAdded} points!`,
      );

      // Always trigger soft confetti, trigger high milestone confetti if unlocked any badges
      if (milestoneTriggered && newlyUnlockedBadges.length > 0) {
        triggerConfetti();
        // Additional delay confetti for wow effect
        setTimeout(triggerConfetti, 400);
        setSuccessMsg(
          (prev) =>
            prev + ` 🎉 Milestone unlocked: You unlocked the ${newlyUnlockedBadges.join(', ')} badge!`,
        );
      } else {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      }

      await refreshProfile();

      // Reset form variables
      setTransportKms(0);
      setEnergyKwh(12);
      resetRoute();
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred while saving your log.';
      setErrorMsg(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate live preview inline during render to prevent state lagging
  const carbonPreview = calculateCarbonSaved({
    transportKms,
    transportType,
    dietType,
    energyKwh,
  });

  return (
    <main
      id="main-content"
      className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full text-left"
      tabIndex={-1}
    >
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Record Daily Metrics</h1>
        <p className="text-gray-400 mt-2 text-base">
          Input your travel, dietary choice, and energy details to log emissions reductions.
        </p>
      </header>

      {errorMsg && (
        <div
          role="alert"
          className="mb-6 p-4 bg-rose-950/20 border border-rose-900/50 rounded-xl text-rose-300 flex items-center space-x-3"
        >
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="mb-6 p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-emerald-300 flex items-center space-x-3"
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0 animate-bounce" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-8 bg-dark-card border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-md"
      >
        {/* Section 1: Transport Route Planning */}
        <fieldset className="space-y-6">
          <legend className="text-lg font-bold text-white flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-primary" />
            <span>1. Transport Log & Route Planner</span>
          </legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="transport-type" className="block text-sm font-semibold text-gray-300">
                Transport Mode
              </label>
              <select
                id="transport-type"
                value={transportType}
                onChange={(e) => setTransportType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="petrol-car">Petrol Car (Standard)</option>
                <option value="diesel-car">Diesel Car</option>
                <option value="electric-car">Electric Vehicle (EV)</option>
                <option value="bus">Public Bus</option>
                <option value="train">Subway / Train</option>
                <option value="bicycle">Bicycle</option>
                <option value="walking">Walking / Running</option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="transport-distance"
                className="block text-sm font-semibold text-gray-300"
              >
                Travel Distance (km)
              </label>
              <input
                id="transport-distance"
                type="number"
                min="0"
                step="0.1"
                value={transportKms}
                onChange={(e) => setTransportKms(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Leaflet Map Router */}
          <div className="space-y-2">
            <span className="block text-sm font-semibold text-gray-300 flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Interactive Map Route Picker (Visual calculation helper)</span>
            </span>

            <div className="relative rounded-xl overflow-hidden border border-slate-800">
              <MapContainer center={[19.076, 72.8777]} zoom={11} className="w-full h-80 z-0">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onMapClick={handleMapClick} />

                {startPoint && <Marker position={startPoint} icon={startIcon} />}
                {endPoint && <Marker position={endPoint} icon={endIcon} />}
                {startPoint && endPoint && (
                  <Polyline
                    positions={[startPoint, endPoint]}
                    color="#10b981"
                    weight={4}
                    dashArray="5, 10"
                  />
                )}
              </MapContainer>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl gap-3">
              <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
                <Info className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{mapHelperText}</span>
              </div>
              {(startPoint || endPoint) && (
                <button
                  type="button"
                  onClick={resetRoute}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 border border-rose-900/50 px-3 py-1.5 rounded-lg bg-rose-950/10 cursor-pointer"
                >
                  Reset Route
                </button>
              )}
            </div>
          </div>
        </fieldset>

        {/* Section 2: Diet & Energy */}
        <fieldset className="space-y-6 pt-6 border-t border-slate-800">
          <legend className="text-lg font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <span>2. Nutrition & Household Energy Log</span>
          </legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="diet-type" className="block text-sm font-semibold text-gray-300">
                Dietary Habit Today
              </label>
              <select
                id="diet-type"
                value={dietType}
                onChange={(e) => setDietType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="heavy-meat">High Meat Consumption</option>
                <option value="low-meat">Low Meat / Flexitarian</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="energy-usage" className="block text-sm font-semibold text-gray-300">
                Electricity Consumed Today (kWh)
              </label>
              <input
                id="energy-usage"
                type="number"
                min="0"
                step="0.5"
                value={energyKwh}
                onChange={(e) => setEnergyKwh(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>
        </fieldset>

        {/* Live Preview Panel & Submission */}
        <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4 bg-primary/5 border border-primary/20 p-4 rounded-xl w-full md:w-auto">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Live Preview Savings
              </span>
              <span className="text-xl font-bold text-white">
                {carbonPreview} kg CO2
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full md:w-auto bg-primary hover:bg-primary-dark text-slate-900 font-bold px-8 py-4 rounded-xl transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center space-x-2"
          >
            {submitting ? 'Logging...' : 'Submit Log Entry'}
          </button>
        </div>
      </form>
    </main>
  );
};
export default LogForm;
