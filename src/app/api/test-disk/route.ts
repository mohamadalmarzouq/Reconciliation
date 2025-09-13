import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const diskPath = '/app/uploads'
    
    // Check if disk path exists
    const diskExists = fs.existsSync(diskPath)
    
    // Check if we can write to the disk
    let canWrite = false
    let writeError = null
    
    try {
      const testFile = path.join(diskPath, 'test-write.txt')
      fs.writeFileSync(testFile, 'test content')
      canWrite = true
      fs.unlinkSync(testFile) // Clean up
    } catch (error) {
      writeError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    // Get disk stats if possible
    let diskStats = null
    try {
      if (diskExists) {
        const stats = fs.statSync(diskPath)
        diskStats = {
          isDirectory: stats.isDirectory(),
          mode: stats.mode,
          uid: stats.uid,
          gid: stats.gid
        }
      }
    } catch (error) {
      // Ignore stats errors
    }
    
    return NextResponse.json({
      success: true,
      diskPath,
      diskExists,
      canWrite,
      writeError,
      diskStats,
      message: diskExists && canWrite 
        ? 'Disk is properly mounted and writable' 
        : 'Disk may not be properly mounted or accessible'
    })

  } catch (error) {
    console.error('Disk test error:', error)
    return NextResponse.json(
      { 
        error: 'Disk test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
