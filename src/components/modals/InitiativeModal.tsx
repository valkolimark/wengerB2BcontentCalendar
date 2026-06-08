"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Check, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Brand, CampaignWithEvents, Initiative } from "@/lib/types";
import { STATUS_OPTS } from "@/lib/brands";
import {
  adoptCampaigns,
  createInitiative,
  updateInitiative,
} from "@/lib/actions";
import { Field, inputClass } from "./Field";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function InitiativeModal({
  initiative,
  initiatives,
  campaigns,
  brands,
  onClose,
}: {
  initiative: Initiative | null;
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  brands: Brand[];
  onClose: () => void;
}) {
  const router = useRouter();
  const editing = !!initiative;
  const [name, setName] = useState(initiative?.name ?? "");
  const [owner, setOwner] = useState(initiative?.owner ?? "");
  const [status, setStatus] = useState(initiative?.status ?? "Planning");
  const [cq, setCq] = useState("");
  const [attach, setAttach] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const brandMap = useMemo(() => {
    const m: Record<string, Brand> = {};
    for (const b of brands) m[b.id] = b;
    return m;
  }, [brands]);

  const initiativeIds = useMemo(
    () => new Set(initiatives.map((i) => i.id)),
    [initiatives]
  );
  const isOrphan = (c: CampaignWithEvents) =>
    !c.initiative_id || !initiativeIds.has(c.initiative_id);

  const members = editing
    ? campaigns.filter((c) => c.initiative_id === initiative!.id)
    : [];
  const orphanCount = campaigns.filter(isOrphan).length;

  const cql = cq.trim().toLowerCase();
  const pool = campaigns.filter((c) => c.initiative_id !== initiative?.id);
  const candidates = (
    cql
      ? pool.filter((c) =>
          [c.name, brandMap[c.brand_id]?.label, c.channel, c.vendor, c.sf_code].some(
            (v) => (v || "").toLowerCase().includes(cql)
          )
        )
      : pool.filter(isOrphan)
  )
    .slice()
    .sort((a, b) => (isOrphan(b) ? 1 : 0) - (isOrphan(a) ? 1 : 0));

  const toggle = (id: string) =>
    setAttach((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const save = () => {
    if (!name.trim()) {
      setErr("Initiative name is required.");
      return;
    }
    setErr(null);
    start(async () => {
      try {
        const id = editing
          ? (await updateInitiative(initiative!.id, { name, owner, status }),
            initiative!.id)
          : await createInitiative({ name, owner, status });
        if (attach.length) await adoptCampaigns(id, attach);
        router.refresh();
        onClose();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit initiative" : "New initiative"}</DialogTitle>
        </DialogHeader>

        <Field label="Initiative name">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Back-to-School push"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner">
            <input
              className={inputClass}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. Whitney Winkels"
            />
          </Field>
          <Field label="Status">
            <select
              className={`${inputClass} cursor-pointer`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        {members.length > 0 && (
          <>
            <div className="mb-2 mt-1.5 flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
              Campaigns here
              <span className="ml-1.5 rounded-md bg-[#eeede7] px-[7px] py-px text-[11px] font-medium normal-case tracking-normal text-muted">
                {members.length}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {members.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-[9px] border border-[#f0eee7] bg-[#fbfaf6] px-[11px] py-2"
                >
                  <span className="size-2.5 rounded-[3px]" style={{ background: brandMap[c.brand_id]?.dot }} />
                  <span className="flex-1 text-[13px] font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mb-2 mt-[22px] flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
          Find &amp; attach campaigns
          {orphanCount > 0 && (
            <span className="ml-1.5 rounded-md bg-[#fbefd6] px-[7px] py-px text-[11px] font-medium normal-case tracking-normal text-[#8a5a0b]">
              {orphanCount} orphan{orphanCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="mb-2 flex h-9 items-center gap-2 rounded-[9px] border border-line bg-white px-3 transition-[box-shadow,border-color] focus-within:border-navy focus-within:shadow-[0_0_0_3px_rgba(28,59,102,.1)]">
          <Search size={14} className="shrink-0 text-faint" />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            value={cq}
            onChange={(e) => setCq(e.target.value)}
            placeholder="Search campaigns to pull in…"
          />
          {cq && (
            <button
              type="button"
              onClick={() => setCq("")}
              aria-label="Clear"
              className="flex size-[22px] items-center justify-center rounded-full bg-seg text-muted"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex max-h-[170px] flex-col gap-1.5 overflow-y-auto pr-0.5">
          {candidates.length === 0 && (
            <div className="px-2 py-3 text-[13px] text-faint">
              {cql ? "No campaigns match." : "No orphan campaigns. Search to move one here."}
            </div>
          )}
          {candidates.map((c) => {
            const on = attach.includes(c.id);
            const orph = isOrphan(c);
            const parent = initiatives.find((i) => i.id === c.initiative_id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className="flex w-full items-center gap-2.5 rounded-[9px] border px-[11px] py-2 text-left transition-colors"
                style={{
                  borderColor: on ? "var(--color-navy)" : "var(--color-cell)",
                  background: on ? "#eef3f9" : "#fff",
                }}
              >
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: brandMap[c.brand_id]?.dot }} />
                <span className="flex-1 text-[13px] font-medium">{c.name}</span>
                {orph ? (
                  <span className="rounded-md bg-[#fbefd6] px-[7px] py-px text-[10.5px] font-semibold text-[#8a5a0b]">
                    orphan
                  </span>
                ) : (
                  <span className="text-[11.5px] text-faint">{parent?.name}</span>
                )}
                <span className="shrink-0 text-navy">
                  {on ? <Check size={14} /> : <Plus size={14} />}
                </span>
              </button>
            );
          })}
        </div>

        {err && <p className="mt-2 text-[12.5px] text-[#b91c1c]">{err}</p>}

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-[11.5px] text-faint">
            {attach.length
              ? `${attach.length} campaign${attach.length !== 1 ? "s" : ""} will move here`
              : "Brand-agnostic · brands come from its campaigns"}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={pending || !name.trim()}
            className="rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
          >
            {editing ? "Save" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
