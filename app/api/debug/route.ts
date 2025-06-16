import { NextResponse } from "next/server"
import path from "path"
import fs from "fs"

export async function GET() {
  console.log("🔍 Debug API called")

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    system: {},
    files: {},
    python: {},
    environment: {},
    errors: [],
  }

  try {
    // System Information - safe for Next.js
    try {
      diagnostics.system = {
        platform: process.platform || "unknown",
        arch: process.arch || "unknown",
        nodeVersion: process.version || "unknown",
        cwd: process.cwd() || "unknown",
        runtime: "Next.js",
      }
      console.log("✅ System info gathered")
    } catch (error) {
      console.error("❌ System info error:", error)
      diagnostics.system = {
        platform: "unknown",
        arch: "unknown",
        nodeVersion: "unknown",
        cwd: "unknown",
        runtime: "Next.js",
        error: String(error),
      }
      diagnostics.errors.push(`System info error: ${error}`)
    }

    // Environment Variables - safe check
    try {
      diagnostics.environment = {
        NODE_ENV: process.env.NODE_ENV || "unknown",
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        runtime: "Next.js",
      }
      console.log("✅ Environment checked")
    } catch (error) {
      console.error("❌ Environment error:", error)
      diagnostics.errors.push(`Environment error: ${error}`)
    }

    // Check Files - with error handling for Next.js
    try {
      const scriptsDir = path.join(process.cwd(), "scripts")

      // Check if fs operations work in Next.js
      let scriptsExist = false
      try {
        scriptsExist = fs.existsSync(scriptsDir)
      } catch (fsError) {
        console.log("⚠️ fs.existsSync not available in Next.js")
        diagnostics.errors.push("File system operations not available in Next.js runtime")
      }

      diagnostics.files = {
        scriptsDir: {
          exists: scriptsExist,
          path: scriptsDir,
          note: "File system access limited in Next.js",
        },
        scripts: {},
      }

      if (scriptsExist) {
        const scriptFiles = ["test_basic.py", "dimension_capture_simple.py", "dimension_capture_headless.py"]

        for (const script of scriptFiles) {
          try {
            const scriptPath = path.join(scriptsDir, script)
            diagnostics.files.scripts[script] = {
              exists: fs.existsSync(scriptPath),
              path: scriptPath,
            }
          } catch (fileError) {
            diagnostics.files.scripts[script] = {
              exists: false,
              error: String(fileError),
            }
          }
        }
      }
      console.log("✅ Files checked")
    } catch (error) {
      console.error("❌ Files error:", error)
      diagnostics.errors.push(`Files error: ${error}`)
      diagnostics.files = {
        error: String(error),
        note: "File system operations may be limited in Next.js runtime",
      }
    }

    // Python check - note about limitations
    try {
      diagnostics.python = {
        commands: {
          python3: { available: false, tested: false, note: "Cannot test in Next.js" },
          python: { available: false, tested: false, note: "Cannot test in Next.js" },
          py: { available: false, tested: false, note: "Cannot test in Next.js" },
        },
        note: "Python testing requires spawn process - not available in Next.js runtime",
        recommendation: "Python scripts will be tested when you upload an image",
      }
      console.log("✅ Python section initialized")
    } catch (error) {
      console.error("❌ Python error:", error)
      diagnostics.errors.push(`Python error: ${error}`)
    }

    // Runtime detection
    diagnostics.runtime = {
      type: "Next.js",
      limitations: [
        "No access to os module",
        "Limited file system operations",
        "No spawn/child_process",
        "Python testing happens during actual image processing",
      ],
      recommendation: "Use 'Test Image Upload' to verify Python functionality",
    }

    console.log("✅ Diagnostics completed successfully")

    return NextResponse.json({
      success: true,
      diagnostics,
      message: "Diagnostics completed for Next.js runtime",
    })
  } catch (error) {
    console.error("❌ Critical error in diagnostics:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        diagnostics: {
          ...diagnostics,
          criticalError: true,
          runtime: "Next.js",
        },
      },
      { status: 200 },
    )
  }
}
