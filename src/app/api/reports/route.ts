import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'
import { ReconciliationReport, ReportSummary } from '@/types'

// GET /api/reports - List all reports with filtering
export async function GET(request: NextRequest) {
  try {
    const pool = getDatabasePool()
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const type = searchParams.get('type') // 'ai_sync', 'xero_sync', 'zoho_sync', 'manual', or null for all
    const favorite = searchParams.get('favorite') === 'true'
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Build query
    let query = `
      SELECT 
        id,
        report_name,
        report_type,
        bank_statement_id,
        reconciliation_session_id,
        status,
        summary_data,
        transaction_data,
        reconciliation_metadata,
        generated_by,
        generated_at,
        last_accessed,
        is_favorite,
        tags,
        original_filename,
        file_size
      FROM reconciliation_reports
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramCount = 0
    
    if (type) {
      // Handle multiple types separated by commas
      const types = type.split(',').map(t => t.trim())
      if (types.length === 1) {
        paramCount++
        query += ` AND report_type = $${paramCount}`
        params.push(types[0])
      } else {
        const placeholders = types.map(() => {
          paramCount++
          return `$${paramCount}`
        }).join(', ')
        query += ` AND report_type IN (${placeholders})`
        params.push(...types)
      }
    }
    
    if (favorite) {
      query += ` AND is_favorite = true`
    }
    
    if (search) {
      paramCount++
      query += ` AND (report_name ILIKE $${paramCount} OR original_filename ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }
    
    query += ` ORDER BY generated_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM reconciliation_reports
      WHERE 1=1
    `
    const countParams: any[] = []
    let countParamCount = 0
    
    if (type) {
      countParamCount++
      countQuery += ` AND report_type = $${countParamCount}`
      countParams.push(type)
    }
    
    if (favorite) {
      countQuery += ` AND is_favorite = true`
    }
    
    if (search) {
      countParamCount++
      countQuery += ` AND (report_name ILIKE $${countParamCount} OR original_filename ILIKE $${countParamCount})`
      countParams.push(`%${search}%`)
    }
    
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)
    
    // Transform results
    const reports: ReconciliationReport[] = result.rows.map(row => ({
      id: row.id.toString(),
      reportName: row.report_name,
      reportType: row.report_type,
      bankStatementId: row.bank_statement_id?.toString(),
      reconciliationSessionId: row.reconciliation_session_id?.toString(),
      status: row.status,
      summaryData: row.summary_data,
      transactionData: row.transaction_data,
      reconciliationMetadata: row.reconciliation_metadata,
      generatedBy: row.generated_by,
      generatedAt: row.generated_at,
      lastAccessed: row.last_accessed,
      isFavorite: row.is_favorite,
      tags: row.tags || [],
      originalFilename: row.original_filename,
      fileSize: row.file_size
    }))
    
    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
    
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

// POST /api/reports - Save a new reconciliation report
export async function POST(request: NextRequest) {
  try {
    const pool = getDatabasePool()
    const body = await request.json()
    
    const {
      reportName,
      reportType,
      bankStatementId,
      reconciliationSessionId,
      summaryData,
      transactionData,
      reconciliationMetadata,
      generatedBy = 'Current User',
      tags = [],
      originalFilename,
      fileSize
    } = body
    
    // Validate required fields
    if (!reportName || !reportType || !summaryData || !transactionData) {
      return NextResponse.json(
        { error: 'Missing required fields: reportName, reportType, summaryData, transactionData' },
        { status: 400 }
      )
    }
    
    // Validate report type
    const validTypes = ['ai_sync', 'xero_sync', 'zoho_sync', 'manual']
    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be one of: ' + validTypes.join(', ') },
        { status: 400 }
      )
    }
    
    // Insert the report
    const result = await pool.query(`
      INSERT INTO reconciliation_reports (
        report_name,
        report_type,
        bank_statement_id,
        reconciliation_session_id,
        summary_data,
        transaction_data,
        reconciliation_metadata,
        generated_by,
        tags,
        original_filename,
        file_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, generated_at
    `, [
      reportName,
      reportType,
      bankStatementId || null,
      reconciliationSessionId || null,
      JSON.stringify(summaryData),
      JSON.stringify(transactionData),
      reconciliationMetadata ? JSON.stringify(reconciliationMetadata) : null,
      generatedBy,
      tags,
      originalFilename || null,
      fileSize || null
    ])
    
    const reportId = result.rows[0].id
    const generatedAt = result.rows[0].generated_at
    
    return NextResponse.json({
      success: true,
      reportId: reportId.toString(),
      generatedAt,
      message: 'Report saved successfully'
    })
    
  } catch (error) {
    console.error('Error saving report:', error)
    return NextResponse.json(
      { error: 'Failed to save report' },
      { status: 500 }
    )
  }
}
