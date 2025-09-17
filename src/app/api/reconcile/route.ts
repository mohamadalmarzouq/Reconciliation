import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Transaction, AccountingEntry, OpenAIResponse } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { bankStatementId, transactions, xeroData, zohoData, provider } = await request.json()

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Transactions array is required' },
        { status: 400 }
      )
    }

    let prompt: string
    let updatedTransactions: any[]

    // Check if we have provider data
    const hasXeroData = xeroData && (xeroData.contacts?.contacts?.length > 0 || xeroData.invoices?.invoices?.length > 0)
    const hasZohoData = zohoData && (zohoData.contacts?.contacts?.length > 0 || zohoData.invoices?.invoices?.length > 0)

    if (provider === 'xero' && hasXeroData) {
      // Full reconciliation with Xero data
      prompt = createXeroReconciliationPrompt(transactions, xeroData.contacts, xeroData.invoices)
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert financial reconciliation AI. Match bank transactions with Xero invoices and contacts. Provide confidence scores and clear explanations for each match.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      updatedTransactions = parseXeroReconciliationResponse(response, transactions, xeroData)
    } else if (provider === 'zoho' && hasZohoData) {
      // Full reconciliation with Zoho data
      prompt = createZohoReconciliationPrompt(transactions, zohoData.contacts, zohoData.invoices)
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert financial reconciliation AI. Match bank transactions with Zoho Books invoices and contacts. Provide confidence scores and clear explanations for each match.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      updatedTransactions = parseZohoReconciliationResponse(response, transactions, zohoData)
    } else if (!hasXeroData && !hasZohoData) {
      // No provider data available - return transactions as unmatched
      return NextResponse.json({
        success: true,
        message: `No ${provider === 'xero' ? 'Xero' : 'Zoho'} data available for reconciliation. Please add some invoices/contacts in ${provider === 'xero' ? 'Xero' : 'Zoho Books'} first.`,
        transactions: transactions.map(t => ({
          ...t,
          isMatched: false,
          match: {
            confidence: 0,
            explanation: `No ${provider === 'xero' ? 'Xero' : 'Zoho'} data available to match against`,
            suggestedAction: 'flag'
          }
        })),
        matchesFound: 0
      })
    } else {
      // Basic AI analysis without accounting entries
      prompt = createBasicReconciliationPrompt(transactions)
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert financial reconciliation AI. Analyze bank transactions and provide insights about their nature, potential matches, and reconciliation suggestions. Focus on transaction patterns, amounts, and descriptions.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      updatedTransactions = parseAIResponse(response, transactions)
    }

    return NextResponse.json({
      success: true,
      transactions: updatedTransactions,
      matchesFound: updatedTransactions.filter(t => t.match && t.match.confidence > 0.5).length
    })

  } catch (error) {
    console.error('Reconciliation error:', error)
    return NextResponse.json(
      { error: 'Failed to process reconciliation' },
      { status: 500 }
    )
  }
}

function createBasicReconciliationPrompt(transactions: Transaction[]): string {
  return `
Analyze these bank transactions and provide reconciliation insights:

BANK TRANSACTIONS:
${transactions.map(t => 
  `- ID: ${t.id}, Date: ${t.date}, Description: "${t.description}", Amount: ${t.amount}, Type: ${t.type}`
).join('\n')}

For each transaction, provide:
1. Confidence score (0-1) for how likely it is to be a legitimate business transaction
2. Explanation of what this transaction likely represents
3. Suggested action: "match", "flag", "split", or "defer"
4. Any patterns or anomalies you notice

Return the response as a JSON array of objects with this structure:
[
  {
    "transactionId": "string",
    "confidence": number,
    "explanation": "string",
    "suggestedAction": "string"
  }
]
`
}

function createXeroReconciliationPrompt(transactions: Transaction[], contacts: any[], invoices: any[]): string {
  return `
Match these bank transactions with Xero invoices and contacts:

BANK TRANSACTIONS:
${transactions.map(t => 
  `- ID: ${t.id}, Date: ${t.date}, Description: "${t.description}", Amount: ${t.amount}, Type: ${t.type}`
).join('\n')}

XERO CONTACTS:
${contacts.map(c => 
  `- ID: ${c.ContactID}, Name: "${c.Name}", Email: ${c.EmailAddress || 'N/A'}`
).join('\n')}

XERO INVOICES:
${invoices.map(i => 
  `- ID: ${i.InvoiceID}, Number: ${i.InvoiceNumber}, Date: ${i.Date}, Total: ${i.Total}, AmountPaid: ${i.AmountPaid}, Contact: "${i.Contact?.Name || 'N/A'}"`
).join('\n')}

For each bank transaction, find the best matching Xero invoice or contact and provide:
1. Confidence score (0-1) for the match quality
2. Explanation of why it matches or doesn't match
3. Suggested action: "match", "flag", "split", or "defer"
4. The matched Xero invoice ID or contact ID (if any)

Return the response as a JSON array of objects with this structure:
[
  {
    "transactionId": "string",
    "confidence": number,
    "explanation": "string",
    "suggestedAction": "string",
    "matchedInvoiceId": "string" (optional),
    "matchedContactId": "string" (optional)
  }
]
`
}

function parseXeroReconciliationResponse(response: string, transactions: Transaction[], xeroData: any) {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const aiResults = JSON.parse(jsonMatch[0])
      
      return transactions.map(transaction => {
        const aiResult = aiResults.find((r: any) => r.transactionId === transaction.id)
        
        if (aiResult) {
          const matchedInvoice = aiResult.matchedInvoiceId ? 
            xeroData.invoices.find((i: any) => i.InvoiceID === aiResult.matchedInvoiceId) : null
          const matchedContact = aiResult.matchedContactId ? 
            xeroData.contacts.find((c: any) => c.ContactID === aiResult.matchedContactId) : null
          
          return {
            ...transaction,
            isMatched: aiResult.suggestedAction === 'match' && aiResult.confidence > 0.7,
            match: {
              confidence: aiResult.confidence || 0.5,
              explanation: aiResult.explanation || 'Xero reconciliation completed',
              suggestedAction: aiResult.suggestedAction || 'flag',
              accountingEntry: matchedInvoice ? {
                id: matchedInvoice.InvoiceID,
                description: matchedInvoice.InvoiceNumber,
                amount: matchedInvoice.Total,
                date: matchedInvoice.Date,
                account: 'Accounts Receivable'
              } : undefined
            }
          }
        }
        
        return transaction
      })
    }
    
    // Fallback
    return transactions.map(transaction => ({
      ...transaction,
      match: {
        confidence: 0.3,
        explanation: 'Xero reconciliation failed to parse response',
        suggestedAction: 'defer' as const,
        accountingEntry: undefined
      }
    }))
  } catch (error) {
    console.error('Error parsing Xero reconciliation response:', error)
    return transactions.map(transaction => ({
      ...transaction,
      match: {
        confidence: 0.3,
        explanation: 'Unable to process Xero reconciliation response',
        suggestedAction: 'defer' as const,
        accountingEntry: undefined
      }
    }))
  }
}

function parseAIResponse(response: string, transactions: Transaction[]) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const aiResults = JSON.parse(jsonMatch[0])
      
      // Update transactions with AI analysis
      return transactions.map(transaction => {
        const aiResult = aiResults.find((r: any) => r.transactionId === transaction.id)
        
        if (aiResult) {
          return {
            ...transaction,
            match: {
              confidence: aiResult.confidence || 0.5,
              explanation: aiResult.explanation || 'AI analysis completed',
              suggestedAction: aiResult.suggestedAction || 'flag',
              accountingEntry: undefined
            }
          }
        }
        
        return transaction
      })
    }
    
    // Fallback: create basic analysis
    return transactions.map(transaction => ({
      ...transaction,
      match: {
        confidence: 0.5,
        explanation: 'Basic AI analysis (response parsing failed)',
        suggestedAction: 'flag' as const,
        accountingEntry: undefined
      }
    }))
  } catch (error) {
    console.error('Error parsing AI response:', error)
    return transactions.map(transaction => ({
      ...transaction,
      match: {
        confidence: 0.3,
        explanation: 'Unable to process AI response',
        suggestedAction: 'defer' as const,
        accountingEntry: undefined
      }
    }))
  }
}

function createZohoReconciliationPrompt(transactions: Transaction[], contacts: any[], invoices: any[]): string {
  return `
Please analyze these bank transactions and match them with Zoho Books data:

BANK TRANSACTIONS:
${transactions.map(t => `ID: ${t.id}, Date: ${t.date}, Description: "${t.description}", Amount: $${t.amount}, Type: ${t.type}`).join('\n')}

ZOHO CONTACTS:
${contacts.map(c => `ID: ${c.contact_id}, Name: "${c.contact_name}", Email: ${c.email || 'N/A'}`).join('\n')}

ZOHO INVOICES:
${invoices.map(i => `ID: ${i.invoice_id}, Number: ${i.invoice_number}, Customer: "${i.customer_name}", Amount: $${i.total}, Date: ${i.date}, Status: ${i.status}`).join('\n')}

For each bank transaction, provide a JSON response with this structure:
[
  {
    "transactionId": "transaction_id_here",
    "confidence": 0.85,
    "explanation": "Clear explanation of the match",
    "suggestedAction": "match|flag|defer",
    "matchedInvoiceId": "invoice_id_if_matched",
    "matchedContactId": "contact_id_if_matched"
  }
]

Match based on:
1. Amount similarity (exact or close)
2. Date proximity (within reasonable timeframe)  
3. Description/customer name correlation
4. Invoice numbers or references

Only suggest "match" for high confidence matches (>0.7). Use "flag" for suspicious transactions and "defer" for unclear cases.
`
}

function parseZohoReconciliationResponse(response: string, transactions: Transaction[], zohoData: any) {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const aiResults = JSON.parse(jsonMatch[0])
    
    return transactions.map(transaction => {
      const aiResult = aiResults.find((r: any) => r.transactionId === transaction.id)
      
      if (aiResult) {
        let accountingEntry = undefined
        
        // Find matched invoice or contact details
        if (aiResult.matchedInvoiceId) {
          const invoice = zohoData.invoices?.invoices?.find((inv: any) => inv.invoice_id === aiResult.matchedInvoiceId)
          if (invoice) {
            accountingEntry = {
              id: invoice.invoice_id,
              description: `Invoice ${invoice.invoice_number} - ${invoice.customer_name}`,
              amount: parseFloat(invoice.total),
              date: invoice.date,
              account: 'Accounts Receivable',
              reference: invoice.invoice_number,
              type: 'invoice' as const
            }
          }
        }
        
        return {
          ...transaction,
          isMatched: aiResult.suggestedAction === 'match',
          match: {
            confidence: aiResult.confidence,
            explanation: aiResult.explanation,
            suggestedAction: aiResult.suggestedAction,
            accountingEntry
          }
        }
      }
      
      return {
        ...transaction,
        isMatched: false,
        match: {
          confidence: 0,
          explanation: 'No suitable match found in Zoho Books data',
          suggestedAction: 'flag' as const,
          accountingEntry: undefined
        }
      }
    })
  } catch (error) {
    console.error('Error parsing Zoho reconciliation response:', error)
    return transactions.map(transaction => ({
      ...transaction,
      match: {
        confidence: 0.3,
        explanation: 'Unable to process Zoho reconciliation response',
        suggestedAction: 'defer' as const,
        accountingEntry: undefined
      }
    }))
  }
}
