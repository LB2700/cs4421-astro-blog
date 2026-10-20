import type { APIContext } from 'astro';
import { createServerClient } from './supabase';

interface SignUpCredentials {
	email: string;
	password: string;
}

export async function signUpNewUser(
	{ email, password }: SignUpCredentials,
	context: Pick<APIContext, 'request' | 'cookies'>,
) {
	const siteUrl = import.meta.env.PUBLIC_SITE_URL;
	if (!siteUrl) {
		throw new Error('PUBLIC_SITE_URL must be configured for email confirmation.');
	}

	let siteOrigin: URL;
	try {
		siteOrigin = new URL(siteUrl);
	} catch {
		throw new Error('PUBLIC_SITE_URL must be an absolute HTTP or HTTPS URL.');
	}

	if (siteOrigin.protocol !== 'https:' && siteOrigin.protocol !== 'http:') {
		throw new Error('PUBLIC_SITE_URL must use HTTP or HTTPS.');
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