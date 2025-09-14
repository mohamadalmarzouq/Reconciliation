import { NextResponse } from 'next/server'
import { getXeroContacts } from '@/lib/xero'

export async function GET() {
  try {
    const contacts = await getXeroContacts()
    
    return NextResponse.json({
      success: true,
      contacts
    })
  } catch (error) {
    console.error('Error fetching Xero contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Xero contacts' },
      { status: 500 }
    )
  }
}
