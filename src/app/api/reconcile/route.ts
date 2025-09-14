import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Transaction, AccountingEntry, OpenAIResponse } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { bankStatementId, transactions } = await request.json()

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Transactions array is required' },
        { status: 400 }
      )
    }

    // For now, we'll do basic AI analysis without accounting entries
    // In a full implementation, you'd fetch accounting entries from Xero/QuickBooks
    const prompt = createBasicReconciliationPrompt(transactions)

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

    // Parse the response and update transactions
    const updatedTransactions = parseAIResponse(response, transactions)

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
