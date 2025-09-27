import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET() {
  try {
    // Generate a random state for security
    const state = randomBytes(32).toString('hex')
    
    // Zoho OAuth2 authorization URL
    const authUrl = new URL('https://accounts.zoho.com/oauth/v2/auth')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', process.env.ZOHO_CLIENT_ID!)
    authUrl.searchParams.set('scope', 'ZohoBooks.fullaccess.all')
    authUrl.searchParams.set('redirect_uri', process.env.ZOHO_REDIRECT_URI!)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('access_type', 'offline')
    
    console.log('Generated Zoho auth URL:', authUrl.toString())
    
    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString()
    })
    
  } catch (error) {
    console.error('Error creating Zoho auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to create Zoho authorization URL' },
      { status: 500 }
    )
  }
}
