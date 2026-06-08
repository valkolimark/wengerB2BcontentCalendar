"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Profile, Role } from "@/lib/types";
import { setFinancialAccess, updateUserRole } from "@/lib/actions";

const ROLES: Role[] = ["admin", "member", "external"];
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Admin "Team" view: set each user's role and toggle financial access — the
 * concrete way an admin (Jackie) grants/revokes the financial flag. Every
 * change calls an admin-only, RLS-guarded Server Action.
 */
export function TeamTable({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-hair bg-white px-[22px] py-[13px]">
        <Link
          href="/"
          className="flex size-8 items-center justify-center rounded-lg border border-line bg-white text-[#4a4a45] transition-colors hover:bg-[#f2f0ea]"
          aria-label="Back to app"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.01em]">Team</div>
          <div className="text-[11px] text-muted2">Roles &amp; financial access</div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] p-[22px]">
        {err && <p className="mb-3 text-[12.5px] text-[#b91c1c]">{err}</p>}

        <div className="overflow-hidden rounded-[14px] border border-hair bg-white">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-hair text-left text-muted2">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Financial access</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const isSelf = p.id === currentUserId;
                const financialsOn = p.role === "admin" || p.can_see_financials;
                return (
                  <tr key={p.id} className="border-b border-[#f5f5f4] last:border-0">
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
                          run(() => updateUserRole(p.id, e.target.value as Role))
                        }
                        className="h-[34px] rounded-[9px] border border-line bg-white px-2 text-[13px] outline-none focus:border-navy disabled:opacity-50"
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
                            run(() => setFinancialAccess(p.id, e.target.checked))
                          }
                        />
                        <span className="text-[12.5px] text-muted">
                          {financialsOn ? "Granted" : "Off"}
                          {p.role === "admin" ? " (admin)" : ""}
                        </span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11.5px] text-faint">
          Granting financial access lets a member see leads + pipeline. Admins
          always have it. External users never do.
        </p>
      </main>
    </div>
  );
}
