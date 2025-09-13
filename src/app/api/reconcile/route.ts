import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { Transaction, AccountingEntry, OpenAIResponse } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { bankTransactions, accountingEntries } = await request.json()

    if (!bankTransactions || !accountingEntries) {
      return NextResponse.json(
        { error: 'Bank transactions and accounting entries are required' },
        { status: 400 }
      )
    }

    // Prepare data for OpenAI
    const prompt = createReconciliationPrompt(bankTransactions, accountingEntries)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert financial reconciliation AI. Your job is to match bank transactions with accounting entries based on amount, date, description, and other relevant factors. Provide confidence scores and clear explanations for each match.`
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

    // Parse the response (in a real app, you'd want more robust parsing)
    const matches = parseOpenAIResponse(response, bankTransactions)

    const result: OpenAIResponse = {
      matches,
      summary: {
        totalProcessed: bankTransactions.length,
        matchesFound: matches.length,
        confidenceScore: matches.reduce((acc, match) => acc + match.confidence, 0) / matches.length || 0
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Reconciliation error:', error)
    return NextResponse.json(
      { error: 'Failed to process reconciliation' },
      { status: 500 }
    )
  }
}

function createReconciliationPrompt(transactions: Transaction[], entries: AccountingEntry[]): string {
  return `
Please reconcile the following bank transactions with accounting entries:

BANK TRANSACTIONS:
${transactions.map(t => 
  `- ID: ${t.id}, Date: ${t.date}, Description: "${t.description}", Amount: ${t.amount}, Type: ${t.type}`
).join('\n')}

ACCOUNTING ENTRIES:
${entries.map(e => 
  `- ID: ${e.id}, Date: ${e.date}, Description: "${e.description}", Amount: ${e.amount}, Account: ${e.account}`
).join('\n')}

For each bank transaction, provide:
1. The best matching accounting entry ID (if any)
2. Confidence score (0-1)
3. Explanation of why it matches or doesn't match
4. Suggested action: "match", "flag", "split", or "defer"

Return the response as a JSON array of objects with this structure:
[
  {
    "transactionId": "string",
    "confidence": number,
    "explanation": "string",
    "suggestedAction": "string",
    "accountingEntryId": "string" (optional)
  }
]
`
}

function parseOpenAIResponse(response: string, transactions: Transaction[]) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // Fallback: create basic matches based on amount
    return transactions.map(transaction => ({
      transactionId: transaction.id,
      confidence: 0.5,
      explanation: 'Basic amount-based matching (AI response parsing failed)',
      suggestedAction: 'flag' as const,
      accountingEntryId: undefined
    }))
  } catch (error) {
    console.error('Error parsing OpenAI response:', error)
    return transactions.map(transaction => ({
      transactionId: transaction.id,
      confidence: 0.3,
      explanation: 'Unable to process AI response',
      suggestedAction: 'defer' as const,
      accountingEntryId: undefined
    }))
  }
}
