"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  credits: number
  unlimited: boolean
  hasCredits: (required: number) => boolean
  refreshCredits: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState(0)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!error && data) {
      setProfile(data)
    }
  }

  const refreshCredits = async () => {
    if (!user) return

    const { data, error } = await supabase.rpc('get_user_credits', {
      p_user_id: user.id
    })

    if (!error && typeof data === 'number') {
      setCredits(data)
    }
  }

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchProfile(session.user.id)
        await refreshCredits()
      }

      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          (async () => {
            await fetchProfile(session.user.id)
            await refreshCredits()
          })()
        } else {
          setProfile(null)
          setCredits(0)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setCredits(0)
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    credits,
    unlimited: profile?.unlimited ?? false,
    hasCredits: (required: number) => (profile?.unlimited ?? false) || credits >= required,
    refreshCredits,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
