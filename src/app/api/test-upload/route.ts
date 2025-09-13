import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Convert File to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Create file path on persistent disk
    const timestamp = Date.now()
    const filename = `test-${timestamp}-${file.name}`
    const filePath = path.join('/app/uploads', filename)
    
    // Ensure upload directory exists
    const uploadDir = '/app/uploads'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    // Write file to persistent disk
    fs.writeFileSync(filePath, buffer)
    
    // Verify file was written
    const fileStats = fs.statSync(filePath)
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully to persistent disk',
      details: {
        filename: file.name,
        savedAs: filename,
        filePath: filePath,
        size: fileStats.size,
        exists: fs.existsSync(filePath)
      }
    })

  } catch (error) {
    console.error('Test upload error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
