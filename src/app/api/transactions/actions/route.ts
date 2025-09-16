import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      transactionId, 
      actionType, 
      reviewerName = 'Anonymous User',
      reviewerEmail,
      notes,
      userAgent
    } = body

    // Get real IP address from request headers
    const getClientIP = () => {
      // Try different header sources for IP
      const forwarded = request.headers.get('x-forwarded-for')
      const realIP = request.headers.get('x-real-ip')
      const cfConnectingIP = request.headers.get('cf-connecting-ip')
      
      if (forwarded) {
        // x-forwarded-for can be a comma-separated list, take the first one
        return forwarded.split(',')[0].trim()
      }
      
      if (realIP) return realIP
      if (cfConnectingIP) return cfConnectingIP
      
      // Fallback - this might not work in serverless environments
      return null
    }

    // Validate IP address format
    const validateIP = (ip: string | null): string | null => {
      if (!ip) return null
      
      // Basic IP validation (IPv4 and IPv6)
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
      
      if (ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
        return ip
      }
      
      return null
    }

    const clientIP = validateIP(getClientIP())

    if (!transactionId || !actionType) {
      return NextResponse.json(
        { error: 'Transaction ID and action type are required' },
        { status: 400 }
      )
    }

    const validActions = ['accept', 'reject', 'flag', 'note']
    if (!validActions.includes(actionType)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      )
    }

    const pool = getDatabasePool()

    // Get current transaction status
    const currentTransaction = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [transactionId]
    )

    if (currentTransaction.rows.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    const transaction = currentTransaction.rows[0]
    const previousStatus = transaction.status
    const previousConfidence = transaction.confidence

    // Determine new status based on action
    let newStatus = previousStatus
    let newConfidence = previousConfidence

    switch (actionType) {
      case 'accept':
        newStatus = 'accepted'
        newConfidence = 1.0
        break
      case 'reject':
        newStatus = 'rejected'
        newConfidence = 0.0
        break
      case 'flag':
        newStatus = 'flagged'
        // Keep existing confidence
        break
      case 'note':
        // Notes don't change status, just add to review_notes
        break
    }

    // Start transaction
    await pool.query('BEGIN')

    try {
      // Update transaction status
      const updateQuery = actionType === 'note' 
        ? 'UPDATE transactions SET review_notes = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3'
        : 'UPDATE transactions SET status = $1, confidence = $2, reviewed_by = $3, reviewed_at = NOW(), review_notes = $4 WHERE id = $5'

      const updateParams = actionType === 'note'
        ? [notes, reviewerName, transactionId]
        : [newStatus, newConfidence, reviewerName, notes, transactionId]

      await pool.query(updateQuery, updateParams)

      // Log the action in transaction_actions table
      await pool.query(`
        INSERT INTO transaction_actions (
          transaction_id, action_type, previous_status, new_status, 
          reviewer_name, reviewer_email, notes, confidence_before, 
          confidence_after, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        transactionId, actionType, previousStatus, newStatus,
        reviewerName, reviewerEmail, notes, previousConfidence,
        newConfidence, clientIP, userAgent
      ])

      // Commit transaction
      await pool.query('COMMIT')

      // Return updated transaction
      const updatedTransaction = await pool.query(
        'SELECT * FROM transactions WHERE id = $1',
        [transactionId]
      )

      return NextResponse.json({
        success: true,
        message: `Transaction ${actionType}ed successfully`,
        transaction: updatedTransaction.rows[0],
        action: {
          type: actionType,
          previousStatus,
          newStatus,
          timestamp: new Date().toISOString(),
          reviewer: reviewerName,
          notes
        }
      })

    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error processing transaction action:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process transaction action',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Get action history for a transaction
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    const pool = getDatabasePool()

    const actions = await pool.query(`
      SELECT * FROM transaction_actions 
      WHERE transaction_id = $1 
      ORDER BY created_at DESC
    `, [transactionId])

    return NextResponse.json({
      success: true,
      actions: actions.rows
    })

  } catch (error) {
    console.error('Error fetching transaction actions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction actions' },
      { status: 500 }
    )
  }
}
