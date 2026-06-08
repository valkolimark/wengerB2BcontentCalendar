"use client";

// Global error boundary. Shows a calm message (no internal details leaked) and
// a retry. Triggered by, e.g., a failed Supabase call during render.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 font-sans text-ink">
      <div className="w-full max-w-[420px] rounded-[14px] border border-hair bg-white p-6 text-center">
        <h1 className="text-[18px] font-semibold">Something went wrong</h1>
        <p className="mt-2 text-[13.5px] text-muted">
          We couldn’t load this page. This is usually temporary — please try
          again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-navy-dark"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
