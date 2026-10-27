import { createServerClient, type SupabaseRequestContext } from './supabase';

const deadRefreshTokenCodes = [
	'refresh_token_not_found',
	'refresh_token_already_used',
	'session_expired',
];

interface SignUpCredentials {
	email: string;
	password: string;
}

export async function signUpNewUser(
	{ email, password }: SignUpCredentials,
	context: SupabaseRequestContext,
) {
	const siteUrl = process.env.SITE_URL;
	if (!siteUrl) {
		throw new Error('SITE_URL must be configured for email confirmation.');
	}

	let siteOrigin: URL;
	try {
		siteOrigin = new URL(siteUrl);
	} catch {
		throw new Error('SITE_URL must be an absolute HTTP or HTTPS URL.');
	}

	if (siteOrigin.protocol !== 'https:' && siteOrigin.protocol !== 'http:') {
		throw new Error('SITE_URL must use HTTP or HTTPS.');
	}

	const emailRedirectTo = new URL('/auth/confirm', siteOrigin);
	const supabase = createServerClient(context);
	const { error } = await supabase.auth.signUp({
		email: email.trim().toLowerCase(),
		password,
		options: {
			emailRedirectTo: emailRedirectTo.toString(),
		},
	});

	return { error };
}

export async function signInUser(
	{ email, password }: SignUpCredentials,
	context: SupabaseRequestContext,
) {
	const supabase = createServerClient(context);
	const { error } = await supabase.auth.signInWithPassword({
		email: email.trim().toLowerCase(),
		password,
	});

	return { error };
}

export async function getCurrentUser(context: SupabaseRequestContext) {
	const supabase = createServerClient(context);
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		if (
			error.name === 'AuthSessionMissingError' ||
			(error.name === 'AuthApiError' && deadRefreshTokenCodes.includes(error.code ?? ''))
		) {
			if (error.name === 'AuthApiError') {
				const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
				if (signOutError) {
					throw signOutError;
				}
			}

			return null;
		}

		throw error;
	}

	return user;
}