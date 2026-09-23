import { getViteConfig } from "astro/config";
import { defineConfig } from "vitest/config";

export default getViteConfig(
	{
		test: {
			environment: "node",
			include: ["tests/**/*.test.ts"],
			setupFiles: ["./tests/setup.ts"],
		},
	},
	{/* customize astro config for tests */},
);
