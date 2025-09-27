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
    
    // Get the sync queue item with transaction details
    const queueQuery = `
      SELECT 
        sq.*,
        t.date,
        t.description,
        t.amount,
        t.type
      FROM sync_queue sq
      JOIN transactions t ON sq.transaction_id = t.id
      WHERE sq.id = $1 AND sq.status = 'pending'
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
    
    let syncResult
    
    try {
      if (queueItem.provider === 'xero') {
        syncResult = await syncToXero(queueItem)
      } else if (queueItem.provider === 'zoho') {
        syncResult = await syncToZoho(queueItem)
      } else {
        throw new Error(`Unsupported provider: ${queueItem.provider}`)
      }
      
      // Update status to completed with external ID
      await pool.query(
        `UPDATE sync_queue SET 
         status = $1, 
         external_id = $2, 
         sync_response = $3,
         completed_at = NOW(), 
         updated_at = NOW() 
         WHERE id = $4`,
        ['completed', syncResult.externalId, JSON.stringify(syncResult), queueId]
      )
      
      // Update the transaction with accounting entry ID
      await pool.query(
        'UPDATE transactions SET accounting_entry_id = $1 WHERE id = $2',
        [syncResult.externalId, queueItem.transaction_id]
      )
      
      return NextResponse.json({
        success: true,
        message: `Successfully synced to ${queueItem.provider}`,
        externalId: syncResult.externalId,
        syncResult
      })
      
    } catch (syncError) {
      console.error('Sync error:', syncError)
      
      // Update status to failed with error details
      const errorMessage = syncError instanceof Error ? syncError.message : String(syncError)
      await pool.query(
        `UPDATE sync_queue SET 
         status = $1, 
         error_message = $2,
         updated_at = NOW() 
         WHERE id = $3`,
        ['failed', errorMessage, queueId]
      )
      
      throw syncError
    }
    
  } catch (error) {
    console.error('Error syncing queue item:', error)
    return NextResponse.json(
      { error: 'Failed to sync queue item: ' + error.message },
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
