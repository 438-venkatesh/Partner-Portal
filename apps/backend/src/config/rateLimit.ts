/** Fastify @fastify/rate-limit per-route config (requires `global: false` on the plugin). */
export const routeRateLimitLogin = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute' as const,
    },
  },
};

/** Looser limit for public, unauthenticated form submissions (lead capture, etc.) — deters spam, not real users. */
export const routeRateLimitPublicSubmit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute' as const,
    },
  },
};
