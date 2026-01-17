import { useMemo, useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import type { Schematic, HubMilestone } from 'src/apiTypes';
import { MilestoneCard } from './milestone-card';

type Props = {
  tier: number;
  milestones: Schematic[];
  activeMilestone?: HubMilestone;
  isComplete: boolean;
  tierId: string;
};

export function TierCard({ tier, milestones, activeMilestone, isComplete, tierId }: Props) {
  const isLocked = milestones.every((m) => m.locked);
  const [isCollapsed, setIsCollapsed] = useState(isComplete);

  const sortedMilestones = useMemo(() => {
    return [...milestones].sort((a, b) => {
      const aIsActive = activeMilestone?.name === a.name;
      const bIsActive = activeMilestone?.name === b.name;

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      if (a.purchased && !b.purchased) return -1;
      if (!a.purchased && b.purchased) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [milestones, activeMilestone]);

  const canCollapse = !isLocked;

  return (
    <Card
      id={tierId}
      className={cn(
        'relative overflow-hidden',
        isComplete && 'border-green-500/30 bg-muted/50',
        isLocked && 'bg-muted/30 opacity-60'
      )}
    >
      <CardHeader
        className={cn(
          canCollapse && 'cursor-pointer select-none',
          isCollapsed && !isLocked ? 'pb-0' : 'pb-3'
        )}
        onClick={() => canCollapse && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">Tier {tier}</CardTitle>
            {isComplete && <Chip variant="success">Completed</Chip>}
          </div>
          {canCollapse && (
            <ChevronDown
              className={cn(
                'size-5 text-muted-foreground transition-transform',
                isCollapsed && '-rotate-90'
              )}
            />
          )}
        </div>
      </CardHeader>
      {(!isCollapsed || isLocked) && (
        <CardContent>
          {isLocked ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Lock className="size-10" />
                <span className="text-lg font-medium">Locked</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              {sortedMilestones.map((milestone) => {
                const isActive = activeMilestone?.name === milestone.name;
                return (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    isActive={isActive}
                    activeMilestoneData={isActive ? activeMilestone : undefined}
                    tierComplete={isComplete}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
