"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Public signup is disabled — accounts are invited via Supabase; the first
// admin is promoted by SQL (see README). This page only signs in.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setErr(error.message);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 font-sans text-ink">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center gap-[11px]">
          <span className="flex size-9 items-center justify-center rounded-lg bg-navy text-lg font-bold text-white">
            W
          </span>
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.01em]">
              Content Tracker
            </div>
            <div className="text-[11px] text-muted2">Wenger B2B · 2026</div>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-[14px] border border-hair bg-white p-5"
        >
          <h1 className="mb-4 text-[17px] font-semibold">Sign in</h1>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[38px] w-full rounded-[9px] border border-line bg-white px-[11px] text-[13.5px] outline-none transition-[box-shadow,border-color] focus:border-navy focus:shadow-[0_0_0_3px_rgba(28,59,102,.1)]"
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[38px] w-full rounded-[9px] border border-line bg-white px-[11px] text-[13.5px] outline-none transition-[box-shadow,border-color] focus:border-navy focus:shadow-[0_0_0_3px_rgba(28,59,102,.1)]"
            />
          </label>

          {err && <p className="mb-3 text-[12.5px] text-[#b91c1c]">{err}</p>}

          <button
            type="submit"
            disabled={pending}
            className="h-[40px] w-full rounded-[9px] border border-navy bg-navy text-[14px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-3.5 text-[11.5px] text-faint">
            Accounts are provisioned by an administrator. Contact your admin for
            access.
          </p>
        </form>
      </div>
    </div>
  );
}
