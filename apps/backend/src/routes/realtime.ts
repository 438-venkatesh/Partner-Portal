import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { realtimeBroadcaster } from '../realtime/broadcaster';

/**
 * Live dashboard updates. Native browser WebSocket can't set an Authorization header, so the
 * platform JWT travels as a query param instead — verified with the same secret as `authenticate`.
 */
export async function realtimeRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard', { websocket: true }, (socket, request) => {
    const token = (request.query as { token?: string } | undefined)?.token;
    const secret = process.env.JWT_SECRET || 'secret';

    try {
      if (!token) throw new Error('missing token');
      jwt.verify(token, secret);
    } catch {
      socket.close(4001, 'Unauthorized');
      return;
    }

    realtimeBroadcaster.addClient(socket);
    socket.send(JSON.stringify({ type: 'connected', at: new Date().toISOString() }));
  });
}
