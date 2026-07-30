import type { RowDataPacket } from 'mysql2'
import { getPool } from '@/lib/db'

type BookingAccessRow = RowDataPacket & {
  bookingId: string
  assignedTo: string | null
  guestName: string | null
  mobile: string | null
}

export type KtahvBookingAccessRecord = {
  bookingId: string
  assignedTo: string
  guestName: string
  mobile: string
}

export async function getKtahvBookingAccessRecord(
  bookingId: string,
): Promise<KtahvBookingAccessRecord | null> {
  const pool = await getPool()
  const [rows] = await pool.execute<BookingAccessRow[]>(
    `
      SELECT
        nb.reservation_id AS bookingId,
        COALESCE(
          NULLIF(TRIM(nbs.nb_bvs_doer), ''),
          NULLIF(TRIM(nb.booking_taken_by), ''),
          NULLIF(TRIM(nb.booker_name), '')
        ) AS assignedTo,
        nb.client_name AS guestName,
        nb.mobile
      FROM ktahv_bookings_fms_v3_part1 nb
      LEFT JOIN ktahv_bookings_fms_v3_nb_booking_verification_stage nbs
        ON nb.reservation_id = nbs.reservation_id
      WHERE nb.reservation_id = ?
      LIMIT 1
    `,
    [bookingId],
  )
  const row = rows[0]
  if (!row?.bookingId || !row.assignedTo) return null
  return {
    bookingId: String(row.bookingId),
    assignedTo: String(row.assignedTo),
    guestName: String(row.guestName ?? ''),
    mobile: String(row.mobile ?? ''),
  }
}
