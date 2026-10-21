import {
	createServerClient as createSupabaseServerClient,
	parseCookieHeader,
} from '@supabase/ssr';
import type { APIContext } from 'astro';

export type SupabaseRequestContext = {
	request: Request;
	cookies: Pick<APIContext['cookies'], 'set'>;
};

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

export function createServerClient(context: SupabaseRequestContext) {
	if (!supabaseUrl || !supabaseKey) {
		throw new Error('Supabase URL and key must be configured.');
	}

	return createSupabaseServerClient(supabaseUrl, supabaseKey, {
		cookies: {
			getAll() {
				return parseCookieHeader(context.request.headers.get('Cookie') ?? '');
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					context.cookies.set(name, value, options);
				});
			},
		},
	});
}
