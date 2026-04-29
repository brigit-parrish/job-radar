import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

export function getSupabaseWithAuth(userEmail: string) {
  const supabaseJwt = jwt.sign(
    {
      role: 'authenticated',
      email: userEmail,
      sub: userEmail,
      aud: 'authenticated',
    },
    process.env.SUPABASE_JWT_SECRET!,
    { expiresIn: '1h' }
  )

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
        },
      },
    }
  )
}