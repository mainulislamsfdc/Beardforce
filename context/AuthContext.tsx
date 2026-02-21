import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { authService } from '../services/auth/authService'
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

        // Track login event (org provisioning is handled by OrgContext)
        if (event === 'SIGNED_IN' && session?.user) {
          const provider = session.user.app_metadata?.provider || 'email'
          auditService.logLogin(session.user.id, 'login', provider)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignUp = async (email: string, password: string, metadata?: any) => {
    const data = await authService.signUp(email, password, metadata)
    // Org provisioning is handled by OrgContext.loadMembership() once the session is active
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
