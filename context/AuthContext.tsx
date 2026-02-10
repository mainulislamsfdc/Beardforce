import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { authService } from '../services/auth/authService'
import { accessControl } from '../services/accessControl'
import { auditService } from '../services/auditService'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: any) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signInWithProvider: (provider: 'google' | 'github') => Promise<any>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Auto-provision organization for a user if they don't have one
  const ensureOrganization = async (u: User) => {
    try {
      const membership = await accessControl.getCurrentMembership(u.id)
      if (!membership) {
        const email = u.email || 'user'
        const name = u.user_metadata?.full_name || u.user_metadata?.name || email.split('@')[0]
        await accessControl.createOrganization(`${name}'s Organization`, u.id)
      }
    } catch (err) {
      console.warn('Org provisioning skipped:', err)
    }
  }

  useEffect(() => {
    // Get initial session
    authService.getSession().then((session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Auto-provision org on first OAuth login + track login
        if (event === 'SIGNED_IN' && session?.user) {
          await ensureOrganization(session.user)
          const provider = session.user.app_metadata?.provider || 'email'
          auditService.logLogin(session.user.id, 'login', provider)
        }
        if (event === 'SIGNED_OUT') {
          // user is already null at this point, use previous ref
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignUp = async (email: string, password: string, metadata?: any) => {
    const data = await authService.signUp(email, password, metadata)
    if (data.user) {
      try {
        const orgName = metadata?.company_name || `${email.split('@')[0]}'s Organization`
        await accessControl.createOrganization(orgName, data.user.id)
      } catch (err) {
        console.warn('Org creation skipped:', err)
      }
    }
    return data
  }

  const value = {
    user,
    session,
    loading,
    signUp: handleSignUp,
    signIn: authService.signIn,
    signInWithProvider: authService.signInWithProvider,
    signOut: authService.signOut,
    resetPassword: authService.resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
