/**
 * Options for transport types and their corresponding CO2 emission factors in kg per km.
 */
export const TRANSPORT_EMISSIONS: Record<string, number> = {
  'petrol-car': 0.18,
  'diesel-car': 0.16,
  'electric-car': 0.05,
  'bus': 0.08,
  'train': 0.04,
  'bicycle': 0,
  'walking': 0,
};

/**
 * Standard baseline transport emissions (e.g., standard petrol car) in kg per km.
 */
export const TRANSPORT_BASELINE_FACTOR = 0.20;

/**
 * Options for diet types and their daily CO2 emission factors in kg.
 */
export const DIET_EMISSIONS: Record<string, number> = {
  'heavy-meat': 2.5,
  'low-meat': 1.7,
  'vegetarian': 1.3,
  'vegan': 0.9,
};

/**
 * Standard baseline diet emissions (e.g., heavy meat diet) in kg per day.
 */
export const DIET_BASELINE_FACTOR = 2.5;

/**
 * Standard baseline energy consumption in kWh per day.
 */
export const ENERGY_BASELINE_KWH = 12;

/**
 * CO2 emission factor for electricity grid in kg per kWh.
 */
export const ENERGY_EMISSION_FACTOR = 0.45;

/**
 * Interface representing the inputs for the daily carbon calculation.
 */
export interface DailyLogInput {
  transportKms: number;
  transportType: string;
  dietType: string;
  energyKwh: number;
}

/**
 * Calculates the amount of carbon saved in kilograms based on user choices
 * compared to standard baselines.
 * 
 * @param input The daily logs submitted by the user
 * @returns The calculated carbon saved in kg, rounded to two decimal places
 */
export function calculateCarbonSaved(input: DailyLogInput): number {
  const { transportKms, transportType, dietType, energyKwh } = input;

  // 1. Calculate transport savings
  const transportFactor = TRANSPORT_EMISSIONS[transportType] ?? TRANSPORT_BASELINE_FACTOR;
  const transportSaved = (TRANSPORT_BASELINE_FACTOR - transportFactor) * transportKms;

  // 2. Calculate diet savings
  const dietFactor = DIET_EMISSIONS[dietType] ?? DIET_BASELINE_FACTOR;
  const dietSaved = DIET_BASELINE_FACTOR - dietFactor;

  // 3. Calculate energy savings
  const energySaved = (ENERGY_BASELINE_KWH - energyKwh) * ENERGY_EMISSION_FACTOR;

  // Total carbon saved. Make sure we don't go below 0 (though users can save or not save).
  const totalSaved = transportSaved + dietSaved + energySaved;
  
  return Math.max(0, parseFloat(totalSaved.toFixed(2)));
}

/**
 * Determines the updated streak and points based on user's last logged date.
 * 
 * @param lastLoggedDate User's last logged date in YYYY-MM-DD format
 * @param currentDate Current date in YYYY-MM-DD format
 * @param currentStreak User's current streak count
 * @param highestStreak User's highest streak count recorded
 * @param carbonSaved Carbon saved in the current log in kg
 * @returns An object containing the updated currentStreak, highestStreak, and points to add
 */
export function calculateStreakAndPoints(
  lastLoggedDate: string | null | undefined,
  currentDate: string,
  currentStreak: number,
  highestStreak: number,
  carbonSaved: number
): {
  newStreak: number;
  newHighestStreak: number;
  pointsToAdd: number;
} {
  // If user has never logged before
  if (!lastLoggedDate) {
    const pointsToAdd = Math.round(carbonSaved * 10) + 10; // 10 points base + 10 points per kg CO2 saved
    return {
      newStreak: 1,
      newHighestStreak: Math.max(highestStreak, 1),
      pointsToAdd,
    };
  }

  const lastDate = new Date(lastLoggedDate);
  const currDate = new Date(currentDate);

  // Calculate difference in days
  const diffTime = currDate.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let newStreak = currentStreak;

  if (diffDays === 0) {
    // Already logged today, streak remains the same, no streak points added
    const pointsToAdd = Math.round(carbonSaved * 10);
    return {
      newStreak,
      newHighestStreak: highestStreak,
      pointsToAdd,
    };
  } else if (diffDays === 1) {
    // Logged consecutive day, increment streak
    newStreak += 1;
  } else {
    // Streak broken, reset to 1
    newStreak = 1;
  }

  const newHighestStreak = Math.max(highestStreak, newStreak);
  
  // Calculate points: 10 per kg CO2 saved + streak bonus (10 * currentStreak)
  const basePoints = Math.round(carbonSaved * 10);
  const streakBonus = newStreak * 5;
  const pointsToAdd = basePoints + streakBonus;

  return {
    newStreak,
    newHighestStreak,
    pointsToAdd,
  };
}
