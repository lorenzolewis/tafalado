// Cloudflare Web Analytics (#8): page views with no cookies and no consent banner.
// See docs/research/privacy-friendly-analytics.md.

/**
 * The site token from Cloudflare dashboard → Analytics & Logs → Web Analytics → the
 * tafalado.lorenzo.soy site → "Manage site" (the `token` in its JS snippet). It isn't a secret:
 * it ends up in every page. While it's empty, no beacon is added.
 */
export const WEB_ANALYTICS_TOKEN = '965da5da86e44012a5e259f365a3ea8c';

/** The beacon's `data-cf-beacon` attribute, or `null` when there's no token yet. */
export function webAnalyticsBeacon(token = WEB_ANALYTICS_TOKEN): string | null {
  return token ? JSON.stringify({ token }) : null;
}
