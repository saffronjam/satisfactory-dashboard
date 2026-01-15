import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useContextSelector } from 'use-context-selector';
import { ApiContext } from './useApi';

/**
 * ConnectionCheckerProvider monitors the API connection status and displays
 * toast notifications when the connection state changes.
 */
export const ConnectionCheckerProvider: React.FC = () => {
  const upMessage = 'Satisfactory API is online';
  const downMessage = 'Satisfactory API is offline';

  const isOnline = useContextSelector(ApiContext, (v) => v.isOnline);
  const didFirstCheck = useRef(false);
  const previousOnline = useRef<boolean | null>(null);

  useEffect(() => {
    if (!didFirstCheck.current) {
      didFirstCheck.current = true;
      previousOnline.current = isOnline;
      return;
    }

    if (previousOnline.current === isOnline) {
      return;
    }
    previousOnline.current = isOnline;

    if (isOnline) {
      toast.success(upMessage, { duration: 5000 });
    } else {
      toast.error(downMessage, { duration: Infinity });
    }
  }, [isOnline]);

  return null;
};
