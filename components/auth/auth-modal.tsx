"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("🔐 Attempting sign in for:", email)
      const { error, data } = await signIn(email, password)

      if (error) {
        console.error("Sign in error:", error)

        // Provide specific error messages
        let errorMessage = error.message
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again."
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Please check your email and click the verification link before signing in."
        } else if (error.message.includes("Too many requests")) {
          errorMessage = "Too many sign-in attempts. Please wait a few minutes and try again."
        }

        throw new Error(errorMessage)
      }

      console.log("✅ Sign in successful:", data)
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      })
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error("Sign in failed:", error)
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("📝 Attempting sign up for:", email)
      const { error, data } = await signUp(email, password, { full_name: fullName })

      if (error) {
        console.error("Sign up error:", error)

        // Provide specific error messages
        let errorMessage = error.message
        if (error.message.includes("User already registered")) {
          errorMessage = "An account with this email already exists. Try signing in instead."
        } else if (error.message.includes("Password should be at least")) {
          errorMessage = "Password must be at least 6 characters long."
        } else if (error.message.includes("Unable to validate email address")) {
          errorMessage = "Please enter a valid email address."
        }

        throw new Error(errorMessage)
      }

      console.log("✅ Sign up successful:", data)
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      console.error("Sign up failed:", error)
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setFullName("")
  }

  const AuthHelp = () => (
    <Alert className="mt-4">
      <Info className="h-4 w-4" />
      <AlertDescription className="text-xs">
        <strong>Having trouble?</strong>
        <ul className="mt-1 space-y-1">
          <li>• Check your email for verification links</li>
          <li>• Ensure your password is at least 6 characters</li>
          <li>• Try refreshing the page if sign-in fails</li>
          <li>• Check browser console for detailed error messages</li>
        </ul>
      </AlertDescription>
    </Alert>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to DimensionSnap</DialogTitle>
          <DialogDescription>Sign in to save your measurements and access your history.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
          <AuthHelp />
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
