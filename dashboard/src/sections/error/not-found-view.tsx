import { AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RouterLink } from 'src/routes/components';

/**
 * NotFoundView displays a 404 error page when a route is not found.
 * Uses shadcn Alert for the error message and Button for navigation.
 */
export function NotFoundView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <Alert className="max-w-md text-left">
          <AlertTriangle className="size-4" />
          <AlertTitle>Page not found!</AlertTitle>
        </Alert>

        <Button asChild size="lg">
          <RouterLink href="/">Go to home</RouterLink>
        </Button>
      </div>
    </div>
  );
}
