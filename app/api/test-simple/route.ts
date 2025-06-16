import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Simple test API called")

    const formData = await request.formData()
    const image = formData.get("image") as File
    const referenceObject = formData.get("referenceObject") as string

    if (!image) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 })
    }

    console.log("📝 Image received:", {
      name: image.name,
      size: image.size,
      type: image.type,
    })

    // Convert image to base64 (test this step)
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")

    console.log("✅ Image converted to base64, length:", base64Image.length)

    // Return a simple mock result
    const mockResult = {
      success: true,
      data: {
        targetDimensions: {
          width: 12.5,
          height: 8.3,
          unit: "cm",
        },
        confidence: 0.85,
        annotatedImageUrl: `data:image/jpeg;base64,${base64Image}`,
        allObjects: [
          {
            object_id: 1,
            width_cm: 12.5,
            height_cm: 8.3,
            width_px: 375,
            height_px: 249,
          },
        ],
        calibrationInfo: {
          pixels_per_cm: 30,
          ref_width_px: 257,
          ref_height_px: 162,
        },
      },
    }

    console.log("✅ Returning mock result")
    return NextResponse.json(mockResult)
  } catch (error) {
    console.error("❌ Error in simple test API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
