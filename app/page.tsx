"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, Camera, Ruler, Download, RotateCcw, CheckCircle, AlertCircle, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { AuthButton } from "@/components/auth/auth-button"
import { MeasurementHistory } from "@/components/measurement-history"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SimpleDebug } from "@/components/simple-debug"

interface ReferenceObject {
  id: string
  name: string
  width: number
  height: number
  unit: string
}

interface MeasurementResult {
  targetDimensions: {
    width: number
    height: number
    unit: string
  }
  confidence: number
  annotatedImageUrl: string
}

const referenceObjects: ReferenceObject[] = [
  { id: "credit-card", name: "Credit/Debit Card", width: 8.56, height: 5.398, unit: "cm" },
  { id: "us-quarter", name: "US Quarter", width: 2.426, height: 2.426, unit: "cm" },
  { id: "business-card", name: "Business Card", width: 8.89, height: 5.08, unit: "cm" },
  { id: "iphone-14", name: "iPhone 14", width: 14.67, height: 7.15, unit: "cm" },
  { id: "a4-paper", name: "A4 Paper", width: 29.7, height: 21.0, unit: "cm" },
  { id: "custom", name: "Custom Reference", width: 0, height: 0, unit: "cm" },
]

export default function DimensionSnap() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedReference, setSelectedReference] = useState<string>("")
  const [customWidth, setCustomWidth] = useState<string>("")
  const [customHeight, setCustomHeight] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [result, setResult] = useState<MeasurementResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState("measure")

  const { toast } = useToast()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, WebP)",
        variant: "destructive",
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      })
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    setResult(null)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleMeasure = async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please upload an image first",
        variant: "destructive",
      })
      return
    }

    if (!selectedReference) {
      toast({
        title: "No reference object selected",
        description: "Please select a reference object",
        variant: "destructive",
      })
      return
    }

    if (selectedReference === "custom" && (!customWidth || !customHeight)) {
      toast({
        title: "Custom dimensions required",
        description: "Please enter custom reference object dimensions",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      console.log("🚀 Starting measurement process...")

      // Create form data
      const formData = new FormData()
      formData.append("image", selectedImage)
      formData.append("referenceObject", selectedReference)

      if (selectedReference === "custom") {
        formData.append("customWidth", customWidth)
        formData.append("customHeight", customHeight)
      }

      console.log("📤 Sending request to API...")

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      // Call the reliable API
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch("/api/measure-simple", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      clearInterval(progressInterval)
      setProcessingProgress(100)

      console.log("📥 Received response:", response.status, response.statusText)

      if (!response.ok) {
        // Get detailed error information
        let errorMessage = `Server error: ${response.status}`

        try {
          const errorText = await response.text()
          console.error("❌ API Error Response:", errorText)

          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error || errorJson.details || errorMessage
          } catch {
            errorMessage = errorText.substring(0, 200) || errorMessage
          }
        } catch {
          errorMessage = response.statusText || errorMessage
        }

        throw new Error(errorMessage)
      }

      const apiResult = await response.json()
      console.log("✅ API Result:", apiResult)

      if (!apiResult.success) {
        throw new Error(apiResult.error || "Processing failed")
      }

      setResult(apiResult.data)

      toast({
        title: "Measurement complete!",
        description: `Object dimensions: ${apiResult.data.targetDimensions.width} × ${apiResult.data.targetDimensions.height} cm`,
      })
    } catch (error) {
      console.error("❌ Processing error:", error)

      let errorMessage = "An unexpected error occurred. Please try again."

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timed out. Please try with a smaller image or try again later."
        } else if (error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again."
        } else {
          errorMessage = error.message
        }
      }

      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setSelectedReference("")
    setCustomWidth("")
    setCustomHeight("")
    setResult(null)
    setProcessingProgress(0)
  }

  const downloadResult = () => {
    if (result?.annotatedImageUrl) {
      const link = document.createElement("a")
      link.href = result.annotatedImageUrl
      link.download = "measured-dimensions.png"
      link.click()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Ruler className="h-8 w-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900">DimensionSnap</h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Transform your photos into precise measurements. Upload an image with a reference object and get accurate
              dimensions instantly.
            </p>
          </div>
          <div className="absolute top-4 right-4">
            <AuthButton />
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="measure">New Measurement</TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="debug">Debug</TabsTrigger>
            </TabsList>

            <TabsContent value="measure" className="space-y-6">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Image
                  </CardTitle>
                  <CardDescription>
                    Upload a photo containing the objects you want to measure along with a reference object
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    {imagePreview ? (
                      <div className="space-y-4">
                        <img
                          src={imagePreview || "/placeholder.svg"}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-lg shadow-md"
                        />
                        <div className="flex gap-2 justify-center">
                          <Button variant="outline" onClick={handleReset}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Change Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Camera className="h-8 w-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-900">Drop your image here, or click to browse</p>
                          <p className="text-sm text-gray-500 mt-1">Supports JPEG, PNG, WebP up to 10MB</p>
                        </div>
                        <div className="relative">
                          <Button variant="outline" type="button">
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileInputChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            style={{ zIndex: 2 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reference Object Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Reference Object</CardTitle>
                  <CardDescription>Select the reference object in your image for scale calibration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="reference-select">Reference Object</Label>
                    <Select value={selectedReference} onValueChange={setSelectedReference}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reference object" />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceObjects.map((obj) => (
                          <SelectItem key={obj.id} value={obj.id}>
                            {obj.name} {obj.id !== "custom" && `(${obj.width} × ${obj.height} ${obj.unit})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedReference === "custom" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="custom-width">Width (cm)</Label>
                        <Input
                          id="custom-width"
                          type="number"
                          step="0.1"
                          placeholder="8.56"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-height">Height (cm)</Label>
                        <Input
                          id="custom-height"
                          type="number"
                          step="0.1"
                          placeholder="5.398"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Processing Section */}
              {isProcessing && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                        <span className="text-sm font-medium">Processing your image...</span>
                      </div>
                      <Progress value={processingProgress} className="w-full" />
                      <p className="text-xs text-gray-500">
                        This may take up to 15 seconds depending on image complexity
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Results Section */}
              {result && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Measurement Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Object Dimensions</h3>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Width:</span>
                              <span className="font-mono font-semibold">
                                {result.targetDimensions.width} {result.targetDimensions.unit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Height:</span>
                              <span className="font-mono font-semibold">
                                {result.targetDimensions.height} {result.targetDimensions.unit}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold mb-2">Confidence Score</h3>
                          <div className="flex items-center gap-2">
                            <Progress value={result.confidence * 100} className="flex-1" />
                            <Badge variant={result.confidence > 0.8 ? "default" : "secondary"}>
                              {Math.round(result.confidence * 100)}%
                            </Badge>
                          </div>
                          {result.confidence < 0.8 && (
                            <div className="flex items-center gap-2 mt-2 text-amber-600">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm">
                                Low confidence. Consider retaking the photo with better lighting.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-3">Annotated Image</h3>
                        <img
                          src={result.annotatedImageUrl || "/placeholder.svg"}
                          alt="Annotated result"
                          className="w-full rounded-lg shadow-md border"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={downloadResult}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Result
                      </Button>
                      <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        New Measurement
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Button */}
              {!isProcessing && !result && (
                <div className="text-center space-y-4">
                  <Button
                    size="lg"
                    onClick={handleMeasure}
                    disabled={!selectedImage || !selectedReference}
                    className="px-8 py-3"
                  >
                    <Ruler className="h-5 w-5 mr-2" />
                    Measure Dimensions
                  </Button>

                  {/* Debug Test Button */}
                  <div>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch("/api/measure-simple", {
                            method: "POST",
                            body: new FormData(),
                          })
                          const result = await response.text()
                          console.log("Test result:", result)
                          alert(`Test response: ${response.status} - Check console for details`)
                        } catch (error) {
                          console.error("Test error:", error)
                          alert(`Test error: ${error}`)
                        }
                      }}
                    >
                      Test API Endpoint
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <MeasurementHistory />
            </TabsContent>
            <TabsContent value="debug">
              <SimpleDebug />
            </TabsContent>
          </Tabs>
        </div>

        {/* How it Works Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>Our AI-powered measurement system in 4 simple steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">1. Upload Photo</h3>
                  <p className="text-sm text-gray-600">Take a photo with your objects and a reference item</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Camera className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold">2. AI Detection</h3>
                  <p className="text-sm text-gray-600">Our AI identifies objects and shapes in your image</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <Ruler className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">3. Scale Calibration</h3>
                  <p className="text-sm text-gray-600">Uses reference object to calculate real-world scale</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold">4. Get Results</h3>
                  <p className="text-sm text-gray-600">Receive accurate dimensions in centimeters</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
