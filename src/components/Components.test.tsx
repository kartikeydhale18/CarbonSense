import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// --- Mocks ---

// Mock Firebase Config
vi.mock('../firebaseConfig', () => ({
  auth: { currentUser: { uid: 'test-uid', displayName: 'Test User', email: 'test@example.com' } },
  db: { type: 'firestore' },
  googleProvider: {},
}));

// Mock Firebase Firestore methods
vi.mock('firebase/firestore', () => ({
  collection: vi.fn().mockImplementation(() => ({})),
  query: vi.fn().mockImplementation(() => ({})),
  orderBy: vi.fn().mockImplementation(() => ({})),
  limit: vi.fn().mockImplementation(() => ({})),
  getDocs: vi.fn().mockImplementation(() => Promise.resolve({
    forEach: (cb: any) => {
      // Competitor 1 / Log 1
      cb({
        id: 'mock1',
        data: () => ({
          timestamp: new Date().toISOString(),
          transportKms: 10,
          transportType: 'petrol-car',
          dietType: 'vegan',
          energyKwh: 10,
          carbonSavedKg: 2,
          displayName: 'Sophia Green',
          totalPoints: 1250,
        })
      });
      // Competitor 2 / Log 2
      cb({
        id: 'mock2',
        data: () => ({
          timestamp: new Date().toISOString(),
          transportKms: 20,
          transportType: 'bicycle',
          dietType: 'vegan',
          energyKwh: 8,
          carbonSavedKg: 7.4,
          displayName: 'Emma Leaf',
          totalPoints: 720,
        })
      });
    }
  })),
  doc: vi.fn().mockImplementation(() => ({})),
  getDoc: vi.fn().mockImplementation(() => Promise.resolve({
    exists: () => true,
    data: () => ({
      displayName: 'Test User',
      email: 'test@example.com',
      totalPoints: 520,
      currentStreak: 3,
      highestStreak: 7,
      lastLoggedDate: '2026-06-20',
      unlockedBadges: ['Commute Champion'],
    })
  })),
  setDoc: vi.fn().mockImplementation(() => Promise.resolve()),
  updateDoc: vi.fn().mockImplementation(() => Promise.resolve()),
  runTransaction: vi.fn().mockImplementation(() => Promise.resolve()),
}));

// Mock Auth Context
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid', displayName: 'Test User', email: 'test@example.com' },
    userProfile: {
      displayName: 'Test User',
      email: 'test@example.com',
      totalPoints: 520,
      currentStreak: 3,
      highestStreak: 7,
      lastLoggedDate: '2026-06-20',
      unlockedBadges: ['Commute Champion', 'Eco Novice'],
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock react-leaflet to prevent JSDOM layout & canvas rendering errors
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  Polyline: () => <div data-testid="polyline" />,
  useMapEvents: () => null,
}));

// Mock react-google-charts
vi.mock('react-google-charts', () => ({
  Chart: () => <div data-testid="google-chart">Mock Chart</div>,
}));

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Import Components for testing
import Dashboard from './Dashboard';
import LogForm from './LogForm';
import Leaderboard from './Leaderboard';
import Profile from './Profile';

describe('CarbonSense React Components Rendering Tests', () => {

  describe('Dashboard Component', () => {
    it('should render welcome greeting and profile stats cards', () => {
      render(<Dashboard />);
      
      // Check greeting header
      expect(screen.getByText(/Welcome back,/i)).toBeDefined();
      expect(screen.getByText(/Test User/i)).toBeDefined();

      // Check stats card values
      expect(screen.getByText(/Total Carbon Saved/i)).toBeDefined();
      expect(screen.getByText(/Eco Points Earned/i)).toBeDefined();
      expect(screen.getByText(/520/i)).toBeDefined(); // points
      expect(screen.getByText(/3/i)).toBeDefined(); // streak
    });

    it('should render Google Chart placeholder or visualization container', () => {
      render(<Dashboard />);
      expect(screen.getByText(/Historical Emission Savings/i)).toBeDefined();
    });
  });

  describe('LogForm Component', () => {
    it('should render form section headers and input fields', () => {
      render(<LogForm />);
      
      // Section headers
      expect(screen.getByText(/1. Transport Log & Route Planner/i)).toBeDefined();
      expect(screen.getByText(/2. Nutrition & Household Energy Log/i)).toBeDefined();

      // Input labels
      expect(screen.getByLabelText(/Transport Mode/i)).toBeDefined();
      expect(screen.getByLabelText(/Travel Distance \(km\)/i)).toBeDefined();
      expect(screen.getByLabelText(/Dietary Habit Today/i)).toBeDefined();
      expect(screen.getByLabelText(/Electricity Consumed Today \(kWh\)/i)).toBeDefined();
    });

    it('should render the interactive Leaflet Map Container', () => {
      render(<LogForm />);
      expect(screen.getByTestId('map-container')).toBeDefined();
    });

    it('should calculate and display live preview values', () => {
      render(<LogForm />);
      expect(screen.getByText(/Live Preview Savings/i)).toBeDefined();
    });
  });

  describe('Leaderboard Component', () => {
    it('should render leaderboard headers and rank items', async () => {
      render(<Leaderboard />);
      
      expect(screen.getByText(/Global Leaderboard/i)).toBeDefined();
      expect(await screen.findByText(/Sophia Green/i)).toBeDefined(); // mock player
      expect(await screen.findByText(/Emma Leaf/i)).toBeDefined(); // mock player
      expect(await screen.findByText(/Rank #1 Global/i)).toBeDefined();
    });
  });

  describe('Profile Component', () => {
    it('should render profile credentials and streaks', () => {
      render(<Profile />);
      
      expect(screen.getByText(/Your Eco Profile/i)).toBeDefined();
      expect(screen.getByText(/test@example.com/i)).toBeDefined();
      expect(screen.getByText(/Current Streak/i)).toBeDefined();
      expect(screen.getByText(/Highest Streak/i)).toBeDefined();
    });

    it('should render user badges and check Commute Champion unlock status', () => {
      render(<Profile />);
      
      expect(screen.getByText(/Badges & Achievements/i)).toBeDefined();
      expect(screen.getByText(/Commute Champion/i)).toBeDefined();
      // Total points are 520, so unlocked badge count is positive
      expect(screen.getAllByText(/Unlocked/i).length).toBeGreaterThan(0);
    });
  });
});
