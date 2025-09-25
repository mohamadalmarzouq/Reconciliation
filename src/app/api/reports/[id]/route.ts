import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'
import { ReconciliationReport } from '@/types'

// GET /api/reports/[id] - Get specific report details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = getDatabasePool()
    const reportId = params.id
    
    const result = await pool.query(`
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
      WHERE id = $1
    `, [reportId])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }
    
    const row = result.rows[0]
    
    // Update last_accessed timestamp
    await pool.query(`
      UPDATE reconciliation_reports 
      SET last_accessed = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [reportId])
    
    const report: ReconciliationReport = {
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
      lastAccessed: new Date().toISOString(),
      isFavorite: row.is_favorite,
      tags: row.tags || [],
      originalFilename: row.original_filename,
      fileSize: row.file_size
    }
    
    return NextResponse.json({
      success: true,
      report
    })
    
  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    )
  }
}

// PUT /api/reports/[id] - Update report (favorite status, tags, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = getDatabasePool()
    const reportId = params.id
    const body = await request.json()
    
    const { isFavorite, tags, reportName } = body
    
    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 0
    
    if (typeof isFavorite === 'boolean') {
      paramCount++
      updates.push(`is_favorite = $${paramCount}`)
      values.push(isFavorite)
    }
    
    if (tags !== undefined) {
      paramCount++
      updates.push(`tags = $${paramCount}`)
      values.push(tags)
    }
    
    if (reportName) {
      paramCount++
      updates.push(`report_name = $${paramCount}`)
      values.push(reportName)
    }
    
    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }
    
    paramCount++
    values.push(reportId)
    
    const result = await pool.query(`
      UPDATE reconciliation_reports 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id
    `, values)
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Report updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating report:', error)
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/[id] - Delete report
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pool = getDatabasePool()
    const reportId = params.id
    
    const result = await pool.query(`
      DELETE FROM reconciliation_reports 
      WHERE id = $1
      RETURNING id
    `, [reportId])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting report:', error)
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    )
  }
}
