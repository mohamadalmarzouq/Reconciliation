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
        t.is_matched
      FROM sync_queue sq
      JOIN transactions t ON sq.transaction_id = t.id
      WHERE sq.status = $1
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
    const { transactionId, action, provider, accountCode, notes } = await request.json()
    
    if (!transactionId || !action) {
      return NextResponse.json(
        { error: 'Transaction ID and action are required' },
        { status: 400 }
      )
    }
    
    // Add transaction to sync queue
    const query = `
      INSERT INTO sync_queue (
        transaction_id,
        action,
        provider,
        account_code,
        notes,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
      RETURNING *
    `
    
    const pool = getDatabasePool()
    const result = await pool.query(query, [
      transactionId,
      action,
      provider || null,
      accountCode || null,
      notes || null
    ])
    
    return NextResponse.json({
      success: true,
      queueItem: result.rows[0]
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
