import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { transactions, xeroData, zohoData, provider } = await request.json()

    // Debug the data structure
    const debug = {
      provider,
      transactionsCount: transactions?.length || 0,
      xeroData: {
        hasContacts: !!xeroData?.contacts,
        hasContactsArray: !!xeroData?.contacts?.contacts,
        contactsCount: xeroData?.contacts?.contacts?.length || 0,
        hasInvoices: !!xeroData?.invoices,
        hasInvoicesArray: !!xeroData?.invoices?.invoices,
        invoicesCount: xeroData?.invoices?.invoices?.length || 0,
        structure: {
          contacts: xeroData?.contacts ? Object.keys(xeroData.contacts) : [],
          invoices: xeroData?.invoices ? Object.keys(xeroData.invoices) : []
        }
      },
      zohoData: {
        hasContacts: !!zohoData?.contacts,
        hasContactsArray: !!zohoData?.contacts?.contacts,
        contactsCount: zohoData?.contacts?.contacts?.length || 0,
        hasInvoices: !!zohoData?.invoices,
        hasInvoicesArray: !!zohoData?.invoices?.invoices,
        invoicesCount: zohoData?.invoices?.invoices?.length || 0
      }
    }

    // Validation logic
    const hasXeroData = xeroData && (
      (xeroData.contacts?.contacts && xeroData.contacts.contacts.length > 0) || 
      (xeroData.invoices?.invoices && xeroData.invoices.invoices.length > 0)
    )
    const hasZohoData = zohoData && (
      (zohoData.contacts?.contacts && zohoData.contacts.contacts.length > 0) || 
      (zohoData.invoices?.invoices && zohoData.invoices.invoices.length > 0)
    )

    return NextResponse.json({
      success: true,
      debug,
      validation: {
        hasXeroData,
        hasZohoData,
        shouldUseXero: provider === 'xero' && hasXeroData,
        shouldUseZoho: provider === 'zoho' && hasZohoData,
        wouldFallbackToBasic: !hasXeroData && !hasZohoData
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
