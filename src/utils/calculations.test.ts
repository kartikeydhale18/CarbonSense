import { describe, it, expect } from 'vitest';
import { calculateCarbonSaved, calculateStreakAndPoints } from './calculations';

describe('Carbon Saved Calculations', () => {
  it('should calculate zero carbon saved for standard baseline inputs', () => {
    const input = {
      transportKms: 10,
      transportType: 'petrol-car', // 0.18 (baseline is 0.20, so saves some)
      dietType: 'heavy-meat', // 2.5 (baseline is 2.5, saves 0)
      energyKwh: 12, // 12 (baseline is 12, saves 0)
    };
    // Transport saved: (0.20 - 0.18) * 10 = 0.2
    // Diet saved: 2.5 - 2.5 = 0
    // Energy saved: (12 - 12) * 0.45 = 0
    // Total saved: 0.2
    expect(calculateCarbonSaved(input)).toBe(0.2);
  });

  it('should calculate correct savings for eco-friendly inputs', () => {
    const input = {
      transportKms: 20,
      transportType: 'bicycle', // 0
      dietType: 'vegan', // 0.9
      energyKwh: 8, // 8 (baseline is 12, saves 4 kWh)
    };
    // Transport saved: (0.20 - 0) * 20 = 4.0
    // Diet saved: 2.5 - 0.9 = 1.6
    // Energy saved: (12 - 8) * 0.45 = 1.80
    // Total saved: 4.0 + 1.6 + 1.8 = 7.4
    expect(calculateCarbonSaved(input)).toBe(7.4);
  });

  it('should return 0 instead of negative carbon saved', () => {
    const input = {
      transportKms: 10,
      transportType: 'petrol-car', // 0.18 (saves 0.20 - 0.18 = 0.02 * 10 = 0.2)
      dietType: 'heavy-meat', // 2.5 (saves 0)
      energyKwh: 20, // 20 (saves (12 - 20) * 0.45 = -3.6)
    };
    // Total: 0.2 + 0 - 3.6 = -3.4
    // Should cap at 0
    expect(calculateCarbonSaved(input)).toBe(0);
  });
});

describe('Streak and Points Calculation', () => {
  const currentDate = '2026-06-21';

  it('should initialize streak to 1 for new users', () => {
    const result = calculateStreakAndPoints(null, currentDate, 0, 0, 5.2);
    expect(result.newStreak).toBe(1);
    expect(result.newHighestStreak).toBe(1);
    expect(result.pointsToAdd).toBe(62); // 5.2 * 10 (52) + 10 base = 62
  });

  it('should increment streak for consecutive daily logs', () => {
    const lastLoggedDate = '2026-06-20';
    const result = calculateStreakAndPoints(lastLoggedDate, currentDate, 3, 3, 2.5);
    expect(result.newStreak).toBe(4);
    expect(result.newHighestStreak).toBe(4);
    expect(result.pointsToAdd).toBe(45); // 2.5 * 10 (25) + 4 * 5 (20) = 45
  });

  it('should reset streak to 1 if log is missed', () => {
    const lastLoggedDate = '2026-06-18'; // missed 19th and 20th
    const result = calculateStreakAndPoints(lastLoggedDate, currentDate, 5, 5, 3.0);
    expect(result.newStreak).toBe(1);
    expect(result.newHighestStreak).toBe(5); // keeps highest
    expect(result.pointsToAdd).toBe(35); // 3 * 10 (30) + 1 * 5 (5) = 35
  });

  it('should maintain streak if logged multiple times on the same day', () => {
    const lastLoggedDate = '2026-06-21';
    const result = calculateStreakAndPoints(lastLoggedDate, currentDate, 4, 4, 1.2);
    expect(result.newStreak).toBe(4);
    expect(result.newHighestStreak).toBe(4);
    expect(result.pointsToAdd).toBe(12); // 1.2 * 10 (12) + no streak bonus
  });
});
