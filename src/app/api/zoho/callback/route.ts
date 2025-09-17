import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    if (error) {
      console.error('Zoho OAuth error:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/review?error=zoho_auth_failed`)
    }
    
    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/review?error=no_code`)
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        redirect_uri: process.env.ZOHO_REDIRECT_URI!,
        code: code
      })
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Zoho token exchange failed:', errorText)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/review?error=token_exchange_failed`)
    }
    
    const tokenData = await tokenResponse.json()
    console.log('Zoho token response:', JSON.stringify(tokenData, null, 2))
    
    // Store the token in database
    const pool = getDatabasePool()
    
    // Clear any existing Zoho tokens
    await pool.query('DELETE FROM zoho_tokens')
    console.log('Cleared existing Zoho tokens')
    
    // Handle missing refresh_token
    const refreshToken = tokenData.refresh_token || null
    
    // Create zoho_tokens table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS zoho_tokens (
          id SERIAL PRIMARY KEY,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)
    } catch (createError) {
      console.log('zoho_tokens table may already exist')
    }
    
    // Insert new token
    await pool.query(`
      INSERT INTO zoho_tokens (access_token, refresh_token, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [
      tokenData.access_token,
      refreshToken,
      new Date(Date.now() + tokenData.expires_in * 1000)
    ])
    
    console.log('Zoho OAuth successful, token stored')
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/review?success=zoho_connected`)
    
  } catch (error) {
    console.error('Zoho callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/review?error=callback_failed`)
  }
}
