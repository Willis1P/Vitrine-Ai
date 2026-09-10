import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getClient(token?: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  })
}

export async function getUserFromRequest(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, supabase: null }
  }

  const token = authHeader.slice(7)
  const supabase = getClient(token)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return { user: null, supabase: null }
  }

  return { user, supabase }
}

export function getClientWithToken(token: string): SupabaseClient {
  return getClient(token)
}

export function getServiceClient(): SupabaseClient {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}