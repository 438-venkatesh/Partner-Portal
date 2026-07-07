/** Fastify @fastify/rate-limit per-route config (requires `global: false` on the plugin). */
export const routeRateLimitLogin = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute' as const,
    },
  },
};
