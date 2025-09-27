import { NextRequest, NextResponse } from 'next/server'
import { getXeroContacts } from '@/lib/xero'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    
    const dateFilter = (fromDate || toDate) ? {
      from: fromDate ? new Date(fromDate) : undefined,
      to: toDate ? new Date(toDate) : undefined
    } : undefined
    
    const contacts = await getXeroContacts(dateFilter)
    
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
