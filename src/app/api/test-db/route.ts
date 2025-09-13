import { NextResponse } from 'next/server'
import { getDatabasePool, initializeDatabase } from '@/lib/database'

export async function GET() {
  try {
    // Test database connection
    const pool = getDatabasePool()
    
    // Try to query the database
    const result = await pool.query('SELECT NOW() as current_time')
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      currentTime: result.rows[0].current_time
    })

  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Initialize database tables
    await initializeDatabase()
    
    return NextResponse.json({
      success: true,
      message: 'Database tables initialized successfully'
    })

  } catch (error) {
    console.error('Database initialization error:', error)
    return NextResponse.json(
      { 
        error: 'Database initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
