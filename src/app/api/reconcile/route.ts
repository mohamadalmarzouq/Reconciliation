import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Transaction, AccountingEntry, OpenAIResponse } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { bankStatementId, transactions, xeroData } = await request.json()

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Transactions array is required' },
        { status: 400 }
      )
    }

    let prompt: string
    let updatedTransactions: any[]

    if (xeroData && xeroData.contacts && xeroData.invoices) {
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
