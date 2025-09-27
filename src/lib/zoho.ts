import { getDatabasePool } from './database'

export interface ZohoToken {
  id: number
  access_token: string
  refresh_token?: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface ZohoContact {
  contact_id: string
  contact_name: string
  email: string
  created_time: string
  last_modified_time: string
}

export interface ZohoInvoice {
  invoice_id: string
  invoice_number: string
  customer_name: string
  total: number
  date: string
  status: string
  created_time: string
}

export async function getZohoToken(): Promise<ZohoToken | null> {
  try {
    const pool = getDatabasePool()
    const result = await pool.query(`
      SELECT * FROM zoho_tokens 
      WHERE expires_at > NOW() 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    if (result.rows.length === 0) {
      console.log('No valid Zoho token found')
      return null
    }
    
    console.log('Retrieved Zoho token from database')
    return result.rows[0]
  } catch (error) {
    console.error('Error retrieving Zoho token:', error)
    return null
  }
}

export async function refreshZohoToken(refreshToken: string): Promise<ZohoToken | null> {
  try {
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        refresh_token: refreshToken
      })
    })
    
    if (!response.ok) {
      console.error('Failed to refresh Zoho token:', await response.text())
      return null
    }
    
    const tokenData = await response.json()
    
    // Update token in database
    const pool = getDatabasePool()
    await pool.query(`
      UPDATE zoho_tokens 
      SET access_token = $1, expires_at = $2, updated_at = NOW()
      WHERE refresh_token = $3
    `, [
      tokenData.access_token,
      new Date(Date.now() + tokenData.expires_in * 1000),
      refreshToken
    ])
    
    return await getZohoToken()
  } catch (error) {
    console.error('Error refreshing Zoho token:', error)
    return null
  }
}

export async function getZohoContacts(dateFilter?: { from?: Date; to?: Date }): Promise<ZohoContact[]> {
  try {
    const token = await getZohoToken()
    if (!token) {
      throw new Error('No valid Zoho token found')
    }
    
    // Build date filter query
    let dateFilterQuery = ''
    if (dateFilter?.from || dateFilter?.to) {
      const filters = []
      if (dateFilter.from) {
        filters.push(`created_time >= '${dateFilter.from.toISOString().split('T')[0]}'`)
      }
      if (dateFilter.to) {
        filters.push(`created_time <= '${dateFilter.to.toISOString().split('T')[0]}'`)
      }
      if (filters.length > 0) {
        dateFilterQuery = `&cf_filter=${encodeURIComponent(filters.join(' and '))}`
      }
    }
    
    const contactsUrl = `https://www.zohoapis.com/books/v3/contacts?organization_id=${process.env.ZOHO_ORGANIZATION_ID}${dateFilterQuery}`
    console.log('Making Zoho contacts API call to:', contactsUrl)
    
    const response = await fetch(contactsUrl, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token.access_token}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Zoho contacts API error:', response.status, errorText)
      
      if (response.status === 401 && token.refresh_token) {
        // Token expired, try to refresh
        console.log('Token expired, attempting refresh...')
        const refreshedToken = await refreshZohoToken(token.refresh_token)
        if (refreshedToken) {
          console.log('Token refreshed successfully, retrying...')
          return getZohoContacts(dateFilter) // Retry with new token
        }
      }
      throw new Error(`Zoho API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('Zoho contacts response:', JSON.stringify(data, null, 2))
    
    return data.contacts || []
  } catch (error) {
    console.error('Error fetching Zoho contacts:', error)
    return []
  }
}

export async function getZohoInvoices(dateFilter?: { from?: Date; to?: Date }): Promise<ZohoInvoice[]> {
  try {
    const token = await getZohoToken()
    if (!token) {
      throw new Error('No valid Zoho token found')
    }
    
    // Build date filter query
    let dateFilterQuery = ''
    if (dateFilter?.from || dateFilter?.to) {
      const filters = []
      if (dateFilter.from) {
        filters.push(`date >= '${dateFilter.from.toISOString().split('T')[0]}'`)
      }
      if (dateFilter.to) {
        filters.push(`date <= '${dateFilter.to.toISOString().split('T')[0]}'`)
      }
      if (filters.length > 0) {
        dateFilterQuery = `&cf_filter=${encodeURIComponent(filters.join(' and '))}`
      }
    }
    
    const invoicesUrl = `https://www.zohoapis.com/books/v3/invoices?organization_id=${process.env.ZOHO_ORGANIZATION_ID}&status=sent${dateFilterQuery}`
    console.log('Making Zoho invoices API call to:', invoicesUrl)
    
    const response = await fetch(invoicesUrl, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${token.access_token}`,
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Zoho invoices API error:', response.status, errorText)
      
      if (response.status === 401 && token.refresh_token) {
        // Token expired, try to refresh
        console.log('Token expired, attempting refresh...')
        const refreshedToken = await refreshZohoToken(token.refresh_token)
        if (refreshedToken) {
          console.log('Token refreshed successfully, retrying...')
          return getZohoInvoices(dateFilter) // Retry with new token
        }
      }
      throw new Error(`Zoho API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log('Zoho invoices response:', JSON.stringify(data, null, 2))
    
    return data.invoices || []
  } catch (error) {
    console.error('Error fetching Zoho invoices:', error)
    return []
  }
}

export async function clearExpiredZohoTokens(): Promise<void> {
  try {
    const pool = getDatabasePool()
    await pool.query('DELETE FROM zoho_tokens WHERE expires_at <= NOW()')
    console.log('Cleared expired Zoho tokens')
  } catch (error) {
    console.error('Error clearing expired Zoho tokens:', error)
  }
}
