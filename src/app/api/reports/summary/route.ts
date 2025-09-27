import { NextRequest, NextResponse } from 'next/server'
import { getDatabasePool } from '@/lib/database'
import { ReportSummary, ReportSummaryItem } from '@/types'

// GET /api/reports/summary - Get reports summary for dashboard
export async function GET(request: NextRequest) {
  try {
    const pool = getDatabasePool()
    
    // Get counts by type
    const countsResult = await pool.query(`
      SELECT 
        report_type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_favorite = true THEN 1 END) as favorites
      FROM reconciliation_reports
      GROUP BY report_type
    `)
    
    // Get recent reports (last 10)
    const recentResult = await pool.query(`
      SELECT 
        id,
        report_name,
        report_type,
        status,
        summary_data,
        generated_by,
        generated_at,
        is_favorite,
        original_filename
      FROM reconciliation_reports
      ORDER BY generated_at DESC
      LIMIT 10
    `)
    
    // Calculate totals
    let totalReports = 0
    let syncedReports = 0
    let manualReports = 0
    let favoriteReports = 0
    
    countsResult.rows.forEach(row => {
      totalReports += parseInt(row.count)
      favoriteReports += parseInt(row.favorites)
      
      if (row.report_type === 'manual') {
        manualReports += parseInt(row.count)
      } else {
        syncedReports += parseInt(row.count)
      }
    })
    
    // Transform recent reports
    const recentReports: ReportSummaryItem[] = recentResult.rows.map(row => ({
      id: row.id.toString(),
      reportName: row.report_name,
      reportType: row.report_type,
      status: row.status,
      summaryData: row.summary_data,
      generatedBy: row.generated_by,
      generatedAt: row.generated_at,
      isFavorite: row.is_favorite,
      originalFilename: row.original_filename
    }))
    
    const summary: ReportSummary = {
      totalReports,
      syncedReports,
      manualReports,
      favoriteReports,
      recentReports
    }
    
    return NextResponse.json({
      success: true,
      summary
    })
    
  } catch (error) {
    console.error('Error fetching reports summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports summary' },
      { status: 500 }
    )
  }
}
