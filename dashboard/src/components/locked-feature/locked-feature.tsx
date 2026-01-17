import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LockableFeature } from 'src/config/unlockables';

interface LockedFeatureProps {
  /** Lock information containing the required milestone details */
  lockInfo: LockableFeature;
  /** Additional CSS classes */
  className?: string;
}

/**
 * LockedFeature displays a locked state screen for features that require milestones.
 * Shows a large padlock icon with the required milestone name and tier.
 */
export function LockedFeature({ lockInfo, className }: LockedFeatureProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-[60vh]', className)}>
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-12 pb-10">
          <div className="flex justify-center mb-6">
            <div className="p-6 rounded-full bg-muted">
              <Lock className="size-16 text-muted-foreground" />
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-2">{lockInfo.displayName} Locked</h2>

          <p className="text-muted-foreground mb-4">
            This feature requires a milestone to be unlocked in-game.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
            <Lock className="size-4 text-muted-foreground" />
            <span className="font-medium">{lockInfo.milestoneName}</span>
            <span className="text-muted-foreground">(Tier {lockInfo.tier})</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
