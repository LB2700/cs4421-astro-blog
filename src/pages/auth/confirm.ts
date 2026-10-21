import { type EmailOtpType } from '@supabase/supabase-js'
import { type APIRoute } from 'astro'
import { createServerClient } from '../../services/supabase'

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null
  const next = requestUrl.searchParams.get('next') || '/'

  if (token_hash && type) {
    const supabase = createServerClient({ request, cookies })

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      return redirect(next)
    }

    // Do not log the token hash; it can be used to verify the email.
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        event: 'auth_confirmation_failed',
        error_name: error.name,
        error_message: error.message,
      }),
    )
  }

  // return the user to an error page with some instructions
  return redirect('/auth/auth-code-error')
}