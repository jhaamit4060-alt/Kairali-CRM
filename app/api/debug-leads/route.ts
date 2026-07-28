import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function GET(req: NextRequest) {
    try {
        const pool = await getPool()

        // OLD: Count total rows without deduplication (raw join)
        const [countRows]: any = await pool.query(`
            SELECT COUNT(*) as total_rows FROM master_buffer mb
            INNER JOIN staging_buffer_new sbn ON mb.lead_id = sbn.Lead_id
        `)
        const totalRowsRaw = countRows[0]?.total_rows || 0

        // OLD: Count distinct lead_ids (before filtering bad ones)
        const [distinctRows]: any = await pool.query(`
            SELECT COUNT(DISTINCT mb.lead_id) as distinct_count FROM master_buffer mb
            INNER JOIN staging_buffer_new sbn ON mb.lead_id = sbn.Lead_id
        `)
        const distinctCountRaw = distinctRows[0]?.distinct_count || 0

        // NEW: Count results after our deduplication fix
        const [fixedRows]: any = await pool.query(`
            SELECT COUNT(*) as fixed_count FROM (
              SELECT 1
              FROM (
                SELECT 
                  mb.lead_id,
                  ROW_NUMBER() OVER (PARTITION BY mb.lead_id ORDER BY sbn.Lead_id DESC) as rn
                FROM master_buffer mb
                INNER JOIN staging_buffer_new sbn ON mb.lead_id = sbn.Lead_id
                WHERE mb.lead_id IS NOT NULL 
                  AND mb.lead_id != '' 
                  AND mb.lead_id != '-'
              ) dedup
              WHERE dedup.rn = 1
            ) final
        `)
        const fixedCount = fixedRows[0]?.fixed_count || 0

        // Check bad lead_ids
        const [badLeads]: any = await pool.query(`
            SELECT COUNT(*) as bad_count FROM master_buffer mb
            INNER JOIN staging_buffer_new sbn ON mb.lead_id = sbn.Lead_id
            WHERE mb.lead_id IS NULL OR mb.lead_id = '' OR mb.lead_id = '-'
        `)
        const badCount = badLeads[0]?.bad_count || 0

        return NextResponse.json({
            before_fix: {
              total_rows_from_join: totalRowsRaw,
              distinct_lead_ids: distinctCountRaw,
              duplicate_factor: (totalRowsRaw / distinctCountRaw).toFixed(2),
            },
            after_fix: {
              total_unique_good_leads: fixedCount,
              bad_leads_filtered_out: badCount,
            },
            summary: `Fixed: Removed ${badCount} bad records, reduced from ${totalRowsRaw} to ${fixedCount} leads`
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[Debug API Error]', message)
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
