import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetUser, mockSignOut } = vi.hoisted(() => ({
	mockGetUser: vi.fn(),
	mockSignOut: vi.fn(),
}));

vi.mock('../../src/services/supabase', () => ({
	createServerClient: vi.fn(() => ({
		auth: {
			getUser: mockGetUser,
			signOut: mockSignOut,
		},
	})),
}));

import { getCurrentUser } from '../../src/services/auth';
import type { SupabaseRequestContext } from '../../src/services/supabase';

function makeContext() {
	return {
		request: new Request('http://localhost:4321/'),
		cookies: { set: vi.fn() },
	} satisfies SupabaseRequestContext;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockSignOut.mockResolvedValue({ error: null });
});

describe('getCurrentUser', () => {
	it('returns null when no auth session is present', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: { name: 'AuthSessionMissingError' },
		});

		await expect(getCurrentUser(makeContext())).resolves.toBeNull();
		expect(mockSignOut).not.toHaveBeenCalled();
	});

	it('treats an invalid refresh token as a signed-out visitor', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error: {
				name: 'AuthApiError',
				code: 'refresh_token_not_found',
				message: 'Invalid Refresh Token: Refresh Token Not Found',
			},
		});

		await expect(getCurrentUser(makeContext())).resolves.toBeNull();
		expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
	});

	it('still throws unrelated auth errors', async () => {
		const error = {
			name: 'AuthApiError',
			code: 'unexpected_failure',
			message: 'Unexpected auth failure',
		};
		mockGetUser.mockResolvedValue({
			data: { user: null },
			error,
		});

		await expect(getCurrentUser(makeContext())).rejects.toBe(error);
	});
});
