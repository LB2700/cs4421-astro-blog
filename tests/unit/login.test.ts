import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSignInWithPassword } = vi.hoisted(() => ({
	mockSignInWithPassword: vi.fn(),
}));

vi.mock('../../src/services/supabase', () => ({
	createServerClient: vi.fn(() => ({
		auth: {
			signInWithPassword: mockSignInWithPassword,
		},
	})),
}));

import type { APIContext } from 'astro';
import { loginUser } from '../../src/services/login';

function makeContext(fields: Record<string, string>) {
	const request = new Request('http://localhost:4321/api/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(fields),
	});

	return {
		request,
		cookies: { set: vi.fn() },
		redirect: (location: string, status = 302) =>
			new Response(null, { status, headers: { location } }),
	} satisfies Pick<APIContext, 'redirect'> & {
		request: Request;
		cookies: Pick<APIContext['cookies'], 'set'>;
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mockSignInWithPassword.mockResolvedValue({ error: null });
});

describe('POST /api/login', () => {
	it('normalizes the email, signs in, and redirects to the home page', async () => {
		const response = await loginUser(
			makeContext({
				email: '  PERSON@example.com ',
				password: 'test-only-password',
			}),
		);

		expect(mockSignInWithPassword).toHaveBeenCalledWith({
			email: 'person@example.com',
			password: 'test-only-password',
		});
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/');
	});

	it('rejects missing fields without calling Supabase', async () => {
		const response = await loginUser(makeContext({ email: 'person@example.com' }));

		expect(mockSignInWithPassword).not.toHaveBeenCalled();
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/login?error=invalid-input');
	});

	it('rejects an empty email without calling Supabase', async () => {
		const response = await loginUser(
			makeContext({
				email: '',
				password: 'test-only-password',
			}),
		);

		expect(mockSignInWithPassword).not.toHaveBeenCalled();
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/login?error=invalid-input');
	});

	it('rejects a whitespace-only email without calling Supabase', async () => {
		const response = await loginUser(
			makeContext({
				email: '             ',
				password: 'test-only-password',
			}),
		);

		expect(mockSignInWithPassword).not.toHaveBeenCalled();
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/login?error=invalid-input');
	});

	it('rejects an email longer than 256 characters without calling Supabase', async () => {
		const emailDomain = '@example.com';
		const email = 'a'.repeat(257 - emailDomain.length) + emailDomain;
		const response = await loginUser(
			makeContext({
				email,
				password: 'test-only-password',
			}),
		);

		expect(mockSignInWithPassword).not.toHaveBeenCalled();
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/login?error=invalid-input');
	});

	it('rejects an email longer than 256 characters when it includes surrounding whitespace', async () => {
		const emailDomain = '@example.com  ';
		const email = 'a'.repeat(257 - emailDomain.length) + emailDomain;
		const response = await loginUser(
			makeContext({
				email,
				password: 'test-only-password',
			}),
		);

		expect(mockSignInWithPassword).not.toHaveBeenCalled();
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/login?error=invalid-input');
	});

	it('accepts an email shorter than 256 characters with surrounding whitespace', async () => {
		const emailDomain = '@example.com  ';
		const email = 'a'.repeat(255 - emailDomain.length) + emailDomain;
		const response = await loginUser(
			makeContext({
				email,
				password: 'test-only-password',
			}),
		);

		expect(mockSignInWithPassword).toHaveBeenCalledWith({
			email: email.trim().toLowerCase(),
			password: 'test-only-password',
		});
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/');
	});

	it('rejects an empty password without calling Supabase', async () => {
		const response = await loginUser(
			makeContext({
				email: 'PERSON@example.com',
				password: '',
			}),
		);

		expect(mockSignInWithPassword).not.toHaveBeenCalled();
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/login?error=invalid-input');
	});

	it('rejects a password longer than 256 characters without calling Supabase', async () => {
		const response = await loginUser(
			makeContext({
				email: 'PERSON@example.com',
				password: 'a'.repeat(257),
			}),
		);

		expect(mockSignInWithPassword).not.toHaveBeenCalled();
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/login?error=invalid-input');
	});

	it('returns a generic error when Supabase rejects the credentials', async () => {
		mockSignInWithPassword.mockResolvedValue({
			error: { name: 'AuthApiError', message: 'Invalid login credentials' },
		});

		const response = await loginUser(
			makeContext({
				email: 'person@example.com',
				password: 'incorrect-password',
			}),
		);

		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/login?error=login-failed');
	});
});
