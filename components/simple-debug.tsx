"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Bug, Heart, Info } from "lucide-react"

export function SimpleDebug() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [imageTestResult, setImageTestResult] = useState<any>(null)

  const testHealth = async () => {
    try {
      console.log("💓 Testing basic health...")
      const response = await fetch("/api/health")
      const result = await response.json()

      setHealthStatus({
        status: response.status,
        ok: response.ok,
        data: result,
      })

      if (response.ok) {
        alert("✅ Basic API is working!")
      } else {
        alert(`⚠️ Health check failed: ${response.status}`)
      }
    } catch (error) {
      setHealthStatus({
        status: "error",
        ok: false,
        error: String(error),
      })
      alert(`❌ Health check failed: ${error}`)
    }
  }

  const runDiagnostics = async () => {
    setLoading(true)

    try {
      console.log("🔍 Running diagnostics...")

      const response = await fetch("/api/debug")
      console.log("📡 Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("📊 Diagnostics result:", result)
      setDiagnostics(result)
    } catch (error) {
      console.error("❌ Diagnostics error:", error)
      setDiagnostics({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        type: "fetch_error",
      })
    } finally {
      setLoading(false)
    }
  }

  const testImageUpload = async () => {
    setImageTestResult(null)

    // Create a small test image (1x1 pixel PNG)
    const canvas = document.createElement("canvas")
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.fillStyle = "red"
      ctx.fillRect(0, 0, 50, 50)
      ctx.fillStyle = "blue"
      ctx.fillRect(50, 50, 50, 50)
    }

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setImageTestResult({ success: false, error: "Could not create test image" })
        return
      }

      try {
        const formData = new FormData()
        formData.append("image", blob, "test.png")
        formData.append("referenceObject", "credit-card")

        console.log("🧪 Testing image upload...")
        const response = await fetch("/api/test-simple", {
          method: "POST",
          body: formData,
        })

        const result = await response.json()

        setImageTestResult({
          success: response.ok && result.success,
          status: response.status,
          data: result,
        })

        if (response.ok && result.success) {
          alert("✅ Image upload test successful!")
        } else {
          alert(`⚠️ Image upload test failed: ${result.error || "Unknown error"}`)
        }
      } catch (error) {
        setImageTestResult({
          success: false,
          error: String(error),
        })
        alert(`❌ Image upload test error: ${error}`)
      }
    }, "image/png")
  }

  return (
    <div className="space-y-6">
      {/* Runtime Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Runtime Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Next.js Lite Runtime</h4>
            <p className="text-sm text-blue-700 mb-2">
              You're running in the Next.js environment, which has some limitations:
            </p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Limited Node.js module access (no os, child_process, etc.)</li>
              <li>Python testing happens during actual image processing</li>
              <li>File system operations may be restricted</li>
              <li>The app will use fallback processing if Python isn't available</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            System Diagnostics
          </CardTitle>
          <CardDescription>Step-by-step testing to verify functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Health Check */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Step 1: Basic Health Check
            </h4>
            <div className="flex gap-2 items-center">
              <Button onClick={testHealth} size="sm">
                Test Basic API
              </Button>
              {healthStatus && (
                <Badge variant={healthStatus.ok ? "default" : "destructive"}>
                  {healthStatus.ok ? "✅ Working" : `❌ Status ${healthStatus.status}`}
                </Badge>
              )}
            </div>
            {healthStatus && (
              <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto max-h-32">
                {JSON.stringify(healthStatus, null, 2)}
              </pre>
            )}
          </div>

          {/* Step 2: Full Diagnostics */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Step 2: System Diagnostics</h4>
            <div className="flex gap-2 items-center">
              <Button onClick={runDiagnostics} disabled={loading} size="sm">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Run Full Diagnostics
              </Button>
              {diagnostics && (
                <Badge variant={diagnostics.success ? "default" : "destructive"}>
                  {diagnostics.success ? "✅ Success" : "❌ Error"}
                </Badge>
              )}
            </div>
          </div>

          {/* Step 3: Image Upload Test */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Step 3: Image Processing Test</h4>
            <div className="flex gap-2 items-center">
              <Button onClick={testImageUpload} size="sm">
                Test Image Upload
              </Button>
              {imageTestResult && (
                <Badge variant={imageTestResult.success ? "default" : "destructive"}>
                  {imageTestResult.success ? "✅ Working" : "❌ Failed"}
                </Badge>
              )}
            </div>
            {imageTestResult && (
              <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto max-h-32">
                {JSON.stringify(imageTestResult, null, 2)}
              </pre>
            )}
          </div>

          {/* Results Display */}
          {diagnostics && (
            <div className="space-y-4">
              {diagnostics.success ? (
                <div className="space-y-4">
                  {/* Runtime Info */}
                  {diagnostics.diagnostics?.runtime && (
                    <div>
                      <h4 className="font-medium mb-2">Runtime Environment</h4>
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-sm">Type: {diagnostics.diagnostics.runtime.type}</div>
                        <div className="text-sm mt-2">Limitations:</div>
                        <ul className="text-xs text-gray-600 list-disc list-inside ml-2">
                          {diagnostics.diagnostics.runtime.limitations?.map((limitation: string, index: number) => (
                            <li key={index}>{limitation}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* System Info */}
                  {diagnostics.diagnostics?.system && (
                    <div>
                      <h4 className="font-medium mb-2">System Information</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded">
                        <div>Platform: {diagnostics.diagnostics.system.platform}</div>
                        <div>Architecture: {diagnostics.diagnostics.system.arch}</div>
                        <div>Node: {diagnostics.diagnostics.system.nodeVersion}</div>
                        <div>Runtime: {diagnostics.diagnostics.system.runtime}</div>
                      </div>
                    </div>
                  )}

                  {/* Environment */}
                  {diagnostics.diagnostics?.environment && (
                    <div>
                      <h4 className="font-medium mb-2">Environment</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span>Supabase URL:</span>
                          <Badge
                            variant={diagnostics.diagnostics.environment.hasSupabaseUrl ? "default" : "destructive"}
                          >
                            {diagnostics.diagnostics.environment.hasSupabaseUrl ? "✅ Set" : "❌ Missing"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Supabase Key:</span>
                          <Badge
                            variant={diagnostics.diagnostics.environment.hasSupabaseKey ? "default" : "destructive"}
                          >
                            {diagnostics.diagnostics.environment.hasSupabaseKey ? "✅ Set" : "❌ Missing"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {diagnostics.diagnostics?.errors && diagnostics.diagnostics.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-amber-600">Issues Found</h4>
                      {diagnostics.diagnostics.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-amber-700 bg-amber-50 p-2 rounded mb-1">
                          ⚠️ {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Error Details</h4>
                  <p className="text-sm text-red-700">{diagnostics.error}</p>
                </div>
              )}

              {/* Raw Data */}
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-600">Show Raw Data</summary>
                <pre className="mt-2 text-xs bg-gray-50 p-4 rounded overflow-auto max-h-64">
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">✅ Good News!</h4>
            <p className="text-sm text-green-700 mb-2">Your app is running in Next.js mode, which means:</p>
            <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
              <li>The measurement functionality will work with fallback processing</li>
              <li>You can upload images and get dimension measurements</li>
              <li>Python scripts will be tested when you actually process an image</li>
              <li>The app is designed to work even without Python dependencies</li>
            </ul>
            <p className="text-sm text-green-700 mt-2">
              <strong>Try uploading an image in the "New Measurement" tab to test the full functionality!</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
