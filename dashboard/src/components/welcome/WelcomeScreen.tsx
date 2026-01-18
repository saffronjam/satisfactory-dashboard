import { Icon } from '@iconify/react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSession } from 'src/contexts/sessions';

interface WelcomeScreenProps {
  onAddSession: () => void;
}

/**
 * Welcome screen displayed when no sessions exist, prompting user to add their first session.
 */
const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onAddSession }) => {
  const { isLoading } = useSession();

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-3">
      <Card className="w-full max-w-md text-center">
        <CardContent className="px-8 py-10">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10">
            <Icon icon="material-symbols:factory" className="size-10 text-primary" />
          </div>

          <h1 className="mb-2 text-2xl font-bold">Welcome to Satisfactory Dashboard</h1>

          <p className="mb-8 text-muted-foreground">
            Connect to your Satisfactory server running the Ficsit Remote Monitoring mod to start
            monitoring your factory.
          </p>

          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={onAddSession}>
              <Icon icon="mdi:plus" className="size-5" />
              Add Your First Session
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Sessions are shared across all users of this Satisfactory Dashboard instance
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeScreen;
