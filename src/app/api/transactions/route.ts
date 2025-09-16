import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bankStatementId = searchParams.get('bankStatementId')

    const pool = getDatabasePool()
    
    let query = `
      SELECT 
        t.*,
        ae.entry_id as accounting_entry_id,
        ae.description as accounting_description,
        ae.amount as accounting_amount,
        ae.date as accounting_date,
        ae.account as accounting_account
      FROM transactions t
      LEFT JOIN accounting_entries ae ON t.id = ae.transaction_id
    `
    
    const params: any[] = []
    
    if (bankStatementId) {
      query += ` WHERE t.bank_statement_id = $1`
      params.push(bankStatementId)
    }
    
    query += ` ORDER BY t.date DESC, t.id DESC`

    const result = await pool.query(query, params)

    const transactions = result.rows.map(row => ({
      id: row.id.toString(),
      date: row.date,
      description: row.description,
      amount: parseFloat(row.amount),
      balance: row.balance ? parseFloat(row.balance) : undefined,
      type: row.type,
      isMatched: row.is_matched,
      status: row.status || 'pending',
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      match: row.is_matched ? {
        confidence: row.confidence || 0,
        explanation: row.explanation || '',
        suggestedAction: row.suggested_action || 'match',
        accountingEntry: row.accounting_entry_id ? {
          id: row.accounting_entry_id,
          description: row.accounting_description,
          amount: parseFloat(row.accounting_amount),
          date: row.accounting_date,
          account: row.accounting_account
        } : undefined
      } : undefined
    }))

    return NextResponse.json({
      success: true,
      transactions
    })

  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { transactionId, isMatched, confidence, explanation, suggestedAction } = await request.json()

    const pool = getDatabasePool()
    
    await pool.query(`
      UPDATE transactions 
      SET is_matched = $1, confidence = $2, explanation = $3, suggested_action = $4
      WHERE id = $5
    `, [isMatched, confidence, explanation, suggestedAction, transactionId])

    return NextResponse.json({
      success: true,
      message: 'Transaction updated successfully'
    })

  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    )
  }
}
