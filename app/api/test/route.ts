import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 Test API called")

    const testData = {
      success: true,
      message: "API is working correctly",
      timestamp: new Date().toISOString(),
      server: {
        platform: process.platform,
        nodeVersion: process.version,
        cwd: process.cwd(),
      },
    }

    console.log("✅ Test API responding with:", testData)
    return NextResponse.json(testData)
  } catch (error) {
    console.error("❌ Test API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
