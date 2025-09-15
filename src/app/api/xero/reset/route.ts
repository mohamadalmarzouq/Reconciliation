import { NextResponse } from 'next/server'
import { clearExpiredTokens } from '@/lib/xero'

export async function POST() {
  try {
    await clearExpiredTokens()
    
    return NextResponse.json({
      success: true,
      message: 'Expired tokens cleared. Please reconnect to Xero.'
    })
  } catch (error) {
    console.error('Error clearing tokens:', error)
    return NextResponse.json(
      { error: 'Failed to clear tokens' },
      { status: 500 }
    )
  }
}
