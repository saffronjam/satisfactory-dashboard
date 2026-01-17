import { useEffect, useMemo, useRef } from 'react';
import { useContextSelector } from 'use-context-selector';
import { ApiContext } from '@/contexts/api/useApi';
import { Spinner } from '@/components/ui/spinner';
import { TierCard } from '../tier-card';
import type { Schematic } from 'src/apiTypes';

export function MilestonesView() {
  const api = useContextSelector(ApiContext, (v) => ({
    schematics: v.schematics,
    hub: v.hub,
    isLoading: v.isLoading,
  }));

  const hasScrolled = useRef(false);

  const tierGroups = useMemo(() => {
    const milestones = api.schematics.filter((s) => s.type === 'Milestone');
    const groups: Record<number, Schematic[]> = {};

    for (const milestone of milestones) {
      const tier = milestone.tier;
      if (!groups[tier]) {
        groups[tier] = [];
      }
      groups[tier].push(milestone);
    }

    for (const tier of Object.keys(groups)) {
      groups[Number(tier)].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, [api.schematics]);

  const sortedTiers = useMemo(() => {
    return Object.keys(tierGroups)
      .map(Number)
      .sort((a, b) => a - b);
  }, [tierGroups]);

  const activeMilestone = api.hub?.hasActiveMilestone ? api.hub.activeMilestone : undefined;

  const activeTier = useMemo(() => {
    if (!activeMilestone) return null;
    return activeMilestone.techTier;
  }, [activeMilestone]);

  useEffect(() => {
    if (hasScrolled.current || api.isLoading || activeTier === null) return;

    const tierId = `tier-${activeTier}`;
    const element = document.getElementById(tierId);
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolled.current = true;
      }, 100);
    }
  }, [activeTier, api.isLoading]);

  if (api.isLoading) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (sortedTiers.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">No milestones available</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Milestones</h1>
        <p className="text-muted-foreground">HUB milestone progress by tier</p>
      </div>

      <div className="flex flex-col gap-4">
        {sortedTiers.map((tier) => {
          const milestones = tierGroups[tier];
          const isComplete = milestones.every((m) => m.purchased);

          return (
            <TierCard
              key={tier}
              tier={tier}
              tierId={`tier-${tier}`}
              milestones={milestones}
              activeMilestone={activeMilestone}
              isComplete={isComplete}
            />
          );
        })}
      </div>
    </div>
  );
}
