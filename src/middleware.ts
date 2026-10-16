import { defineMiddleware } from 'astro:middleware';

const healthPaths = new Set(['/api/health/live', '/api/health/ready']);

export const onRequest = defineMiddleware(async (context, next) => {
	const path = new URL(context.request.url).pathname;
	if (!healthPaths.has(path)) {
		return next();
	}

	const startedAt = performance.now();
	const logRequest = (status: number, error?: unknown) => {
		const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

		// This middleware intentionally writes structured logs to the server output.
		// eslint-disable-next-line no-console
		console[level](
			JSON.stringify({
				event: 'http_request',
				level,
				method: context.request.method,
				path,
				status,
				duration_ms: Math.round(performance.now() - startedAt),
				timestamp: new Date().toISOString(),
				...(error instanceof Error ? { error_name: error.name } : {}),
			}),
		);
	};

	try {
		const response = await next();
		logRequest(response.status);
		return response;
	} catch (error) {
		logRequest(500, error);
		throw error;
	}
});
