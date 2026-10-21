import type { APIContext } from 'astro';
import { signInUser } from './auth';
import type { SupabaseRequestContext } from './supabase';

type LoginContext = SupabaseRequestContext & Pick<APIContext, 'redirect'>;

export async function loginUser({
	request,
	cookies,
	redirect,
}: LoginContext): Promise<Response> {
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return redirect('/auth/login?error=invalid-input', 303);
	}

	const email = formData.get('email');
	const password = formData.get('password');
	if (
		typeof email !== 'string' ||
		typeof password !== 'string' ||
		email.trim().length === 0 ||
		email.length > 256 ||
		password.length === 0 ||
		password.length > 256
	) {
		return redirect('/auth/login?error=invalid-input', 303);
	}

	try {
		const { error } = await signInUser({ email, password }, { request, cookies });
		if (error) {
			// Keep provider details out of the response to avoid exposing account information.
			// eslint-disable-next-line no-console
			console.error(
				JSON.stringify({
					event: 'auth_login_failed',
					error_name: error.name,
					error_message: error.message,
				}),
			);
			return redirect('/auth/login?error=login-failed', 303);
		}

		return redirect('/', 303);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(
			JSON.stringify({
				event: 'auth_login_failed',
				error_name: error instanceof Error ? error.name : 'UnknownError',
				error_message: error instanceof Error ? error.message : 'Non-Error thrown',
			}),
		);
		return redirect('/auth/login?error=login-failed', 303);
	}
}
