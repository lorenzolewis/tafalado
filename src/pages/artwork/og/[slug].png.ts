import type { APIRoute, GetStaticPaths } from 'astro';
import { ogArtworkPaths, pngResponse, renderOg } from '../../../lib/artwork-render';
import type { Lesson } from '../../../lib/lessons';

// The site's Open Graph image, built to /artwork/og/site.png (SITE_OG_PATH), and one per lesson
// page, built to /artwork/og/pronunciation-01.png (ogImagePath).
export const getStaticPaths = ogArtworkPaths satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => pngResponse(await renderOg((props as { lesson?: Lesson }).lesson));
