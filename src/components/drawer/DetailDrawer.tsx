"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  X,
  Send,
  Palette,
  Copy,
  Check,
  Lock,
  Tag,
  Building2,
  Users,
  Mail,
  Target,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import type {
  Brand,
  CampaignWithEvents,
  Initiative,
  Selected,
} from "@/lib/types";
import { STATUS } from "@/lib/brands";
import { rollup } from "@/lib/rollups";
import { fmtMoney } from "@/lib/format";
import { assembleUtm } from "@/lib/utm";

type OpenSelection = NonNullable<Selected>;

export function DetailDrawer({
  selected,
  brandMap,
  initiatives,
  campaigns,
  today,
  canSeeFinancials,
  canWrite,
  onSelect,
  onClose,
  onEdit,
  onDelete,
}: {
  selected: OpenSelection;
  brandMap: Record<string, Brand>;
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  today: Date;
  canSeeFinancials: boolean;
  canWrite: boolean;
  onSelect: (sel: OpenSelection) => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const campaign =
    selected.kind === "campaign"
      ? campaigns.find((c) => c.id === selected.id)
      : null;
  const initiative =
    selected.kind === "initiative"
      ? initiatives.find((i) => i.id === selected.id)
      : null;

  if (!campaign && !initiative) return null;

  const doCopy = (t: string) => {
    try {
      navigator.clipboard.writeText(t);
    } catch {
      // clipboard unavailable — no-op
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div
      className="fixed inset-0 z-20 flex justify-end bg-[rgba(20,18,14,.34)]"
      onClick={onClose}
    >
      <aside
        className="h-full w-[412px] max-w-[92vw] overflow-y-auto bg-surface"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {campaign && (
          <CampaignBody
            campaign={campaign}
            brand={brandMap[campaign.brand_id]}
            parent={
              campaign.initiative_id
                ? initiatives.find((i) => i.id === campaign.initiative_id) ?? null
                : null
            }
            canSeeFinancials={canSeeFinancials}
            copied={copied}
            onCopy={doCopy}
            onSelect={onSelect}
            onClose={onClose}
            canWrite={canWrite}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
        {initiative && (
          <InitiativeBody
            initiative={initiative}
            campaigns={campaigns}
            brandMap={brandMap}
            today={today}
            canSeeFinancials={canSeeFinancials}
            onSelect={onSelect}
            onClose={onClose}
            canWrite={canWrite}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </aside>
    </div>
  );
}

/* ------------------------------- shared bits ------------------------------ */

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-hover)]"
    >
      {children}
    </button>
  );
}

function Fact({ ic, k, v, mono }: { ic: ReactNode; k: string; v: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[22px_78px_1fr] items-center gap-2 border-b border-[var(--color-hover)] py-[9px] text-[13px]">
      <span className="text-faint">{ic}</span>
      <span className="text-muted2">{k}</span>
      <span className={`font-medium ${mono ? "font-mono text-[12.5px]" : ""}`}>{v}</span>
    </div>
  );
}

function SecLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2.5 mt-[22px] flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
      {children}
    </div>
  );
}

/* ------------------------------ campaign mode ----------------------------- */

function CampaignBody({
  campaign,
  brand,
  parent,
  canSeeFinancials,
  canWrite,
  copied,
  onCopy,
  onSelect,
  onClose,
  onEdit,
  onDelete,
}: {
  campaign: CampaignWithEvents;
  brand: Brand | undefined;
  parent: Initiative | null;
  canSeeFinancials: boolean;
  canWrite: boolean;
  copied: boolean;
  onCopy: (t: string) => void;
  onSelect: (sel: OpenSelection) => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tint = brand?.tint ?? "var(--color-hover)";
  const text = brand?.text ?? "var(--color-ink-soft)";
  const dot = brand?.dot ?? "#A09E94";

  // Assemble (never store) the UTM string from the campaign's fields.
  const utm = assembleUtm({
    source: campaign.utm_source,
    medium: campaign.utm_medium,
    campaign: campaign.sf_code,
    content: campaign.utm_content,
  });

  const timeline = campaign.events
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ background: tint }}
      >
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold" style={{ color: text }}>
          <span className="size-2.5 rounded-[3px]" style={{ background: dot }} />
          {brand?.label ?? campaign.brand_id}
        </div>
        <div className="flex gap-0.5">
          {canWrite && (
            <>
              <IconBtn label="Edit campaign" onClick={onEdit}>
                <Pencil size={15} />
              </IconBtn>
              <IconBtn label="Delete campaign" onClick={onDelete}>
                <Trash2 size={15} />
              </IconBtn>
            </>
          )}
          <IconBtn label="Close" onClick={onClose}>
            <X size={18} />
          </IconBtn>
        </div>
      </div>

      <div className="p-[18px]">
        {parent && (
          <button
            type="button"
            onClick={() => onSelect({ kind: "initiative", id: parent.id })}
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted2 transition-colors hover:text-navy"
          >
            <ChevronRight size={12} /> {parent.name}
          </button>
        )}
        <div className="mb-2.5 text-[21px] font-semibold tracking-[-0.02em]">
          {campaign.name}
        </div>

        <div className="mb-1.5 mt-[18px] flex flex-col">
          <Fact ic={<Tag size={14} />} k="Channel" v={campaign.channel} />
          <Fact ic={<Building2 size={14} />} k="Vendor" v={campaign.vendor} />
          <Fact ic={<Users size={14} />} k="Segment" v={campaign.segment} />
          <Fact ic={<Mail size={14} />} k="Owner" v={campaign.owner} />
          <Fact ic={<Target size={14} />} k="SF code" v={campaign.sf_code} mono />
          {canSeeFinancials && (
            <>
              <Fact ic={<Users size={14} />} k="Leads" v={String(campaign.leads || 0)} />
              <Fact ic={<Target size={14} />} k="Pipeline" v={fmtMoney(campaign.pipeline)} />
            </>
          )}
        </div>

        <SecLabel>Timeline</SecLabel>
        <div className="flex flex-col gap-0.5">
          {timeline.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2.5 py-[7px] text-[13px]">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-[7px]"
                style={{ color: text, background: tint }}
              >
                {ev.type === "launch" ? <Send size={12} /> : <Palette size={12} />}
              </span>
              <span className="min-w-[92px] font-mono text-xs text-ink-muted">{ev.date}</span>
              <span className="text-[var(--color-ink-soft)]">
                {ev.type === "launch" ? "Launch" : "Comp review due"}
              </span>
            </div>
          ))}
        </div>

        <SecLabel>
          UTM query string
          <span className="ml-1.5 rounded-md bg-[#e7f1e6] px-[7px] py-px text-[11px] font-medium normal-case tracking-normal text-[#2e6b3e]">
            auto-assembled
          </span>
        </SecLabel>
        <div className="flex items-center gap-2 rounded-[10px] border border-hair bg-[var(--color-surface-2)] px-3 py-[11px]">
          <code className="flex-1 break-all text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
            {utm}
          </code>
          <button
            type="button"
            onClick={() => onCopy(utm)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover)]"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-faint">
          <Lock size={11} /> source · medium · campaign · content resolve from
          Vendor, Channel &amp; SF code
        </div>
      </div>
    </>
  );
}

/* ----------------------------- initiative mode ---------------------------- */

function InitiativeBody({
  initiative,
  campaigns,
  brandMap,
  today,
  canSeeFinancials,
  canWrite,
  onSelect,
  onClose,
  onEdit,
  onDelete,
}: {
  initiative: Initiative;
  campaigns: CampaignWithEvents[];
  brandMap: Record<string, Brand>;
  today: Date;
  canSeeFinancials: boolean;
  canWrite: boolean;
  onSelect: (sel: OpenSelection) => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const r = rollup(initiative.id, campaigns, today);
  const st = STATUS[initiative.status] ?? STATUS.Planning;
  const bs = r.brands.map((id) => brandMap[id]).filter(Boolean);
  const children = campaigns.filter((c) => c.initiative_id === initiative.id);

  return (
    <>
      <div className="flex items-center justify-between bg-[var(--color-hover)] px-4 py-3.5">
        <div className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <span className="inline-flex gap-[3px]">
            {bs.map((b) => (
              <span key={b.id} className="size-2.5 rounded-[3px]" style={{ background: b.dot }} />
            ))}
          </span>
          {bs.length > 1
            ? "Co-branded initiative"
            : bs[0]?.label ?? "Initiative"}
        </div>
        <div className="flex gap-0.5">
          {canWrite && (
            <>
              <IconBtn label="Edit initiative" onClick={onEdit}>
                <Pencil size={15} />
              </IconBtn>
              <IconBtn label="Delete initiative" onClick={onDelete}>
                <Trash2 size={15} />
              </IconBtn>
            </>
          )}
          <IconBtn label="Close" onClick={onClose}>
            <X size={18} />
          </IconBtn>
        </div>
      </div>

      <div className="p-[18px]">
        <div className="mb-2.5 text-[21px] font-semibold tracking-[-0.02em]">
          {initiative.name}
        </div>
        <span
          className="inline-block rounded-[7px] px-[9px] py-0.5 text-[11px] font-semibold"
          style={{ background: st.bg, color: st.fg }}
        >
          {initiative.status}
        </span>

        <div className="mb-1.5 mt-[18px] flex flex-col">
          <Fact ic={<Mail size={14} />} k="Owner" v={initiative.owner} />
          <Fact ic={<Send size={14} />} k="Progress" v={`${r.sent} of ${r.total} sent`} />
          {canSeeFinancials && (
            <>
              <Fact ic={<Users size={14} />} k="Leads" v={String(r.leads)} />
              <Fact ic={<Target size={14} />} k="Pipeline" v={fmtMoney(r.pipeline)} />
            </>
          )}
        </div>

        <SecLabel>
          Campaigns
          <span className="ml-1.5 rounded-md bg-[var(--color-surface-2)] px-[7px] py-px text-[11px] font-medium normal-case tracking-normal text-ink-muted">
            {r.count}
          </span>
        </SecLabel>
        <div className="flex flex-col gap-1.5">
          {children.map((c) => {
            const b = brandMap[c.brand_id];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect({ kind: "campaign", id: c.id })}
                className="flex items-center gap-2.5 rounded-[10px] border border-[var(--color-cell)] bg-surface px-3 py-2.5 text-left transition-colors hover:border-[#d5d1c7] hover:bg-out"
              >
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: b?.dot }} />
                <span className="flex-1 text-[13px] font-medium">{c.name}</span>
                <span className="text-[11.5px] text-faint">
                  {c.channel}
                  {canSeeFinancials ? ` · ${fmtMoney(c.pipeline)}` : ""}
                </span>
                <ChevronRight size={13} className="shrink-0 text-faint" />
              </button>
            );
          })}
          {r.count === 0 && (
            <div className="px-4 py-4 text-[13px] text-faint">No campaigns yet.</div>
          )}
        </div>
      </div>
    </>
  );
}
