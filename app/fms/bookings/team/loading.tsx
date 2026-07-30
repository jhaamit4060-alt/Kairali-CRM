export default function Loading() {
  return (
    <main
      className="flex min-h-[60vh] items-center justify-center bg-slate-50"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-xl space-y-5 px-6">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        <p className="text-center text-sm font-medium text-slate-700">Loading team bookings…</p>
        <div className="space-y-3" aria-hidden="true">
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    </main>
  )
}
