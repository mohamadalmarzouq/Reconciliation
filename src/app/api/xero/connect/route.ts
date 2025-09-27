import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.XERO_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/api/xero/callback`
    
    if (!clientId) {
      return NextResponse.json({ error: 'Xero client ID not configured' }, { status: 500 })
    }
    
    // Generate state parameter for security
    const state = crypto.randomBytes(16).toString('hex')
    
    // Build Xero OAuth URL
    const authUrl = new URL('https://login.xero.com/identity/connect/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', 'accounting.transactions accounting.contacts')
    authUrl.searchParams.set('state', state)
    
    return NextResponse.json({ 
      authUrl: authUrl.toString(),
      state 
    })
    
  } catch (error) {
    console.error('Xero connect error:', error)
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 })
  }
}
