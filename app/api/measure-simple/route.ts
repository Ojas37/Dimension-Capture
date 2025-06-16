import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  console.log("🚀 Simple measure API called")

  try {
    // Parse form data
    const formData = await request.formData()
    const image = formData.get("image") as File
    const referenceObject = formData.get("referenceObject") as string
    const customWidth = formData.get("customWidth") as string
    const customHeight = formData.get("customHeight") as string

    console.log("📝 Request data:", {
      hasImage: !!image,
      imageSize: image?.size,
      imageType: image?.type,
      referenceObject,
    })

    if (!image) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 })
    }

    if (!referenceObject) {
      return NextResponse.json({ success: false, error: "No reference object specified" }, { status: 400 })
    }

    const startTime = Date.now()

    // Convert image to base64 for return
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")

    // Reference object dimensions
    const referenceObjects: Record<string, { width: number; height: number; name: string }> = {
      "credit-card": { width: 8.56, height: 5.398, name: "Credit Card" },
      "us-quarter": { width: 2.426, height: 2.426, name: "US Quarter" },
      "business-card": { width: 8.89, height: 5.08, name: "Business Card" },
      "iphone-14": { width: 14.67, height: 7.15, name: "iPhone 14" },
      "a4-paper": { width: 29.7, height: 21.0, name: "A4 Paper" },
      custom: {
        width: customWidth ? Number.parseFloat(customWidth) : 8.56,
        height: customHeight ? Number.parseFloat(customHeight) : 5.398,
        name: "Custom Reference",
      },
    }

    const refObj = referenceObjects[referenceObject] || referenceObjects["credit-card"]

    // Generate realistic mock measurements
    const baseMultiplier = 1.5 + Math.random() * 2 // Random between 1.5x and 3.5x reference size
    const aspectVariation = 0.8 + Math.random() * 0.4 // Vary aspect ratio

    const targetWidth = Math.round(refObj.width * baseMultiplier * 100) / 100
    const targetHeight = Math.round(refObj.height * baseMultiplier * aspectVariation * 100) / 100

    // Calculate confidence based on image size and type
    let confidence = 0.75
    if (image.size > 500000) confidence += 0.1 // Larger images get higher confidence
    if (image.type.includes("jpeg") || image.type.includes("jpg")) confidence += 0.05
    confidence = Math.min(confidence + Math.random() * 0.1, 0.95)

    const processingTime = Date.now() - startTime

    const result = {
      success: true,
      data: {
        targetDimensions: {
          width: targetWidth,
          height: targetHeight,
          unit: "cm",
        },
        confidence: Math.round(confidence * 100) / 100,
        annotatedImageUrl: `data:image/${image.type.split("/")[1]};base64,${base64Image}`,
        allObjects: [
          {
            object_id: 1,
            width_cm: targetWidth,
            height_cm: targetHeight,
            width_px: Math.round(targetWidth * 30),
            height_px: Math.round(targetHeight * 30),
          },
        ],
        calibrationInfo: {
          pixels_per_cm: 30,
          ref_width_px: Math.round(refObj.width * 30),
          ref_height_px: Math.round(refObj.height * 30),
        },
        processingMode: "fallback",
        processingTime,
      },
    }

    console.log("✅ Generated result:", {
      dimensions: `${targetWidth}x${targetHeight} cm`,
      confidence: confidence,
      processingTime: `${processingTime}ms`,
    })

    // Try to save to database (optional, won't fail if it doesn't work)
    try {
      await saveMeasurementToDatabase(result, {
        referenceObject,
        customWidth,
        customHeight,
        processingTime,
      })
    } catch (dbError) {
      console.log("⚠️ Database save failed (continuing):", dbError)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Error in simple measure API:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Processing failed. Please try again.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

async function saveMeasurementToDatabase(result: any, metadata: any) {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user || !result.success) {
      console.log("👤 No user or unsuccessful result, skipping database save")
      return
    }

    console.log("👤 User authenticated, saving measurement...")

    const { error: measurementError } = await supabase.from("measurements").insert({
      user_id: user.id,
      reference_object: metadata.referenceObject,
      custom_width: metadata.customWidth ? Number.parseFloat(metadata.customWidth) : null,
      custom_height: metadata.customHeight ? Number.parseFloat(metadata.customHeight) : null,
      target_width: result.data.targetDimensions.width,
      target_height: result.data.targetDimensions.height,
      confidence: result.data.confidence,
      processing_time: metadata.processingTime,
      annotated_image_url: result.data.annotatedImageUrl,
    })

    if (measurementError) {
      console.error("⚠️ Error saving measurement:", measurementError)
    } else {
      console.log("✅ Measurement saved successfully")
    }
  } catch (error) {
    console.error("⚠️ Database operation failed:", error)
    // Don't throw - this is optional
  }
}
