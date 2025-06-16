"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { Eye, EyeOff, RefreshCw, Database, Shield } from "lucide-react"

export function AuthDebug() {
  const { user, loading } = useAuth()
  const [showDetails, setShowDetails] = useState(false)
  const [testResults, setTestResults] = useState<any>({})
  const [testing, setTesting] = useState(false)

  const runDiagnostics = async () => {
    setTesting(true)
    const results: any = {}

    try {
      // Test 1: Check Supabase connection
      console.log("🔍 Testing Supabase connection...")
      const { data: healthCheck, error: healthError } = await supabase.from("profiles").select("count").limit(1)

      results.supabaseConnection = {
        status: healthError ? "error" : "success",
        message: healthError ? healthError.message : "Connected successfully",
        error: healthError,
      }

      // Test 2: Check environment variables
      console.log("🔍 Checking environment variables...")
      results.envVars = {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + "...",
        keyValue: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + "...",
      }

      // Test 3: Check current session
      console.log("🔍 Checking current session...")
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      results.session = {
        status: sessionError ? "error" : session.session ? "authenticated" : "unauthenticated",
        message: sessionError ? sessionError.message : session.session ? "Valid session found" : "No active session",
        hasUser: !!session.session?.user,
        userId: session.session?.user?.id,
        email: session.session?.user?.email,
        emailConfirmed: session.session?.user?.email_confirmed_at ? "Yes" : "No",
      }

      // Test 4: Check database policies
      if (user) {
        console.log("🔍 Testing database access...")
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        results.databaseAccess = {
          status: profileError ? "error" : "success",
          message: profileError ? profileError.message : "Profile access successful",
          hasProfile: !!profileData,
          profileData: profileData,
        }
      }

      // Test 5: Check database permissions
      if (user) {
        console.log("🔍 Testing database permissions...")
        try {
          // Test if we can create a test measurement
          const testMeasurement = {
            user_id: user.id,
            reference_object: "test",
            target_width: 10.0,
            target_height: 5.0,
            confidence: 0.8,
          }

          const { data: insertData, error: insertError } = await supabase
            .from("measurements")
            .insert(testMeasurement)
            .select()
            .single()

          if (insertError) {
            results.databasePermissions = {
              status: "error",
              message: `Insert failed: ${insertError.message}`,
              error: insertError,
            }
          } else {
            // Clean up test data
            await supabase.from("measurements").delete().eq("id", insertData.id)

            results.databasePermissions = {
              status: "success",
              message: "Database permissions working correctly",
              canInsert: true,
              canDelete: true,
            }
          }
        } catch (error: any) {
          results.databasePermissions = {
            status: "error",
            message: `Permission test failed: ${error.message}`,
            error,
          }
        }
      }

      // Test 6: Check auth settings
      console.log("🔍 Checking auth configuration...")
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        results.authConfig = {
          status: authError ? "error" : "success",
          message: authError ? authError.message : "Auth configuration valid",
          userMetadata: authData.user?.user_metadata,
        }
      } catch (error: any) {
        results.authConfig = {
          status: "error",
          message: error.message,
          error,
        }
      }
    } catch (error: any) {
      console.error("Diagnostic error:", error)
      results.generalError = {
        status: "error",
        message: error.message,
        error,
      }
    }

    setTestResults(results)
    setTesting(false)
    console.log("🔍 Diagnostic results:", results)
  }

  const clearSession = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authentication Debug Panel
        </CardTitle>
        <CardDescription>Diagnostic tools to help debug authentication issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Auth State */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Current Authentication State</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge variant={loading ? "secondary" : user ? "default" : "destructive"}>
                {loading ? "Loading..." : user ? "Authenticated" : "Not Authenticated"}
              </Badge>
            </div>
            {user && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Email:</span>
                  <span className="text-sm font-mono">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Verified:</span>
                  <Badge variant={user.email_confirmed_at ? "default" : "destructive"}>
                    {user.email_confirmed_at ? "Yes" : "No"}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>

        {/* User Details */}
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">User Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {showDetails && (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Diagnostic Tests */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Run Diagnostics</h3>
            <Button onClick={runDiagnostics} disabled={testing} size="sm">
              {testing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
              {testing ? "Running..." : "Run Tests"}
            </Button>
          </div>

          {Object.keys(testResults).length > 0 && (
            <div className="space-y-4">
              {Object.entries(testResults).map(([testName, result]: [string, any]) => (
                <div key={testName} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium capitalize">{testName.replace(/([A-Z])/g, " $1")}</h4>
                    <Badge
                      variant={
                        result.status === "success"
                          ? "default"
                          : result.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                  {result.status === "error" && result.error && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-red-600">Error Details</summary>
                      <pre className="mt-2 bg-red-50 p-2 rounded overflow-auto">
                        {JSON.stringify(result.error, null, 2)}
                      </pre>
                    </details>
                  )}
                  {result.status === "success" && Object.keys(result).length > 2 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-green-600">Success Details</summary>
                      <pre className="mt-2 bg-green-50 p-2 rounded overflow-auto">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Quick Actions</h3>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={clearSession}>
              Clear Session
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="outline" onClick={() => console.log("Auth state:", { user, loading })}>
              Log Auth State
            </Button>
          </div>
        </div>

        {/* Environment Check */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Environment Variables</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">SUPABASE_URL:</span>
              <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_URL ? "default" : "destructive"}>
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">SUPABASE_ANON_KEY:</span>
              <Badge variant={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "default" : "destructive"}>
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
