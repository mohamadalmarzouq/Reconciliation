import { NextRequest, NextResponse } from 'next/server'
import { saveUploadedFile, isSupportedFileType, getFileType } from '@/lib/fileUpload'
import { parseFile } from '@/lib/fileParser'
import { getDatabasePool } from '@/lib/database'
import { Transaction } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const accountNames = formData.getAll('accountNames') as string[]
    const uploadSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      )
    }

    // Validate all files
    for (const file of files) {
      if (!isSupportedFileType(file.name)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.name}. Please upload PDF, CSV, or XLSX files.` },
          { status: 400 }
        )
      }
    }

    const pool = getDatabasePool()
    const uploadedStatements = []
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const accountName = accountNames[i] || `Account ${i + 1}`
      
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
      
      const fileType = getFileType(file.name)
      
      // Parse file to extract transactions
      const transactions = await parseFile(filePath, fileType)
      
      // Insert bank statement record
      const bankStatementResult = await pool.query(`
        INSERT INTO bank_statements (filename, file_type, file_path, total_transactions, status, account_name, upload_session_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        file.name,
        fileType,
        filePath,
        transactions.length,
        'processed',
        accountName,
        uploadSessionId
      ])

      const bankStatementId = bankStatementResult.rows[0].id

      // Insert transactions
      for (const transaction of transactions) {
        await pool.query(`
          INSERT INTO transactions (bank_statement_id, date, description, amount, type, is_matched)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          bankStatementId,
          transaction.date,
          transaction.description,
          transaction.amount,
          transaction.type,
          false
        ])
      }

      uploadedStatements.push({
        id: bankStatementId,
        filename: file.name,
        accountName,
        totalTransactions: transactions.length
      })
    }

    return NextResponse.json({
      success: true,
      uploadSessionId,
      uploadedStatements,
      totalFiles: files.length,
      message: `${files.length} file(s) uploaded and processed successfully`
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process file upload' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const pool = getDatabasePool()
    
    // Get all bank statements
    const result = await pool.query(`
      SELECT 
        bs.*,
        COUNT(t.id) as transaction_count,
        COUNT(CASE WHEN t.is_matched = true THEN 1 END) as matched_count
      FROM bank_statements bs
      LEFT JOIN transactions t ON bs.id = t.bank_statement_id
      GROUP BY bs.id
      ORDER BY bs.upload_date DESC
    `)

    return NextResponse.json({
      success: true,
      bankStatements: result.rows
    })

  } catch (error) {
    console.error('Error fetching bank statements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bank statements' },
      { status: 500 }
    )
  }
}
