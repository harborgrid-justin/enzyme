/**
 * Rollout Utilities
 *
 * Utility functions for rollout calculations and scheduling.
 *
 * @module flags/advanced/rollout-utils
 */

import type { RolloutStage } from './types';

/**
 * Calculate what percentage of users would be affected by a rollout change.
 */
export function calculateRolloutImpact(
  currentPercentage: number,
  newPercentage: number
): {
  added: number;
  removed: number;
  unchanged: number;
} {
  if (newPercentage > currentPercentage) {
    return {
      added: newPercentage - currentPercentage,
      removed: 0,
      unchanged: currentPercentage,
    };
  } else {
    return {
      added: 0,
      removed: currentPercentage - newPercentage,
      unchanged: newPercentage,
    };
  }
}

/**
 * Generate a suggested rollout schedule.
 */
export function generateRolloutSchedule(
  startDate: Date,
  targetPercentage: number = 100,
  durationDays: number = 7
): RolloutStage[] {
  const stages: RolloutStage[] = [];
  const percentages = [1, 5, 10, 25, 50, 75, targetPercentage];
  const msPerDay = 24 * 60 * 60 * 1000;

  let currentDate = new Date(startDate);
  const interval = durationDays / percentages.length;

  for (const percentage of percentages) {
    if (percentage > targetPercentage) break;

    stages.push({
      name: `${percentage}%`,
      percentage,
      startTime: new Date(currentDate),
      minDuration: interval * msPerDay,
    });

    currentDate = new Date(currentDate.getTime() + interval * msPerDay);
  }

  return stages;
}
