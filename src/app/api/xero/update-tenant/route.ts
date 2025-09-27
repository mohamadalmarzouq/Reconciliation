import { NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function POST() {
  try {
    const pool = getDatabasePool()
    
    // Get the latest token
    const result = await pool.query(`
      SELECT * FROM xero_tokens 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No token found' }, { status: 404 })
    }
    
    const token = result.rows[0]
    
    // Decode the JWT token to get tenant_id
    try {
      const payload = JSON.parse(Buffer.from(token.access_token.split('.')[1], 'base64').toString())
      const tenantId = payload.xero_tenantid || payload.tenant_id || 'default'
      
      console.log('Extracted tenant ID from token:', tenantId)
      
      // Update the token with tenant_id
      await pool.query(`
        UPDATE xero_tokens 
        SET tenant_id = $1, updated_at = NOW()
        WHERE id = $2
      `, [tenantId, token.id])
      
      return NextResponse.json({
        success: true,
        message: 'Tenant ID updated successfully',
        tenant_id: tenantId
      })
      
    } catch (jwtError) {
      console.error('Error decoding JWT:', jwtError)
      return NextResponse.json({ error: 'Failed to decode token' }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error updating tenant ID:', error)
    return NextResponse.json({ error: 'Failed to update tenant ID' }, { status: 500 })
  }
}
