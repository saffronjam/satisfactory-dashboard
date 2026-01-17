import { useState, useEffect } from 'react';
import type { Hub, SpaceElevator } from 'src/apiTypes';
import { AnalyticsMilestoneProgress } from './analytics-milestone-progress';
import { AnalyticsSpaceElevatorProgress } from './analytics-space-elevator-progress';

type Props = {
  hub?: Hub;
  spaceElevator?: SpaceElevator;
  className?: string;
  intervalMs?: number;
};

/**
 * Alternating progress widget that cycles between milestone and space elevator progress.
 * Shows only milestone if no space elevator, only space elevator if no active milestone,
 * or alternates between both if both exist.
 */
export function AnalyticsProgressAlternating({
  hub,
  spaceElevator,
  className,
  intervalMs = 8000,
}: Props) {
  const [showMilestone, setShowMilestone] = useState(true);

  const hasActiveMilestone = hub?.hasActiveMilestone ?? false;
  const hasSpaceElevator = !!spaceElevator;
  const hasBoth = hasActiveMilestone && hasSpaceElevator;

  // Alternate between milestone and space elevator if both exist
  useEffect(() => {
    if (!hasBoth) {
      // Reset to show milestone when not alternating
      setShowMilestone(true);
      return;
    }

    const timer = setInterval(() => {
      setShowMilestone((prev) => !prev);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [hasBoth, intervalMs]);

  // If both exist, alternate
  if (hasBoth) {
    return showMilestone ? (
      <AnalyticsMilestoneProgress title="HUB Milestone" hub={hub} className={className} />
    ) : (
      <AnalyticsSpaceElevatorProgress
        title="Space Elevator"
        spaceElevator={spaceElevator}
        className={className}
      />
    );
  }

  // If only milestone exists
  if (hasActiveMilestone) {
    return <AnalyticsMilestoneProgress title="HUB Milestone" hub={hub} className={className} />;
  }

  // If only space elevator exists (or neither - space elevator shows fallback)
  return (
    <AnalyticsSpaceElevatorProgress
      title="Space Elevator"
      spaceElevator={spaceElevator}
      className={className}
    />
  );
}
