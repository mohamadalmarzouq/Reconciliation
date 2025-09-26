import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { bankStatementId, provider } = await request.json()
    
    if (!bankStatementId || !provider) {
      return NextResponse.json(
        { error: 'Bank statement ID and provider are required' },
        { status: 400 }
      )
    }
    
    const pool = getDatabasePool()
    
    // Get accepted transactions that need new entries (not already matched in accounting software)
    const query = `
      SELECT id, date, description, amount, type, confidence, suggested_action, is_matched
      FROM transactions 
      WHERE bank_statement_id = $1 
      AND status = 'accepted'
      AND id NOT IN (SELECT transaction_id FROM sync_queue WHERE transaction_id IS NOT NULL)
      AND (
        -- Only add transactions that need new entries
        -- Exclude high confidence matches (>= 0.9) as they already exist in Xero
        (confidence IS NULL OR confidence < 0.9)
      )
    `
    
    const result = await pool.query(query, [bankStatementId])
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new accepted transactions to add to sync queue',
        added: 0
      })
    }
    
    // Add each accepted transaction to sync queue
    const insertPromises = result.rows.map(transaction => {
      const insertQuery = `
        INSERT INTO sync_queue (
          transaction_id,
          action,
          provider,
          notes,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, 'pending', NOW())
        RETURNING id
      `
      
      const notes = transaction.suggested_action === 'flag' 
        ? 'Accepted anomaly - will create entry in accounting software'
        : transaction.confidence && transaction.confidence > 0.7
        ? 'Confirmed match - no new entry needed'
        : 'Create new entry in accounting software'
      
      return pool.query(insertQuery, [
        transaction.id,
        'accept',
        provider,
        notes
      ])
    })
    
    const insertResults = await Promise.all(insertPromises)
    
    return NextResponse.json({
      success: true,
      message: `Added ${insertResults.length} transactions to sync queue`,
      added: insertResults.length,
      transactions: result.rows.map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount
      }))
    })
    
  } catch (error) {
    console.error('Error bulk adding to sync queue:', error)
    return NextResponse.json(
      { error: 'Failed to add transactions to sync queue' },
      { status: 500 }
    )
  }
}
