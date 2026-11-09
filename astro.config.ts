import { satteri } from "@astrojs/markdown-satteri";
import sitemap from "@astrojs/sitemap";
import { tableLang } from "./src/lib/table-lang";
import { defineConfig, fontProviders } from "astro/config";

// The #52 identity's fonts, both OFL, from the pinned @fontsource packages (devDependencies), so
// builds need no network. Astro self-hosts them with metric-matched fallbacks. The Latin subset
// covers Portuguese and Spanish (ã õ ç ê é á ñ ¿ ¡). These are the local provider over the
// packages' files: fontProviders.npm() returns file:// URLs that Astro 7.4 fails to read.
type Face = [weight: number, style: "normal" | "italic"];
const fontsource = (pkg: string, [first, ...rest]: [Face, ...Face[]]) => {
	const variant = ([weight, style]: Face) => ({
		weight,
		style,
		src: [`@fontsource/${pkg}/files/${pkg}-latin-${weight}-${style}.woff2`] as [string],
	});
	return [variant(first), ...rest.map(variant)] as [ReturnType<typeof variant>, ...ReturnType<typeof variant>[]];
};

export default defineConfig({
	site: "https://tafalado.lorenzo.soy",
	trailingSlash: "never",
	build: { format: "file" },
	// Lists every page (not the 404) at /sitemap-index.xml, with URLs from `site`.
	integrations: [sitemap()],
	fonts: [
		{
			name: "Alegreya",
			cssVariable: "--font-serif",
			provider: fontProviders.local(),
			options: {
				variants: fontsource("alegreya", [
					[400, "normal"],
					[400, "italic"],
					// Portuguese words in lesson intros (#56).
					[500, "italic"],
					[700, "normal"],
					[700, "italic"],
				]),
			},
			fallbacks: ["serif"],
		},
		{
			name: "Alegreya Sans",
			cssVariable: "--font-sans",
			provider: fontProviders.local(),
			options: {
				variants: fontsource("alegreya-sans", [
					[400, "normal"],
					[500, "normal"],
					[700, "normal"],
				]),
			},
			fallbacks: ["sans-serif"],
		},
	],
	// Sätteri, Astro's default processor, with one plugin: notes tables get `lang` from their column
	// headers (src/lib/table-lang.ts, docs/lesson-schema.md).
	markdown: { processor: satteri({ hastPlugins: [tableLang] }) },
	experimental: { incrementalBuild: true },
});
