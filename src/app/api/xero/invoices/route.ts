import { NextResponse } from 'next/server'
import { getXeroInvoices } from '@/lib/xero'

export async function GET() {
  try {
    const invoices = await getXeroInvoices()
    
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
