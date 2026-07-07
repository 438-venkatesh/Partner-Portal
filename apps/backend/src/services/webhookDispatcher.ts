import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { partnerWebhooks } from '../db/schema';

/**
 * Fire webhooks for a partner when `events` matches subscription (best-effort).
 */
export const webhookDispatcher = {
  async dispatch(partnerId: string, event: string, payload: Record<string, unknown>) {
    const hooks = await db
      .select()
      .from(partnerWebhooks)
      .where(eq(partnerWebhooks.partnerId, partnerId));

    for (const hook of hooks) {
      if (!hook.isActive) continue;
      const evs = (hook.events as string[]) || [];
      if (evs.length && !evs.includes(event) && !evs.includes('*')) continue;

      const body = JSON.stringify({ event, payload, ts: new Date().toISOString() });
      const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');

      try {
        await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Partner-Webhook-Signature': sig,
          },
          body,
        });
      } catch (e) {
        console.error('[webhook] delivery failed', hook.webhookId, e);
      }
    }
  },
};
