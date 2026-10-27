// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
	output: "server", // Enables on-demand server rendering
	adapter: node({
		mode: "standalone", // Self-contained HTTP server listening on a port
	}),
	vite: {
		server: {
			watch: {
				usePolling: true,
			},
		},
	},
	security: {
		allowedDomains: [
			{
				hostname: "ecssta-astro-trtxilfxdsrn-1402347678.us-east-1.elb.amazonaws.com",
			},
		],
	},
	site: "https://example.com",
	integrations: [mdx(), sitemap()],
	fonts: [
		{
			provider: fontProviders.local(),
			name: "Atkinson",
			cssVariable: "--font-atkinson",
			fallbacks: ["sans-serif"],
			options: {
				variants: [
					{
						src: ["./src/assets/fonts/atkinson-regular.woff"],
						weight: 400,
						style: "normal",
						display: "swap",
					},
					{
						src: ["./src/assets/fonts/atkinson-bold.woff"],
						weight: 700,
						style: "normal",
						display: "swap",
					},
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: "Logo Script",
			cssVariable: "--font-condiment",
			fallbacks: ["cursive"],
			options: {
				variants: [
					{
						src: ["./src/assets/fonts/logo-script-baseline.ttf"],
						weight: 400,
						style: "normal",
						display: "swap",
					},
				],
			},
		},
	],
});
