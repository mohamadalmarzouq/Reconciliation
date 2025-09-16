import fs from 'fs'
import csv from 'csv-parser'
import * as XLSX from 'xlsx'
import { Transaction } from '@/types'

export async function parsePDF(filePath: string): Promise<Transaction[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    
    // Use AWS Textract v3 for professional PDF parsing
    const { TextractClient, DetectDocumentTextCommand } = await import('@aws-sdk/client-textract')
    
    // Configure AWS Textract client
    const textractClient = new TextractClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    })
    
    // Read the PDF file
    const pdfBuffer = fs.readFileSync(filePath)
    
    // Use Textract to extract text from PDF
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: pdfBuffer
      }
    })
    
    const result = await textractClient.send(command)
    
    // Parse the extracted text for transactions
    const transactions: Transaction[] = []
    let id = 1
    
    // Extract text from Textract blocks
    let allText = ''
    if (result.Blocks) {
      for (const block of result.Blocks) {
        if (block.BlockType === 'LINE' && block.Text) {
          allText += block.Text + '\n'
        }
      }
    }
    
    // Use OpenAI to intelligently parse the extracted text
    console.log('Extracted text from PDF:', allText.substring(0, 1000))
    
    try {
      const { OpenAI } = await import('openai')
      
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
      
      const prompt = `You are a bank statement parser. Extract transactions from this KFH bank statement text:

${allText}

Return a JSON array of transactions with this exact format:
[
  {
    "date": "2024-05-08",
    "description": "RAMEZ SHOPPING CENTER", 
    "amount": -13.74,
    "type": "debit"
  },
  {
    "date": "2024-05-09",
    "description": "Salary TFR",
    "amount": 559.00,
    "type": "credit"
  }
]

Rules:
- Only include actual transactions, not headers, totals, or account information
- Use negative amounts for debits (money going out)
- Use positive amounts for credits (money coming in)
- Format dates as YYYY-MM-DD
- Clean up descriptions (remove extra spaces, special characters)
- Return only valid JSON, no other text

Extract all transactions from the bank statement:`

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert bank statement parser. Extract transaction data accurately and return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })

      const responseText = completion.choices[0]?.message?.content || ''
      console.log('OpenAI response:', responseText)
      
      // Parse the JSON response
      const extractedTransactions = JSON.parse(responseText)
      
      // Convert to our Transaction format
      for (const tx of extractedTransactions) {
        transactions.push({
          id: `pdf-${id++}`,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          isMatched: false,
          status: 'pending'
        })
      }
      
    } catch (openaiError) {
      console.error('OpenAI parsing failed:', openaiError)
      
      // Fallback to simple regex parsing if OpenAI fails
      console.log('Falling back to regex parsing...')
      const lines = allText.split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        const amountMatch = line.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2,3})?)/)
        if (amountMatch) {
          const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
          
          if (amount > 0.01) {
            const dateMatch = line.match(/(\d{4}\/\d{1,2}\/\d{1,2})/)
            const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]
            
            const description = line
              .replace(amountMatch[1], '')
              .replace(dateMatch ? dateMatch[1] : '', '')
              .trim()
              .replace(/\s+/g, ' ')
            
            if (description.length > 0) {
              transactions.push({
                id: `pdf-${id++}`,
                date: date,
                description: description,
                amount: amount,
                type: amount > 0 ? 'credit' : 'debit',
                isMatched: false,
                status: 'pending'
              })
            }
          }
        }
      }
    }
    
    // If no transactions found, create a placeholder
    if (transactions.length === 0) {
      const path = require('path')
      transactions.push({
        id: `pdf-${id++}`,
        date: new Date().toISOString().split('T')[0],
        description: `PDF Bank Statement - ${path.basename(filePath)} (Textract processing completed)`,
        amount: 0,
        type: 'credit' as const,
        isMatched: false,
        status: 'pending'
      })
    }
    
    return transactions
    
  } catch (error) {
    console.error('Error processing PDF with Textract:', error)
    
    // Fallback to placeholder if Textract fails
    const path = require('path')
    const transactions: Transaction[] = []
    let id = 1
    
    transactions.push({
      id: `pdf-${id++}`,
      date: new Date().toISOString().split('T')[0],
      description: `PDF Bank Statement - ${path.basename(filePath)} (Textract processing failed)`,
      amount: 0,
      type: 'credit' as const,
      isMatched: false,
      status: 'pending'
    })
    
    return transactions
  }
}

export async function parseCSV(filePath: string): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`))
      return
    }
    
    const transactions: Transaction[] = []
    let id = 1
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Try to extract transaction data from common CSV formats
        const amount = parseFloat(row.amount || row.Amount || row['Amount'] || '0')
        const date = row.date || row.Date || row['Date'] || new Date().toISOString().split('T')[0]
        const description = row.description || row.Description || row['Description'] || row.memo || row.Memo || row['Memo'] || ''
        
        if (Math.abs(amount) > 0.01) {
          transactions.push({
            id: `csv-${id++}`,
            date: date,
            description: description,
            amount: amount,
            type: amount > 0 ? 'credit' : 'debit',
            isMatched: false,
            status: 'pending'
          })
        }
      })
      .on('end', () => {
        resolve(transactions)
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error)
        reject(new Error('Failed to parse CSV file'))
      })
  })
}

export async function parseXLSX(filePath: string): Promise<Transaction[]> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`)
    }
    
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)
    
    const transactions: Transaction[] = []
    let id = 1
    
    for (const row of data as any[]) {
      // Try to extract transaction data from common Excel formats
      const amount = parseFloat(row.amount || row.Amount || row['Amount'] || '0')
      const date = row.date || row.Date || row['Date'] || new Date().toISOString().split('T')[0]
      const description = row.description || row.Description || row['Description'] || row.memo || row.Memo || row['Memo'] || ''
      
      if (Math.abs(amount) > 0.01) {
        transactions.push({
          id: `xlsx-${id++}`,
          date: date,
          description: description,
          amount: amount,
          type: amount > 0 ? 'credit' : 'debit',
          isMatched: false,
          status: 'pending'
        })
      }
    }
    
    return transactions
  } catch (error) {
    console.error('Error parsing XLSX:', error)
    throw new Error('Failed to parse XLSX file')
  }
}

export async function parseFile(filePath: string, fileType: string): Promise<Transaction[]> {
  switch (fileType) {
    case 'application/pdf':
      return await parsePDF(filePath)
    case 'text/csv':
      return await parseCSV(filePath)
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return await parseXLSX(filePath)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}
