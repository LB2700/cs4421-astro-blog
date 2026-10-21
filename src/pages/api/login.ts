import type { APIRoute } from 'astro';
import { loginUser } from '../../services/login';

export const POST: APIRoute = (context) => loginUser(context);
