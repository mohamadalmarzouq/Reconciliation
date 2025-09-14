import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    if (error) {
      console.error('Xero OAuth error:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/upload?error=xero_auth_failed`)
    }
    
    if (!code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/upload?error=no_code`)
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/api/xero/callback`
      })
    })
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/upload?error=token_exchange_failed`)
    }
    
    const tokenData = await tokenResponse.json()
    
    // Store the token in database (you might want to associate this with a user)
    const pool = getDatabasePool()
    await pool.query(`
      INSERT INTO xero_tokens (access_token, refresh_token, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    `, [
      tokenData.access_token,
      tokenData.refresh_token,
      new Date(Date.now() + tokenData.expires_in * 1000)
    ])
    
    console.log('Xero OAuth successful, token stored')
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/upload?success=xero_connected`)
    
  } catch (error) {
    console.error('Xero callback error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_URL || 'https://reconciliation-rq43.onrender.com'}/upload?error=callback_failed`)
  }
}
