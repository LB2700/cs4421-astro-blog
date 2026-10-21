import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'; 

const BASE_URL = 'http://localhost:4321';

const { mockSignUp } = vi.hoisted(() => ({
    mockSignUp: vi.fn(),
}));

// Replace the project’s Supabase client factory with a fake client.
// The route and auth service still execute normally.
vi.mock('../../src/services/supabase', () => ({
    createServerClient: vi.fn(() => ({
        auth: {
            signUp: mockSignUp,
        },
    })),
}));

import type { APIContext } from 'astro';
import { registerUser } from '../../src/services/register';

function makeContext(fields: Record<string, string>) {
    const request = new Request(new URL('/api/register',BASE_URL), {
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
    vi.stubEnv('SITE_URL', BASE_URL);
    mockSignUp.mockResolvedValue({ error: null });
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('POST /api/register', () => {
    it('normalizes the email and redirects after signup', async () => {
        const response = await registerUser(
            makeContext({
                email: '  PERSON@example.com ',
                password: 'test-only-password',
            }),
        );

        expect(mockSignUp).toHaveBeenCalledWith({
            email: 'person@example.com',
            password: 'test-only-password',
            options: {
                emailRedirectTo: new URL("/auth/confirm",BASE_URL).toString()
            },
        });
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?status=check-email',
        );
    });

    it('rejects missing fields without calling Supabase', async () => {
        const response = await registerUser(makeContext({ email: 'person@example.com' }));

        expect(mockSignUp).not.toHaveBeenCalled();
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?error=invalid-input',
        );
    });

    it('rejects empty email strings without calling Supabase', async () => {
        const response = await registerUser(
            makeContext({
                email: "",
                password: "test-only-password"
            })
        )

        expect(mockSignUp).not.toHaveBeenCalled()
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?error=invalid-input',
        );   
    })

    it('rejects empty email strings with whitespace without calling Supabase', async () => {
        const response = await registerUser(
            makeContext({
                email: "             ",
                password: "test-only-password"
            })
        )

        expect(mockSignUp).not.toHaveBeenCalled()
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?error=invalid-input',
        );
    })

    it('rejects email strings that are 256 characters or over without calling Supabase', async () => {
        
        const emailDomain = "@example.com";
        const response = await registerUser(
            makeContext({
                email: "a".repeat(257-emailDomain.length) + emailDomain,
                password: "test-only-password"
            })
        )

        expect(mockSignUp).not.toHaveBeenCalled()
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?error=invalid-input',
        );
    })

    it('rejects email strings that are 256 characters or over, ignoring whitespace, without calling Supabase', async () => {
        
        const emailDomain = "@example.com  ";
        const response = await registerUser(
            makeContext({
                email: "a".repeat(257-emailDomain.length) + emailDomain,
                password: "test-only-password"
            })
        )

        expect(mockSignUp).not.toHaveBeenCalled()
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?error=invalid-input',
        );
    })

    it('accepts email strings that are under 256 characters, only when ignoring whitespace', async () => {
        
        const emailDomain = "@example.com  ";
        const response = await registerUser(
            makeContext({
                email: "a".repeat(255-emailDomain.length) + emailDomain,
                password: "test-only-password"
            })
        )

        expect(mockSignUp).toHaveBeenCalled()
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?status=check-email',
        );
    })

    it('rejects empty password strings without calling Supabase', async () => {
        const response = await registerUser(
            makeContext({
                email: "PERSON@example.com",
                password: ""
            })
        )

        expect(mockSignUp).not.toHaveBeenCalled()
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?error=invalid-input',
        );   
    })

    it('rejects password strings that are 256 characters or over without calling Supabase', async () => {
        
        const emailDomain = "@example.com";
        const response = await registerUser(
            makeContext({
                email: "PERSON@example.com",
                password: "a".repeat(257)
            })
        )

        expect(mockSignUp).not.toHaveBeenCalled()
        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?error=invalid-input',
        );
    })

    it('shows a generic failure when Supabase returns an error', async () => {
        mockSignUp.mockResolvedValue({
            error: { name: 'AuthApiError', message: 'Provider detail' },
        });

        const response = await registerUser(
            makeContext({
                email: 'person@example.com',
                password: 'test-only-password',
            }),
        );

        expect(response.status).toBe(303);
        expect(response.headers.get('location')).toBe(
            '/auth/signup?error=signup-failed',
        );
    });
});