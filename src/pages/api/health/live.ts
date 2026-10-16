import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
	Response.json({
		status: 'ok',
		uptime: process.uptime(),
		timestamp: new Date(),
	});
