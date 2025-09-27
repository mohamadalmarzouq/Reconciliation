import { NextRequest, NextResponse } from 'next/server'
import { getZohoInvoices } from '@/lib/zoho'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    
    // Build date filter
    const dateFilter: { from?: Date; to?: Date } = {}
    if (from) dateFilter.from = new Date(from)
    if (to) dateFilter.to = new Date(to)
    
    const invoices = await getZohoInvoices(Object.keys(dateFilter).length > 0 ? dateFilter : undefined)
    
    return NextResponse.json({
      success: true,
      invoices
    })
    
  } catch (error) {
    console.error('Error fetching Zoho invoices:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch Zoho invoices',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
