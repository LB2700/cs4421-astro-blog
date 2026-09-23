import eslintPluginAstro from "eslint-plugin-astro";

export default [
	// add more generic rule sets here, such as:
	// js.configs.recommended,
	...eslintPluginAstro.configs.recommended,
	{
		files: ["**/*.ts"],
		rules: {
			"no-console": "error",
			// override/add rules settings here, such as:
			// "astro/no-set-html-directive": "error"
		},
	},
];
