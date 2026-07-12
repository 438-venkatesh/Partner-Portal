import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Subscribes to the admin dashboard's live-update channel and invalidates the given query keys
 * whenever a relevant event arrives, so open dashboards refresh without a manual reload.
 */
export function useAdminRealtime(queryKeysToInvalidate: unknown[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/realtime/dashboard?token=${encodeURIComponent(token)}`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;
        queryKeysToInvalidate.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      } catch {
        /* ignore malformed frames */
      }
    };

    return () => socket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query keys are stable literal arrays per call site
  }, []);
}
