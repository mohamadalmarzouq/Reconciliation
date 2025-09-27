import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    
    const query = `
      SELECT 
        sq.*,
        t.date,
        t.description,
        t.amount,
        t.type,
        t.confidence,
        t.suggested_action,
        t.is_matched,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sa.id,
              'provider', sa.provider,
              'status', sa.status,
              'error_message', sa.error_message,
              'external_id', sa.external_id,
              'created_at', sa.created_at,
              'updated_at', sa.updated_at,
              'completed_at', sa.completed_at
            )
          ) FILTER (WHERE sa.id IS NOT NULL), 
          '[]'::json
        ) as sync_attempts
      FROM sync_queue sq
      JOIN transactions t ON sq.transaction_id = t.id
      LEFT JOIN sync_attempts sa ON sq.id = sa.sync_queue_id
      WHERE sq.status = $1
      GROUP BY sq.id, t.date, t.description, t.amount, t.type, t.confidence, t.suggested_action, t.is_matched
      ORDER BY sq.created_at DESC
    `
    
    const pool = getDatabasePool()
    const result = await pool.query(query, [status])
    
    return NextResponse.json({
      success: true,
      queue: result.rows
    })
  } catch (error) {
    console.error('Error fetching sync queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync queue' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { transactionId, action, providers, accountCode, notes } = await request.json()
    
    if (!transactionId || !action) {
      return NextResponse.json(
        { error: 'Transaction ID and action are required' },
        { status: 400 }
      )
    }

    // Default to both providers if none specified
    const targetProviders = providers || ['xero', 'zoho']
    
    const pool = getDatabasePool()
    
    // Add transaction to sync queue (without provider)
    const queueQuery = `
      INSERT INTO sync_queue (
        transaction_id,
        action,
        account_code,
        notes,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, 'pending', NOW())
      RETURNING *
    `
    
    const queueResult = await pool.query(queueQuery, [
      transactionId,
      action,
      accountCode || null,
      notes || null
    ])
    
    const queueItem = queueResult.rows[0]
    
    // Create sync attempts for each provider
    const syncAttempts = []
    for (const provider of targetProviders) {
      const attemptQuery = `
        INSERT INTO sync_attempts (
          sync_queue_id,
          provider,
          status,
          created_at
        ) VALUES ($1, $2, 'pending', NOW())
        RETURNING *
      `
      
      const attemptResult = await pool.query(attemptQuery, [
        queueItem.id,
        provider
      ])
      
      syncAttempts.push(attemptResult.rows[0])
    }
    
    return NextResponse.json({
      success: true,
      queueItem: {
        ...queueItem,
        sync_attempts: syncAttempts
      }
    })
  } catch (error) {
    console.error('Error adding to sync queue:', error)
    return NextResponse.json(
      { error: 'Failed to add to sync queue' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status, errorMessage } = await request.json()
    
    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID and status are required' },
        { status: 400 }
      )
    }
    
    const query = `
      UPDATE sync_queue 
      SET status = $1, 
          error_message = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `
    
    const pool = getDatabasePool()
    const result = await pool.query(query, [status, errorMessage || null, id])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      queueItem: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating sync queue:', error)
    return NextResponse.json(
      { error: 'Failed to update sync queue' },
      { status: 500 }
    )
  }
}
