import type { WebSocket } from 'ws';

const clients = new Set<WebSocket>();

export type RealtimeEvent = { type: string; [key: string]: unknown };

/**
 * In-process pub/sub for admin dashboard live updates — no Redis/queue, this backend runs as a
 * single instance. If it's ever scaled horizontally this would need a shared broker instead.
 */
export const realtimeBroadcaster = {
  addClient(socket: WebSocket) {
    clients.add(socket);
    socket.on('close', () => clients.delete(socket));
  },

  broadcast(event: RealtimeEvent) {
    const payload = JSON.stringify({ ...event, at: new Date().toISOString() });
    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        try {
          client.send(payload);
        } catch {
          /* drop a dead connection silently — its own 'close' handler will clean it up */
        }
      }
    }
  },
};
