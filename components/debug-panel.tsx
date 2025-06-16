"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react"

export function DebugPanel() {
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testFile, setTestFile] = useState<File | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug")
      const result = await response.json()
      setDiagnostics(result)
    } catch (error) {
      setDiagnostics({ error: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading(false)
    }
  }

  const testSimpleAPI = async () => {
    if (!testFile) {
      alert("Please select a test image first")
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("image", testFile)
      formData.append("referenceObject", "credit-card")

      const response = await fetch("/api/test-simple", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      setTestResult({ simple: result, status: response.status })
    } catch (error) {
      setTestResult({
        simple: { error: error instanceof Error ? error.message : String(error) },
        status: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const testMainAPI = async () => {
    if (!testFile) {
      alert("Please select a test image first")
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("image", testFile)
      formData.append("referenceObject", "credit-card")

      const response = await fetch("/api/measure", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      setTestResult({ main: result, status: response.status })
    } catch (error) {
      setTestResult({
        main: { error: error instanceof Error ? error.message : String(error) },
        status: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTestFile(e.target.files[0])
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Diagnostics</CardTitle>
          <CardDescription>Check system status and dependencies</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Run Diagnostics
          </Button>

          {diagnostics && (
            <div className="mt-4">
              <Tabs defaultValue="summary">
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="full">Full Report</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  {diagnostics.diagnostics && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">System</h4>
                        <Badge variant="outline">
                          {diagnostics.diagnostics.system?.platform} {diagnostics.diagnostics.system?.arch}
                        </Badge>
                        <Badge variant="outline">Node {diagnostics.diagnostics.system?.nodeVersion}</Badge>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Python Commands</h4>
                        {Object.entries(diagnostics.diagnostics.python?.commands || {}).map(
                          ([cmd, info]: [string, any]) => (
                            <Badge key={cmd} variant={info.available ? "default" : "destructive"}>
                              {cmd}: {info.available ? "✓" : "✗"}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="python">
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                    {JSON.stringify(diagnostics.diagnostics?.python, null, 2)}
                  </pre>
                </TabsContent>

                <TabsContent value="files">
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                    {JSON.stringify(diagnostics.diagnostics?.files, null, 2)}
                  </pre>
                </TabsContent>

                <TabsContent value="full">
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                    {JSON.stringify(diagnostics, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Testing</CardTitle>
          <CardDescription>Test the measurement APIs with a sample image</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Test Image</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 
                 file:mr-4 file:py-2 file:px-4 
                 file:rounded-full file:border-0 
                 file:text-sm file:font-semibold 
                 file:bg-blue-50 file:text-blue-700 
                 hover:file:bg-blue-100
                 cursor-pointer"
                style={{ position: "relative", zIndex: 1 }}
              />
            </div>
            {testFile && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {testFile.name} ({Math.round(testFile.size / 1024)}KB)
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={testSimpleAPI} disabled={loading || !testFile}>
              Test Simple API
            </Button>
            <Button onClick={testMainAPI} disabled={loading || !testFile}>
              Test Main API
            </Button>
          </div>

          {testResult && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Test Results</h4>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={testResult.status === 200 ? "default" : "destructive"}>
                  Status: {testResult.status}
                </Badge>
                {testResult.simple?.success || testResult.main?.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
