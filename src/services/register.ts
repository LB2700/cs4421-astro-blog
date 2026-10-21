import type { APIContext } from 'astro';
import { signUpNewUser } from './auth';
import type { SupabaseRequestContext } from './supabase';

type RegisterContext = SupabaseRequestContext & Pick<APIContext, 'redirect'>;

export async function registerUser({
	request,
	cookies,
	redirect,
}: RegisterContext): Promise<Response> {
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return redirect('/auth/signup?error=invalid-input', 303);
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
		return redirect('/auth/signup?error=invalid-input', 303);
	}

	try {
		const { error } = await signUpNewUser({ email, password }, { request, cookies });
		if (error) {
			// Do not include credentials or provider details in client responses.
			// eslint-disable-next-line no-console
			console.error(
				JSON.stringify({
					event: 'auth_signup_failed',
					error_name: error.name,
					error_message: error.message,
				}),
			);
			return redirect('/auth/signup?error=signup-failed', 303);
		}

		return redirect('/auth/signup?status=check-email', 303);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(
			JSON.stringify({
				event: 'auth_signup_failed',
				error_name: error instanceof Error ? error.name : 'UnknownError',
				error_message: error instanceof Error ? error.message : 'Non-Error thrown',
			}),
		);
		return redirect('/auth/signup?error=signup-failed', 303);
	}
}
