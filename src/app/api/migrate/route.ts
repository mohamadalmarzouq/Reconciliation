import { NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function POST() {
  try {
    const pool = getDatabasePool()
    
    // Add tenant_id column to xero_tokens table
    await pool.query(`
      ALTER TABLE xero_tokens 
      ADD COLUMN IF NOT EXISTS tenant_id TEXT
    `)
    
    console.log('Database migration completed: tenant_id column added')
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully'
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    )
  }
}
