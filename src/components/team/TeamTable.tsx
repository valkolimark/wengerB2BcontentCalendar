"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  UserPlus,
  Trash2,
  KeyRound,
  RefreshCw,
  Check,
  Copy,
} from "lucide-react";
import type { Profile, Role } from "@/lib/types";
import {
  setFinancialAccess,
  updateUserRole,
  createUser,
  deleteUser,
  resetUserPassword,
} from "@/lib/actions";

const ROLES: Role[] = ["admin", "member", "external"];
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// A readable, reasonably-strong initial password the admin can hand off.
function genPassword(): string {
  const words = ["Wenger", "Stage", "Rigging", "Curtain", "Podium", "Riser", "Encore", "Arbor"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  const sym = "!@#$%".charAt(Math.floor(Math.random() * 5));
  return `${w}${n}${sym}`;
}

export function TeamTable({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Add-user form state.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(genPassword());
  const [role, setRole] = useState<Role>("member");
  const [canSee, setCanSee] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const run = (fn: () => Promise<void>) => {
    setErr(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

  const addUser = () => {
    setErr(null);
    setCreated(null);
    start(async () => {
      try {
        await createUser({ email, password, role, canSeeFinancials: canSee });
        setCreated({ email: email.trim().toLowerCase(), password });
        setEmail("");
        setPassword(genPassword());
        setRole("member");
        setCanSee(false);
        router.refresh();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

  const removeUser = (p: Profile) => {
    if (!window.confirm(`Remove ${p.email ?? p.id}? This deletes their login and cannot be undone.`)) return;
    run(async () => {
      await deleteUser(p.id);
      router.refresh();
    });
  };

  const resetPw = (p: Profile) => {
    const pw = window.prompt(`New password for ${p.email ?? p.id} (min 8 chars):`, genPassword());
    if (!pw) return;
    run(async () => {
      await resetUserPassword(p.id, pw);
      window.alert(`Password updated for ${p.email ?? p.id}.`);
    });
  };

  const copyCreds = () => {
    if (!created) return;
    try {
      navigator.clipboard.writeText(`${created.email} / ${created.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-hair bg-surface px-[22px] py-[13px]">
        <Link
          href="/"
          className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-hover)]"
          aria-label="Back to app"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.01em]">Team</div>
          <div className="text-[11px] text-muted2">Add people · roles &amp; financial access</div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] p-[22px]">
        {err && <p className="mb-3 text-[12.5px] text-[#b91c1c]">{err}</p>}

        {/* Add user */}
        <section className="mb-5 rounded-[14px] border border-hair bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
            <UserPlus size={15} /> Add a user
          </div>

          {created && (
            <div className="mb-3 rounded-[10px] border border-[#cfe6d2] bg-[#eef7f0] px-3 py-2.5 text-[12.5px]">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-[#2e6b3e]">
                <Check size={14} /> Created — share these credentials
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all font-mono text-[12px]">
                  {created.email} / {created.password}
                </code>
                <button
                  type="button"
                  onClick={copyCreds}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11.5px] transition-colors hover:bg-[var(--color-hover)]"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted2">
                They can sign in immediately and should change this after first login.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-ink-muted">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@wengercorp.com"
                autoComplete="off"
                className="h-[38px] w-full rounded-[9px] border border-line bg-surface px-3 text-[13.5px] outline-none focus:border-navy"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-ink-muted">Initial password</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-[38px] w-full rounded-[9px] border border-line bg-surface px-3 font-mono text-[13px] outline-none focus:border-navy"
                />
                <button
                  type="button"
                  onClick={() => setPassword(genPassword())}
                  title="Generate a new password"
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-muted transition-colors hover:bg-[var(--color-hover)]"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-ink-muted">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-[38px] w-full rounded-[9px] border border-line bg-surface px-2 text-[13px] outline-none focus:border-navy"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <label className="inline-flex h-[38px] items-center gap-2 text-[12.5px] text-ink-muted">
                <input
                  type="checkbox"
                  checked={role === "admin" ? true : canSee}
                  disabled={role !== "member"}
                  onChange={(e) => setCanSee(e.target.checked)}
                />
                Financial access
                {role === "admin" && <span className="text-faint">(admins always)</span>}
                {role === "external" && <span className="text-faint">(never)</span>}
              </label>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-faint">
              Creates the login now — no verification email. Members can be granted financials.
            </p>
            <button
              type="button"
              onClick={addUser}
              disabled={pending || !email.trim() || password.length < 8}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
            >
              <UserPlus size={14} /> Add user
            </button>
          </div>
        </section>

        {/* Existing users */}
        <div className="overflow-hidden rounded-[14px] border border-hair bg-surface">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-hair text-left text-muted2">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Financial access</th>
                <th className="px-4 py-3 font-semibold text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const isSelf = p.id === currentUserId;
                const financialsOn = p.role === "admin" || p.can_see_financials;
                return (
                  <tr key={p.id} className="border-b border-[var(--color-surface-2)] last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium">{p.email ?? p.id}</span>
                      {isSelf && (
                        <span className="ml-2 rounded-md bg-seg px-1.5 py-px text-[11px] text-muted2">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.role}
                        disabled={pending || isSelf}
                        title={isSelf ? "You can't change your own role" : undefined}
                        onChange={(e) =>
                          run(async () => {
                            await updateUserRole(p.id, e.target.value as Role);
                            router.refresh();
                          })
                        }
                        className="h-[34px] rounded-[9px] border border-line bg-surface px-2 text-[13px] outline-none focus:border-navy disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={financialsOn}
                          disabled={pending || p.role === "admin"}
                          title={
                            p.role === "admin"
                              ? "Admins always have financial access"
                              : undefined
                          }
                          onChange={(e) =>
                            run(async () => {
                              await setFinancialAccess(p.id, e.target.checked);
                              router.refresh();
                            })
                          }
                        />
                        <span className="text-[12.5px] text-ink-muted">
                          {financialsOn ? "Granted" : "Off"}
                          {p.role === "admin" ? " (admin)" : ""}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => resetPw(p)}
                          disabled={pending}
                          title="Reset password"
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-hover)] disabled:opacity-50"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeUser(p)}
                          disabled={pending || isSelf}
                          title={isSelf ? "You can't remove yourself" : "Remove user"}
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-hover)] disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11.5px] text-faint">
          Granting financial access lets a member see leads + pipeline. Admins always
          have it; external users never do.
        </p>
      </main>
    </div>
  );
}
