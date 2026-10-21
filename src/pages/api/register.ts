import type { APIRoute } from 'astro';
import { registerUser } from '../../services/register';

export const POST: APIRoute = (context) => registerUser(context);
