import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 font-sans text-ink">
      <div className="w-full max-w-[420px] rounded-[14px] border border-hair bg-surface p-6 text-center">
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">
          404
        </div>
        <h1 className="mt-1 text-[18px] font-semibold">Page not found</h1>
        <p className="mt-2 text-[13.5px] text-ink-muted">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-navy-dark"
        >
          Back to the calendar
        </Link>
      </div>
    </div>
  );
}
