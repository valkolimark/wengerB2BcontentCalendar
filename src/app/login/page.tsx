"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

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

  // Fixed brand navy gradient — the login splash stays dark in both themes.
  const inputClass =
    "h-[42px] w-full rounded-[10px] border border-white/20 bg-white/10 px-3 text-[14px] text-white placeholder:text-white/40 outline-none transition-[box-shadow,border-color] focus:border-white/50 focus:shadow-[0_0_0_3px_rgba(255,255,255,.12)]";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-5 font-sans"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #24487a 0%, #1c3b66 42%, #0e2038 100%)",
      }}
    >
      <div className="absolute right-4 top-4">
        <ThemeToggle className="flex size-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white/80 transition-colors hover:bg-white/20" />
      </div>

      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex justify-center">
          <Image
            src="/brand/logo-dk.png"
            alt="Wenger"
            width={240}
            height={135}
            priority
            className="h-auto w-[210px]"
          />
        </div>

        <form
          onSubmit={submit}
          className="rounded-[16px] border border-white/15 bg-white/[0.07] p-6 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur-md"
        >
          <h1 className="text-[18px] font-semibold text-white">Sign in</h1>
          <p className="mb-5 mt-1 text-[12.5px] text-white/55">
            Content Tracker · Wenger B2B
          </p>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-xs font-medium text-white/70">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="mb-5 block">
            <span className="mb-1.5 block text-xs font-medium text-white/70">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          {err && <p className="mb-3 text-[12.5px] text-red-300">{err}</p>}

          <button
            type="submit"
            disabled={pending}
            className="h-[42px] w-full rounded-[10px] bg-white text-[14px] font-semibold text-[#1c3b66] transition-colors hover:bg-white/90 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-4 text-[11.5px] text-white/45">
            Accounts are provisioned by an administrator. Contact your admin for
            access.
          </p>
        </form>
      </div>
    </div>
  );
}
