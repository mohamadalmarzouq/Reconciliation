import { NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function POST() {
  try {
    const pool = getDatabasePool()
    
    console.log('Starting transaction table migration...')
    
    // Add new columns to transactions table
    try {
      await pool.query(`
        ALTER TABLE transactions 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'flagged', 'under_review'))
      `)
      console.log('Added status column')
    } catch (error) {
      console.log('Status column may already exist:', error)
    }
    
    try {
      await pool.query(`
        ALTER TABLE transactions 
        ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100)
      `)
      console.log('Added reviewed_by column')
    } catch (error) {
      console.log('reviewed_by column may already exist:', error)
    }
    
    try {
      await pool.query(`
        ALTER TABLE transactions 
        ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE
      `)
      console.log('Added reviewed_at column')
    } catch (error) {
      console.log('reviewed_at column may already exist:', error)
    }
    
    try {
      await pool.query(`
        ALTER TABLE transactions 
        ADD COLUMN IF NOT EXISTS review_notes TEXT
      `)
      console.log('Added review_notes column')
    } catch (error) {
      console.log('review_notes column may already exist:', error)
    }
    
    // Update existing transactions to have 'pending' status if null
    await pool.query(`
      UPDATE transactions 
      SET status = 'pending' 
      WHERE status IS NULL
    `)
    console.log('Updated existing transactions to pending status')
    
    console.log('Transaction table migration completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Transaction table migration completed successfully'
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}
