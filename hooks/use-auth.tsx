"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, metadata?: any) => Promise<any>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("🔐 Initializing auth state...")

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("❌ Error getting initial session:", error)
      } else {
        console.log("✅ Initial session:", session ? "Found" : "None")
      }
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Auth state changed:", event, session ? "User signed in" : "User signed out")
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      console.log("🔐 Cleaning up auth subscription")
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log("🔐 Sign in attempt for:", email)
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) {
      console.error("❌ Sign in error:", result.error)
    } else {
      console.log("✅ Sign in successful")
    }
    return result
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    console.log("📝 Sign up attempt for:", email)
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    if (result.error) {
      console.error("❌ Sign up error:", result.error)
    } else {
      console.log("✅ Sign up successful")
    }
    return result
  }

  const signOut = async () => {
    console.log("🚪 Signing out...")
    const result = await supabase.auth.signOut()
    if (result.error) {
      console.error("❌ Sign out error:", result.error)
    } else {
      console.log("✅ Sign out successful")
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
