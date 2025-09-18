import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { parseFile } from '@/lib/fileParser'
import OpenAI from 'openai'
import { Transaction } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const bankFile = formData.get('bankFile') as File
    const secondaryFile = formData.get('secondaryFile') as File
    const scope = formData.get('scope') as string
    const category = formData.get('category') as string

    if (!bankFile) {
      return NextResponse.json(
        { error: 'Bank statement file is required' },
        { status: 400 }
      )
    }

    if (scope === 'specific' && !secondaryFile) {
      return NextResponse.json(
        { error: 'Secondary document is required for specific reconciliation' },
        { status: 400 }
      )
    }

    if (scope === 'specific' && !category) {
      return NextResponse.json(
        { error: 'Category selection is required for specific reconciliation' },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    const uploadDir = '/app/uploads'
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      console.log('Upload directory already exists or created')
    }

    // Save bank statement file
    const bankFileName = `bank_${Date.now()}_${bankFile.name}`
    const bankFilePath = join(uploadDir, bankFileName)
    const bankBuffer = Buffer.from(await bankFile.arrayBuffer())
    await writeFile(bankFilePath, bankBuffer)

    // Parse bank statement
    console.log('Parsing bank statement:', bankFilePath)
    const bankTransactions = await parseFile(bankFilePath, bankFile.type)

    let secondaryTransactions: Transaction[] = []
    let secondaryFilePath = ''

    // Handle secondary file if provided
    if (secondaryFile) {
      const secondaryFileName = `secondary_${Date.now()}_${secondaryFile.name}`
      secondaryFilePath = join(uploadDir, secondaryFileName)
      const secondaryBuffer = Buffer.from(await secondaryFile.arrayBuffer())
      await writeFile(secondaryFilePath, secondaryBuffer)

      console.log('Parsing secondary document:', secondaryFilePath)
      
      if (scope === 'specific') {
        // Use category-specific parsing
        secondaryTransactions = await parseCategorySpecificFile(secondaryFilePath, secondaryFile.type, category)
      } else {
        // Use general parsing
        secondaryTransactions = await parseFile(secondaryFilePath, secondaryFile.type)
      }
    }

    // Perform reconciliation
    let reconciliationResult
    if (scope === 'complete') {
      reconciliationResult = await performCompleteReconciliation(bankTransactions, secondaryTransactions)
    } else {
      reconciliationResult = await performSpecificReconciliation(bankTransactions, secondaryTransactions, category)
    }

    return NextResponse.json({
      success: true,
      message: `Manual reconciliation completed using ${scope} mode${scope === 'specific' ? ` with ${category} category` : ''}`,
      bankTransactions: reconciliationResult.bankTransactions,
      secondaryTransactions: reconciliationResult.secondaryTransactions,
      matches: reconciliationResult.matches,
      summary: {
        totalBankTransactions: bankTransactions.length,
        totalSecondaryTransactions: secondaryTransactions.length,
        matchesFound: reconciliationResult.matches.length,
        confidenceScore: reconciliationResult.averageConfidence
      }
    })

  } catch (error) {
    console.error('Error in manual reconciliation:', error)
    return NextResponse.json(
      { 
        error: 'Manual reconciliation failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Category-specific file parsing with tailored AI prompts
async function parseCategorySpecificFile(filePath: string, fileType: string, category: string): Promise<Transaction[]> {
  try {
    // First, get the raw text/data from the file
    const rawTransactions = await parseFile(filePath, fileType)
    
    // If we got structured data, use it directly
    if (rawTransactions.length > 0) {
      return rawTransactions
    }

    // Otherwise, use category-specific AI parsing
    const prompt = getCategorySpecificPrompt(category, filePath)
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert financial document parser. Extract transaction data based on the specific document category provided.`
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
      throw new Error('No response from OpenAI for category-specific parsing')
    }

    // Parse the AI response into transactions
    return parseAITransactionResponse(response, category)

  } catch (error) {
    console.error(`Error parsing ${category} file:`, error)
    return []
  }
}

// Get category-specific AI prompts
function getCategorySpecificPrompt(category: string, filePath: string): string {
  const basePrompt = `Analyze this ${category} document and extract transaction data.`
  
  switch (category) {
    case 'sales':
      return `${basePrompt}

Extract all sales transactions. For each sale, return:
- Date (YYYY-MM-DD format)
- Description (product, customer, or sales note)
- Amount (total sale amount as positive number)
- Type should be "credit" (incoming money)

Return as JSON array:
[
  {
    "date": "2024-05-15",
    "description": "Product sale to Customer Name",
    "amount": 150.00,
    "type": "credit"
  }
]`

    case 'expense':
      return `${basePrompt}

Extract all expense records. For each expense, return:
- Date (YYYY-MM-DD format)  
- Description (vendor name or expense description)
- Amount (expense amount as positive number)
- Type should be "debit" (outgoing money)

Return as JSON array:
[
  {
    "date": "2024-05-15", 
    "description": "Office supplies from Vendor",
    "amount": 75.50,
    "type": "debit"
  }
]`

    case 'delivery':
      return `${basePrompt}

This is a delivery platform report (Talabat, Jahez, etc.). Extract payout information:
- Date (YYYY-MM-DD format)
- Description (should include platform name and order details)
- Amount (net payout amount after commissions/fees)
- Type should be "credit" (money received)

Return as JSON array:
[
  {
    "date": "2024-05-15",
    "description": "Talabat payout - 15 orders (Commission: 15%, Net: $85)",
    "amount": 85.00,
    "type": "credit"
  }
]`

    case 'pos':
      return `${basePrompt}

Extract daily POS sales totals. For each day, return:
- Date (YYYY-MM-DD format)
- Description (daily sales summary with payment types if available)
- Amount (total collected amount)
- Type should be "credit" (money collected)

Return as JSON array:
[
  {
    "date": "2024-05-15",
    "description": "Daily POS sales (Cash: $200, Card: $150)",
    "amount": 350.00,
    "type": "credit"
  }
]`

    case 'accounting':
      return `${basePrompt}

Extract accounting transactions from this export. For each entry, return:
- Date (YYYY-MM-DD format)
- Description (account name, invoice number, or journal entry description)
- Amount (absolute amount value)
- Type ("debit" or "credit" based on the entry type)

Return as JSON array:
[
  {
    "date": "2024-05-15",
    "description": "Invoice #INV-001 - Customer Payment",
    "amount": 500.00,
    "type": "credit"
  }
]`

    default: // general
      return `${basePrompt}

Analyze the document and extract all transaction-like entries. For each entry, return:
- Date (YYYY-MM-DD format, estimate if not clear)
- Description (clear description of the transaction)
- Amount (positive number)
- Type ("credit" for incoming money, "debit" for outgoing money)

Return as JSON array:
[
  {
    "date": "2024-05-15",
    "description": "Transaction description",
    "amount": 100.00,
    "type": "credit"
  }
]`
  }
}

// Parse AI response into Transaction objects
function parseAITransactionResponse(response: string, category: string): Transaction[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in AI response')
    }

    const aiTransactions = JSON.parse(jsonMatch[0])
    let id = 1

    return aiTransactions.map((tx: any) => ({
      id: `${category}-${id++}`,
      date: tx.date,
      description: tx.description,
      amount: Math.abs(parseFloat(tx.amount)),
      type: tx.type === 'debit' ? 'debit' : 'credit',
      isMatched: false,
      status: 'pending'
    }))

  } catch (error) {
    console.error('Error parsing AI transaction response:', error)
    return []
  }
}

// Complete reconciliation (general matching)
async function performCompleteReconciliation(bankTransactions: Transaction[], secondaryTransactions: Transaction[]) {
  const prompt = `
Reconcile these bank transactions with secondary document transactions:

BANK TRANSACTIONS:
${bankTransactions.map(t => `ID: ${t.id}, Date: ${t.date}, Description: "${t.description}", Amount: $${t.amount}, Type: ${t.type}`).join('\n')}

SECONDARY DOCUMENT TRANSACTIONS:
${secondaryTransactions.map(t => `ID: ${t.id}, Date: ${t.date}, Description: "${t.description}", Amount: $${t.amount}, Type: ${t.type}`).join('\n')}

Find matches based on:
1. Amount similarity (exact or close)
2. Date proximity (same day or within 1-2 days)
3. Description correlation

Return JSON array of matches:
[
  {
    "bankTransactionId": "bank_transaction_id",
    "secondaryTransactionId": "secondary_transaction_id", 
    "confidence": 0.85,
    "explanation": "Explanation of the match"
  }
]
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at reconciling financial transactions. Find matches between bank statements and other financial documents.'
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
    throw new Error('No response from OpenAI for complete reconciliation')
  }

  return parseReconciliationMatches(response, bankTransactions, secondaryTransactions)
}

// Specific reconciliation (category-aware matching)
async function performSpecificReconciliation(bankTransactions: Transaction[], secondaryTransactions: Transaction[], category: string) {
  const categoryPrompts = {
    sales: 'Match sales transactions (credits) with corresponding bank deposits',
    expense: 'Match expense transactions (debits) with corresponding bank withdrawals',
    delivery: 'Match delivery platform payouts with net bank deposits after commission deductions',
    pos: 'Match daily POS totals with corresponding bank deposits',
    accounting: 'Match accounting entries with bank transactions based on invoice numbers and amounts',
    general: 'Match transactions using general correlation rules'
  }

  const categoryPrompt = categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts.general

  const prompt = `
${categoryPrompt}

BANK TRANSACTIONS:
${bankTransactions.map(t => `ID: ${t.id}, Date: ${t.date}, Description: "${t.description}", Amount: $${t.amount}, Type: ${t.type}`).join('\n')}

${category.toUpperCase()} TRANSACTIONS:
${secondaryTransactions.map(t => `ID: ${t.id}, Date: ${t.date}, Description: "${t.description}", Amount: $${t.amount}, Type: ${t.type}`).join('\n')}

Category-specific matching rules for ${category}:
${getCategoryMatchingRules(category)}

Return JSON array of matches:
[
  {
    "bankTransactionId": "bank_transaction_id",
    "secondaryTransactionId": "secondary_transaction_id",
    "confidence": 0.85,
    "explanation": "Category-specific explanation of the match"
  }
]
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an expert at reconciling ${category} documents with bank statements. Use category-specific logic for accurate matching.`
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
    throw new Error(`No response from OpenAI for ${category} reconciliation`)
  }

  return parseReconciliationMatches(response, bankTransactions, secondaryTransactions)
}

// Get category-specific matching rules
function getCategoryMatchingRules(category: string): string {
  switch (category) {
    case 'sales':
      return `- Match sales amounts to bank credits on same or next day
- Account for payment processing delays
- Look for batch deposits that sum multiple sales`

    case 'expense':
      return `- Match expense amounts to bank debits
- Check for exact amount matches first
- Consider payment method differences (check vs card)`

    case 'delivery':
      return `- Match net payout amounts (after platform commission)
- Account for weekly/daily payout schedules
- Consider platform-specific fee structures`

    case 'pos':
      return `- Match daily POS totals to bank deposits
- Account for cash vs card processing delays
- Consider end-of-day deposit timing`

    case 'accounting':
      return `- Match based on invoice numbers and amounts
- Consider payment terms and timing
- Look for journal entry references`

    default:
      return `- Use general matching rules based on amount and date proximity
- Consider description similarities
- Account for processing delays`
  }
}

// Parse reconciliation matches from AI response
function parseReconciliationMatches(response: string, bankTransactions: Transaction[], secondaryTransactions: Transaction[]) {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in reconciliation response')
    }

    const matches = JSON.parse(jsonMatch[0])
    let totalConfidence = 0

    // Update bank transactions with match information
    const updatedBankTransactions = bankTransactions.map(bankTx => {
      const match = matches.find((m: any) => m.bankTransactionId === bankTx.id)
      
      if (match) {
        const secondaryTx = secondaryTransactions.find(sTx => sTx.id === match.secondaryTransactionId)
        totalConfidence += match.confidence

        return {
          ...bankTx,
          isMatched: match.confidence > 0.7,
          match: {
            confidence: match.confidence,
            explanation: match.explanation,
            suggestedAction: match.confidence > 0.7 ? 'match' : 'flag',
            accountingEntry: secondaryTx ? {
              id: secondaryTx.id,
              description: secondaryTx.description,
              amount: secondaryTx.amount,
              date: secondaryTx.date,
              account: 'Secondary Document',
              type: 'manual' as const
            } : undefined
          }
        }
      }

      return {
        ...bankTx,
        isMatched: false,
        match: {
          confidence: 0,
          explanation: 'No match found in secondary document',
          suggestedAction: 'flag' as const
        }
      }
    })

    return {
      bankTransactions: updatedBankTransactions,
      secondaryTransactions,
      matches,
      averageConfidence: matches.length > 0 ? totalConfidence / matches.length : 0
    }

  } catch (error) {
    console.error('Error parsing reconciliation matches:', error)
    return {
      bankTransactions: bankTransactions.map(tx => ({
        ...tx,
        isMatched: false,
        match: {
          confidence: 0,
          explanation: 'Error processing reconciliation',
          suggestedAction: 'flag' as const
        }
      })),
      secondaryTransactions,
      matches: [],
      averageConfidence: 0
    }
  }
}
