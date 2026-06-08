export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas font-sans text-faint">
      <div className="flex items-center gap-2.5 text-[13.5px]">
        <span className="size-3 animate-spin rounded-full border-2 border-line border-t-navy" />
        Loading your calendar…
      </div>
    </div>
  );
}
