import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/lib/fileParser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Convert File to buffer for processing
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Create a temporary file path
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const filePath = `/app/uploads/${filename}`
    
    // Ensure upload directory exists and save file
    const fs = require('fs')
    const path = require('path')
    
    // Create uploads directory if it doesn't exist
    const uploadDir = '/app/uploads'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    
    // Write file to disk
    fs.writeFileSync(filePath, buffer)
    
    const fileType = file.type
    
    // Parse file to extract transactions
    const transactions = await parseFile(filePath, fileType)
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(filePath)
    } catch (cleanupError) {
      console.log('Could not delete temp file:', cleanupError)
    }
    
    return NextResponse.json({
      success: true,
      filename: file.name,
      fileType,
      transactionCount: transactions.length,
      transactions: transactions.slice(0, 20), // Show first 20 transactions
      allTransactions: transactions // Show all transactions for debugging
    })
    
  } catch (error) {
    console.error('Debug parser error:', error)
    return NextResponse.json(
      { error: 'Failed to debug parse file: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
