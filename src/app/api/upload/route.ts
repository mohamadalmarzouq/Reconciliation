import { NextRequest, NextResponse } from 'next/server'
import formidable from 'formidable'
import { saveUploadedFile, isSupportedFileType, getFileType } from '@/lib/fileUpload'
import { parseFile } from '@/lib/fileParser'
import { getDatabasePool } from '@/lib/database'
import { Transaction } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        return isSupportedFileType(mimetype || '')
      }
    })

    const [fields, files] = await form.parse(await request.formData())
    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    if (!isSupportedFileType(file.originalFilename || '')) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, CSV, or XLSX files.' },
        { status: 400 }
      )
    }

    // Save file to persistent disk
    const filePath = await saveUploadedFile(file)
    const fileType = getFileType(file.originalFilename || '')
    
    // Parse file to extract transactions
    const transactions = await parseFile(filePath, fileType)

    // Save to database
    const pool = getDatabasePool()
    
    // Insert bank statement record
    const bankStatementResult = await pool.query(`
      INSERT INTO bank_statements (filename, file_type, file_path, total_transactions, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      file.originalFilename,
      fileType,
      filePath,
      transactions.length,
      'processed'
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

    return NextResponse.json({
      success: true,
      bankStatementId,
      filename: file.originalFilename,
      fileType,
      totalTransactions: transactions.length,
      transactions: transactions.slice(0, 10), // Return first 10 for preview
      message: 'File uploaded and processed successfully'
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
