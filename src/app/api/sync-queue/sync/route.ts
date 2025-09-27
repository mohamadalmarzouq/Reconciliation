import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'
import { getXeroToken, getXeroTenantId } from '@/lib/xero'
import { getZohoToken } from '@/lib/zoho'

export async function POST(request: NextRequest) {
  try {
    const { queueId } = await request.json()
    
    if (!queueId) {
      return NextResponse.json(
        { error: 'Queue ID is required' },
        { status: 400 }
      )
    }
    
    const pool = getDatabasePool()
    
    // Get the sync queue item with transaction details and sync attempts
    const queueQuery = `
      SELECT 
        sq.*,
        t.date,
        t.description,
        t.amount,
        t.type,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sa.id,
              'provider', sa.provider,
              'status', sa.status,
              'error_message', sa.error_message,
              'external_id', sa.external_id
            )
          ) FILTER (WHERE sa.id IS NOT NULL), 
          '[]'::json
        ) as sync_attempts
      FROM sync_queue sq
      JOIN transactions t ON sq.transaction_id = t.id
      LEFT JOIN sync_attempts sa ON sq.id = sa.sync_queue_id
      WHERE sq.id = $1 AND sq.status = 'pending'
      GROUP BY sq.id, t.date, t.description, t.amount, t.type
    `
    
    const queueResult = await pool.query(queueQuery, [queueId])
    
    if (queueResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Queue item not found or already processed' },
        { status: 404 }
      )
    }
    
    const queueItem = queueResult.rows[0]
    
    // Update status to processing
    await pool.query(
      'UPDATE sync_queue SET status = $1, updated_at = NOW() WHERE id = $2',
      ['processing', queueId]
    )
    
    // Process each sync attempt
    const syncResults = []
    let hasSuccess = false
    let hasFailure = false
    
    for (const attempt of queueItem.sync_attempts) {
      try {
        // Update attempt status to processing
        await pool.query(
          'UPDATE sync_attempts SET status = $1, updated_at = NOW() WHERE id = $2',
          ['processing', attempt.id]
        )
        
        let syncResult
        if (attempt.provider === 'xero') {
          syncResult = await syncToXero(queueItem)
        } else if (attempt.provider === 'zoho') {
          syncResult = await syncToZoho(queueItem)
        } else {
          throw new Error(`Unsupported provider: ${attempt.provider}`)
        }
        
        // Update attempt status to completed
        await pool.query(
          `UPDATE sync_attempts SET 
           status = $1, 
           external_id = $2, 
           sync_response = $3,
           completed_at = NOW(), 
           updated_at = NOW() 
           WHERE id = $4`,
          ['completed', syncResult.externalId, JSON.stringify(syncResult), attempt.id]
        )
        
        syncResults.push({
          provider: attempt.provider,
          status: 'completed',
          externalId: syncResult.externalId,
          result: syncResult
        })
        
        hasSuccess = true
        
      } catch (syncError) {
        console.error(`Sync error for ${attempt.provider}:`, syncError)
        
        // Update attempt status to failed
        const errorMessage = syncError instanceof Error ? syncError.message : String(syncError)
        await pool.query(
          `UPDATE sync_attempts SET 
           status = $1, 
           error_message = $2,
           updated_at = NOW() 
           WHERE id = $3`,
          ['failed', errorMessage, attempt.id]
        )
        
        syncResults.push({
          provider: attempt.provider,
          status: 'failed',
          error: errorMessage
        })
        
        hasFailure = true
      }
    }
    
    // Update overall queue status based on results
    let overallStatus = 'completed'
    if (hasFailure && !hasSuccess) {
      overallStatus = 'failed'
    } else if (hasFailure && hasSuccess) {
      overallStatus = 'partial'
    }
    
    await pool.query(
      `UPDATE sync_queue SET 
       status = $1, 
       completed_at = NOW(), 
       updated_at = NOW() 
       WHERE id = $2`,
      [overallStatus, queueId]
    )
    
    return NextResponse.json({
      success: true,
      message: `Sync completed with status: ${overallStatus}`,
      syncResults,
      overallStatus
    })
    
  } catch (error) {
    console.error('Error syncing queue item:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to sync queue item: ' + errorMessage },
      { status: 500 }
    )
  }
}

async function syncToXero(queueItem: any) {
  const token = await getXeroToken()
  if (!token) {
    throw new Error('No valid Xero token found')
  }
  
  const tenantId = await getXeroTenantId()
  
  // Create invoice data based on transaction
  const invoiceData = {
    Type: queueItem.type === 'credit' ? 'ACCREC' : 'ACCPAY', // ACCREC for sales (credit), ACCPAY for bills (debit)
    Contact: {
      Name: extractContactFromDescription(queueItem.description) || 'Unknown Contact'
    },
    Date: queueItem.date,
    DueDate: queueItem.date, // Same as invoice date for simplicity
    LineItems: [
      {
        Description: queueItem.description,
        Quantity: 1,
        UnitAmount: Math.abs(queueItem.amount),
        AccountCode: queueItem.account_code || (queueItem.type === 'credit' ? '200' : '400') // Default account codes
      }
    ],
    Status: 'AUTHORISED'
  }
  
  const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
      'Xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ Invoices: [invoiceData] })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Xero API error: ${response.status} - ${errorText}`)
  }
  
  const result = await response.json()
  
  if (result.Invoices && result.Invoices.length > 0) {
    const invoice = result.Invoices[0]
    return {
      externalId: invoice.InvoiceID,
      invoiceNumber: invoice.InvoiceNumber,
      provider: 'xero',
      response: result
    }
  } else {
    throw new Error('No invoice created in Xero response')
  }
}

async function syncToZoho(queueItem: any) {
  const token = await getZohoToken()
  if (!token) {
    throw new Error('No valid Zoho token found')
  }
  
  // Create invoice data for Zoho Books
  const invoiceData = {
    customer_name: extractContactFromDescription(queueItem.description) || 'Unknown Customer',
    date: queueItem.date,
    due_date: queueItem.date,
    line_items: [
      {
        name: queueItem.description,
        description: queueItem.description,
        rate: Math.abs(queueItem.amount),
        quantity: 1
      }
    ]
  }
  
  const response = await fetch(`https://www.zohoapis.com/books/v3/invoices?organization_id=${process.env.ZOHO_ORGANIZATION_ID}`, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${token.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(invoiceData)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Zoho API error: ${response.status} - ${errorText}`)
  }
  
  const result = await response.json()
  
  if (result.invoice) {
    return {
      externalId: result.invoice.invoice_id,
      invoiceNumber: result.invoice.invoice_number,
      provider: 'zoho',
      response: result
    }
  } else {
    throw new Error('No invoice created in Zoho response')
  }
}

// Helper function to extract contact name from transaction description
function extractContactFromDescription(description: string): string | null {
  // Simple heuristic - look for common patterns in transaction descriptions
  const patterns = [
    /FROM\s+([A-Z\s]+)/i,
    /TO\s+([A-Z\s]+)/i,
    /([A-Z][a-z]+\s[A-Z][a-z]+)/g, // Two capitalized words
  ]
  
  for (const pattern of patterns) {
    const match = description.match(pattern)
    if (match) {
      return match[1]?.trim() || match[0]?.trim()
    }
  }
  
  return null
}
