import { getDatabasePool } from './database'

export interface XeroToken {
  id: number
  access_token: string
  refresh_token: string
  expires_at: Date
  tenant_id?: string
  created_at: Date
  updated_at: Date
}

export interface XeroContact {
  ContactID: string
  Name: string
  EmailAddress?: string
  BankAccountDetails?: string
}

export interface XeroInvoice {
  InvoiceID: string
  InvoiceNumber: string
  Date: string
  DueDate?: string
  Total: number
  AmountPaid: number
  AmountDue: number
  Contact: XeroContact
  LineItems: Array<{
    Description: string
    Quantity: number
    UnitAmount: number
    LineAmount: number
  }>
}

export async function getXeroToken(): Promise<XeroToken | null> {
  try {
    const pool = getDatabasePool()
    const result = await pool.query(`
      SELECT * FROM xero_tokens 
      WHERE expires_at > NOW() 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    const token = result.rows[0] || null
    if (token) {
      console.log('Retrieved token from database:', {
        id: token.id,
        has_access_token: !!token.access_token,
        has_tenant_id: !!token.tenant_id,
        tenant_id: token.tenant_id
      })
    }
    
    return token
  } catch (error) {
    console.error('Error getting Xero token:', error)
    return null
  }
}

export async function refreshXeroToken(refreshToken: string): Promise<XeroToken | null> {
  try {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })
    
    if (!response.ok) {
      console.error('Token refresh failed:', await response.text())
      return null
    }
    
    const tokenData = await response.json()
    
    // Update token in database
    const pool = getDatabasePool()
    await pool.query(`
      UPDATE xero_tokens 
      SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
      WHERE refresh_token = $4
    `, [
      tokenData.access_token,
      tokenData.refresh_token,
      new Date(Date.now() + tokenData.expires_in * 1000),
      refreshToken
    ])
    
    return {
      id: 0, // Will be updated by database
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000),
      created_at: new Date(),
      updated_at: new Date()
    }
  } catch (error) {
    console.error('Error refreshing Xero token:', error)
    return null
  }
}

export async function getXeroTenantId(): Promise<string> {
  try {
    const token = await getXeroToken()
    if (!token) {
      throw new Error('No valid Xero token found')
    }
    
    // If we already have a tenant ID, use it
    if (token.tenant_id && token.tenant_id !== 'default') {
      return token.tenant_id
    }
    
    // Otherwise, get it from Xero API
    const response = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get connections: ${response.status}`)
    }
    
    const connections = await response.json()
    console.log('Xero connections response:', JSON.stringify(connections, null, 2))
    
    if (connections.length > 0) {
      const tenantId = connections[0].tenantId
      console.log('Found tenant ID from connections:', tenantId)
      
      // Update the database with the correct tenant ID
      const pool = getDatabasePool()
      await pool.query(`
        UPDATE xero_tokens 
        SET tenant_id = $1, updated_at = NOW()
        WHERE id = $2
      `, [tenantId, token.id])
      
      return tenantId
    }
    
    return 'default'
  } catch (error) {
    console.error('Error getting Xero tenant ID:', error)
    return 'default'
  }
}

export async function getXeroContacts(): Promise<XeroContact[]> {
  try {
    const token = await getXeroToken()
    if (!token) {
      throw new Error('No valid Xero token found')
    }
    
    const tenantId = await getXeroTenantId()
    console.log('Using tenant ID for contacts:', tenantId)
    console.log('Making API call to:', 'https://api.xero.com/api.xro/2.0/Contacts?includeArchived=false')
    console.log('Request headers:', {
      'Authorization': `Bearer ${token.access_token.substring(0, 20)}...`,
      'Xero-tenant-id': tenantId,
      'Accept': 'application/json'
    })
    
    const response = await fetch('https://api.xero.com/api.xro/2.0/Contacts?includeArchived=false', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Xero-tenant-id': tenantId,
        'Accept': 'application/json'
      }
    })
    
    console.log('API response status:', response.status)
    console.log('API response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Xero contacts API error:', response.status, errorText)
      
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshedToken = await refreshXeroToken(token.refresh_token)
        if (refreshedToken) {
          return getXeroContacts() // Retry with new token
        }
      }
      throw new Error(`Xero API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('Xero contacts response:', JSON.stringify(data, null, 2))
    
    // Check for nested structure (newer Xero SDK versions)
    let contacts = data.Contacts || data.body?.Contacts || data.body?.contacts || []
    
    console.log('Extracted contacts:', {
      hasContacts: !!data.Contacts,
      hasBodyContacts: !!data.body?.Contacts,
      hasBodyContactsLower: !!data.body?.contacts,
      contactsCount: contacts.length,
      contacts: contacts.slice(0, 3) // Show first 3 contacts
    })
    
    return contacts
  } catch (error) {
    console.error('Error fetching Xero contacts:', error)
    return []
  }
}

export async function getXeroInvoices(): Promise<XeroInvoice[]> {
  try {
    const token = await getXeroToken()
    if (!token) {
      throw new Error('No valid Xero token found')
    }
    
    const tenantId = await getXeroTenantId()
    console.log('Using tenant ID for invoices:', tenantId)
    
    const response = await fetch('https://api.xero.com/api.xro/2.0/Invoices?statuses=AUTHORISED&includeArchived=false', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Xero-tenant-id': tenantId,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Xero invoices API error:', response.status, errorText)
      
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshedToken = await refreshXeroToken(token.refresh_token)
        if (refreshedToken) {
          return getXeroInvoices() // Retry with new token
        }
      }
      throw new Error(`Xero API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('Xero invoices response:', JSON.stringify(data, null, 2))
    
    // Check for nested structure (newer Xero SDK versions)
    let invoices = data.Invoices || data.body?.Invoices || data.body?.invoices || []
    
    console.log('Extracted invoices:', {
      hasInvoices: !!data.Invoices,
      hasBodyInvoices: !!data.body?.Invoices,
      hasBodyInvoicesLower: !!data.body?.invoices,
      invoicesCount: invoices.length,
      invoices: invoices.slice(0, 3) // Show first 3 invoices
    })
    
    return invoices
  } catch (error) {
    console.error('Error fetching Xero invoices:', error)
    return []
  }
}
