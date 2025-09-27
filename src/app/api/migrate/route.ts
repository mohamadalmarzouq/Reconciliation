import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const pool = getDatabasePool()
    
    console.log('Starting database migration...')
    
    // Add missing columns to bank_statements table
    try {
      await pool.query(`
        ALTER TABLE bank_statements 
        ADD COLUMN IF NOT EXISTS account_name VARCHAR(100)
      `)
      console.log('Added account_name column to bank_statements')
    } catch (error) {
      console.log('Error adding account_name column:', error)
    }
    
    try {
      await pool.query(`
        ALTER TABLE bank_statements 
        ADD COLUMN IF NOT EXISTS upload_session_id VARCHAR(100)
      `)
      console.log('Added upload_session_id column to bank_statements')
    } catch (error) {
      console.log('Error adding upload_session_id column:', error)
    }
    
    // Update sync_queue status constraint
    try {
      await pool.query(`
        ALTER TABLE sync_queue 
        DROP CONSTRAINT IF EXISTS sync_queue_status_check
      `)
      console.log('Dropped old sync_queue status constraint')
    } catch (error) {
      console.log('Error dropping old constraint:', error)
    }
    
    try {
      await pool.query(`
        ALTER TABLE sync_queue 
        ADD CONSTRAINT sync_queue_status_check 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial'))
      `)
      console.log('Added new sync_queue status constraint')
    } catch (error) {
      console.log('Error adding new constraint:', error)
    }
    
    // Create sync_attempts table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sync_attempts (
          id SERIAL PRIMARY KEY,
          sync_queue_id INTEGER REFERENCES sync_queue(id) ON DELETE CASCADE,
          provider VARCHAR(20) NOT NULL CHECK (provider IN ('xero', 'zoho')),
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          error_message TEXT,
          external_id VARCHAR(100),
          sync_response JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE
        )
      `)
      console.log('Created sync_attempts table')
    } catch (error) {
      console.log('Error creating sync_attempts table:', error)
    }
    
    // Create indexes
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sync_attempts_queue ON sync_attempts(sync_queue_id)
      `)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sync_attempts_provider ON sync_attempts(provider)
      `)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_sync_attempts_status ON sync_attempts(status)
      `)
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_bank_statements_session ON bank_statements(upload_session_id)
      `)
      console.log('Created indexes')
    } catch (error) {
      console.log('Error creating indexes:', error)
    }
    
    console.log('Database migration completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully'
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}