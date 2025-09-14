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
    
    // Use AWS Textract for professional PDF parsing
    const AWS = require('aws-sdk')
    
    // Configure AWS
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    })
    
    const textract = new AWS.Textract()
    
    // Read the PDF file
    const pdfBuffer = fs.readFileSync(filePath)
    
    // Use Textract to extract text from PDF
    const params = {
      Document: {
        Bytes: pdfBuffer
      }
    }
    
    const result = await textract.detectDocumentText(params).promise()
    
    // Parse the extracted text for transactions
    const transactions: Transaction[] = []
    let id = 1
    
    // Extract text from Textract blocks
    let allText = ''
    for (const block of result.Blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        allText += block.Text + '\n'
      }
    }
    
    // Parse lines for transaction patterns
    const lines = allText.split('\n').filter(line => line.trim())
    
    for (const line of lines) {
      // Look for transaction patterns - enhanced for bank statements
      const amountMatch = line.match(/([+-]?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2,3})?)/)
      if (amountMatch) {
        const amountStr = amountMatch[1].replace(/[$,]/g, '')
        const amount = parseFloat(amountStr)
        
        if (Math.abs(amount) > 0.01) { // Filter out very small amounts
          // Try to extract date (common formats)
          const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/)
          const date = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0]
          
          // Clean up description
          const description = line
            .replace(amountMatch[0], '')
            .replace(dateMatch ? dateMatch[0] : '', '')
            .trim()
            .replace(/\s+/g, ' ')
          
          if (description.length > 0) {
            transactions.push({
              id: `pdf-${id++}`,
              date: date,
              description: description,
              amount: amount,
              type: amount > 0 ? 'credit' : 'debit',
              isMatched: false
            })
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
        isMatched: false
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
      isMatched: false
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
            isMatched: false
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
          isMatched: false
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
