import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

function formatMysqlDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { leadId, feedbackData } = body;

        if (!leadId) {
            return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
        }

        const pool = await getPool();
        const connection = await pool.getConnection();

        try {
            // Check if feedback is already submitted
            const [rows] = await connection.execute(
                "SELECT feedback_submitted FROM ai_voice_leads_received WHERE lead_id = ?",
                [leadId]
            ) as any[];

            if (rows.length === 0) {
                return NextResponse.json({ error: "Lead not found" }, { status: 404 });
            }

            if (rows[0].feedback_submitted) {
                return NextResponse.json({ error: "Feedback already submitted and locked" }, { status: 403 });
            }

            // Update feedback
            await connection.execute(
                "UPDATE ai_voice_leads_received SET feedback_submitted = 1, feedback_data = ?, feedback_date = ? WHERE lead_id = ?",
                [JSON.stringify(feedbackData), formatMysqlDateTime(new Date()), leadId]
            );

            return NextResponse.json({ success: true, message: "Feedback submitted successfully" });
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error("[feedback-api] Error:", error);
        return NextResponse.json(
            { error: "Failed to submit feedback", detail: error?.message },
            { status: 500 }
        );
    }
}
