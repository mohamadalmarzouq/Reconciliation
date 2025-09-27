import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const pool = getDatabasePool()
    
    console.log('Starting database cleanup...')
    
    // Delete all data in the correct order (respecting foreign key constraints)
    const cleanupQueries = [
      'DELETE FROM sync_attempts',
      'DELETE FROM sync_queue', 
      'DELETE FROM transaction_actions',
      'DELETE FROM accounting_entries',
      'DELETE FROM transactions',
      'DELETE FROM reconciliation_sessions',
      'DELETE FROM reconciliation_reports',
      'DELETE FROM bank_statements'
    ]
    
    for (const query of cleanupQueries) {
      try {
        const result = await pool.query(query)
        console.log(`Cleaned: ${query} - ${result.rowCount} rows deleted`)
      } catch (error) {
        console.log(`Error cleaning ${query}:`, error)
      }
    }
    
    // Reset sequences to start from 1
    const resetQueries = [
      'ALTER SEQUENCE bank_statements_id_seq RESTART WITH 1',
      'ALTER SEQUENCE transactions_id_seq RESTART WITH 1',
      'ALTER SEQUENCE reconciliation_sessions_id_seq RESTART WITH 1',
      'ALTER SEQUENCE reconciliation_reports_id_seq RESTART WITH 1',
      'ALTER SEQUENCE sync_queue_id_seq RESTART WITH 1',
      'ALTER SEQUENCE sync_attempts_id_seq RESTART WITH 1',
      'ALTER SEQUENCE transaction_actions_id_seq RESTART WITH 1',
      'ALTER SEQUENCE accounting_entries_id_seq RESTART WITH 1'
    ]
    
    for (const query of resetQueries) {
      try {
        await pool.query(query)
        console.log(`Reset sequence: ${query}`)
      } catch (error) {
        console.log(`Error resetting sequence ${query}:`, error)
      }
    }
    
    console.log('Database cleanup completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Database cleaned successfully - ready for fresh start'
    })
    
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
