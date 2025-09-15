import { NextResponse } from 'next/server'
import { getXeroInvoices } from '@/lib/xero'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    
    const dateFilter = (fromDate || toDate) ? {
      from: fromDate ? new Date(fromDate) : undefined,
      to: toDate ? new Date(toDate) : undefined
    } : undefined
    
    const invoices = await getXeroInvoices(dateFilter)
    
    return NextResponse.json({
      success: true,
      invoices
    })
  } catch (error) {
    console.error('Error fetching Xero invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Xero invoices' },
      { status: 500 }
    )
  }
}
