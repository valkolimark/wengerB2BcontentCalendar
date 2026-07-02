"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Send,
  Palette,
  Copy,
  Check,
  Tag,
  Building2,
  Users,
  Mail,
  Target,
  ChevronRight,
  Pencil,
  Trash2,
  Hash,
  GitBranch,
  Plus,
  Code2,
  Radio,
} from "lucide-react";
import type {
  Brand,
  CampaignWithEvents,
  DeliverableWithMeta,
  Initiative,
  List,
  Selected,
  SfParent,
} from "@/lib/types";
import { STATUS } from "@/lib/brands";
import { rollup } from "@/lib/rollups";
import { fmtMoney } from "@/lib/format";
import { assembleDeliverableUtm } from "@/lib/utm";
import {
  KIND_LABEL,
  TASK_LABEL,
  fmtDeliver,
  fmtReach,
  orderedTasks,
  reachOf,
  sortDeliverables,
} from "@/lib/deliverables";
import { deleteDeliverable } from "@/lib/actions";
import { sfParentChain } from "@/lib/sf";
import { DeliverableModal } from "@/components/modals/DeliverableModal";
import { JiraExportModal } from "@/components/modals/JiraExportModal";

type OpenSelection = NonNullable<Selected>;

export function DetailDrawer({
  selected,
  brandMap,
  initiatives,
  campaigns,
  lists,
  today,
  canSeeFinancials,
  canWrite,
  sfParents,
  focusDeliverableId,
  onSelect,
  onClose,
  onEdit,
  onDelete,
}: {
  selected: OpenSelection;
  brandMap: Record<string, Brand>;
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  lists: List[];
  today: Date;
  canSeeFinancials: boolean;
  canWrite: boolean;
  sfParents: SfParent[];
  focusDeliverableId?: string | null;
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
            lists={lists}
            focusDeliverableId={focusDeliverableId}
            canSeeFinancials={canSeeFinancials}
            sfParents={sfParents}
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
  lists,
  focusDeliverableId,
  canSeeFinancials,
  canWrite,
  sfParents,
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
  lists: List[];
  focusDeliverableId?: string | null;
  canSeeFinancials: boolean;
  canWrite: boolean;
  sfParents: SfParent[];
  copied: boolean;
  onCopy: (t: string) => void;
  onSelect: (sel: OpenSelection) => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [, startDelete] = useTransition();
  // Deliverable editor: false = closed, null = new, object = editing that one.
  const [delivModal, setDelivModal] =
    useState<DeliverableWithMeta | null | false>(false);
  const [jiraOpen, setJiraOpen] = useState(false);

  const tint = brand?.tint ?? "var(--color-hover)";
  const text = brand?.text ?? "var(--color-ink-soft)";
  const dot = brand?.dot ?? "#A09E94";

  const deliverables = sortDeliverables(campaign.deliverables);
  const emailCount = deliverables.filter((d) => d.kind === "email").length;

  const timeline = campaign.events
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const removeDeliverable = (d: DeliverableWithMeta) => {
    if (!window.confirm(`Delete deliverable “${d.name}”?`)) return;
    startDelete(async () => {
      try {
        await deleteDeliverable(d.id);
        router.refresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
      }
    });
  };

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
          {campaign.sf_id && (
            <Fact ic={<Hash size={14} />} k="SF ID" v={campaign.sf_id} mono />
          )}
          {campaign.sf_name && (
            <Fact ic={<Building2 size={14} />} k="SF name" v={campaign.sf_name} />
          )}
          {campaign.sf_parent_id &&
            (() => {
              const chain = sfParentChain(campaign.sf_parent_id, sfParents);
              return chain.length > 0 ? (
                <Fact
                  ic={<GitBranch size={14} />}
                  k="SF parent"
                  v={chain.map((c) => c.name).join(" → ")}
                />
              ) : null;
            })()}
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

        <div className="mb-2.5 mt-[22px] flex items-center justify-between">
          <div className="flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
            Deliverables
            <span className="ml-1.5 rounded-md bg-[var(--color-surface-2)] px-[7px] py-px text-[11px] font-medium normal-case tracking-normal text-ink-muted">
              {deliverables.length}
            </span>
          </div>
          {canWrite && (
            <div className="flex items-center gap-1">
              {emailCount > 0 && (
                <button
                  type="button"
                  onClick={() => setJiraOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:bg-[var(--color-hover)]"
                >
                  <GitBranch size={11} /> Jira
                </button>
              )}
              <button
                type="button"
                onClick={() => setDelivModal(null)}
                className="inline-flex items-center gap-1 rounded-md border border-navy bg-navy px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-navy-dark"
              >
                <Plus size={11} /> Deliverable
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {deliverables.map((d) => (
            <DeliverableCard
              key={d.id}
              deliverable={d}
              campaignCtx={{
                utm_campaign_override: campaign.utm_campaign_override,
                sf_code: campaign.sf_code,
              }}
              accent={dot}
              copied={copied}
              onCopy={onCopy}
              canWrite={canWrite}
              defaultOpen={d.id === focusDeliverableId}
              onEdit={() => setDelivModal(d)}
              onDelete={() => removeDeliverable(d)}
            />
          ))}
          {deliverables.length === 0 && (
            <div className="rounded-[10px] border border-dashed border-line px-4 py-5 text-center text-[13px] text-faint">
              No deliverables yet.
              {canWrite && " Add the sends that make up this campaign."}
            </div>
          )}
        </div>
      </div>

      {delivModal !== false && (
        <DeliverableModal
          deliverable={delivModal}
          campaignId={campaign.id}
          campaignName={campaign.name}
          campaignSfCode={campaign.sf_code}
          campaignOverride={campaign.utm_campaign_override}
          lists={lists}
          onClose={() => setDelivModal(false)}
        />
      )}
      {jiraOpen && (
        <JiraExportModal
          campaign={campaign}
          deliverables={deliverables}
          onClose={() => setJiraOpen(false)}
        />
      )}
    </>
  );
}

/* ---------------------------- deliverable card ---------------------------- */

const KIND_ACCENT: Record<string, string> = {
  email: "#3f6fb0",
  blog: "#7a5bb0",
  social: "#2f9e8f",
};

function DeliverableCard({
  deliverable: d,
  campaignCtx,
  accent,
  copied,
  onCopy,
  canWrite,
  defaultOpen,
  onEdit,
  onDelete,
}: {
  deliverable: DeliverableWithMeta;
  campaignCtx: { utm_campaign_override: string | null; sf_code: string };
  accent: string;
  copied: boolean;
  onCopy: (t: string) => void;
  canWrite: boolean;
  defaultOpen?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const utm = assembleDeliverableUtm(d, campaignCtx);
  const tasks = orderedTasks(d.tasks);
  const reach = reachOf(d.lists);
  const kindColor = KIND_ACCENT[d.kind] ?? accent;

  return (
    <div className="overflow-hidden rounded-[10px] border border-hair bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-hover)]"
      >
        <span
          className="rounded-[5px] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.04em] text-white"
          style={{ background: kindColor }}
        >
          {KIND_LABEL[d.kind]}
        </span>
        <span className="flex-1 truncate text-[13px] font-semibold">{d.name}</span>
        {d.utm_content && (
          <span className="hidden font-mono text-[10.5px] text-muted2 sm:inline">
            {d.utm_content}
          </span>
        )}
        <ChevronRight
          size={13}
          className="shrink-0 text-faint transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--color-hover)] bg-[var(--color-surface-2)] px-3 py-3">
          {/* comp → code → send chain */}
          {tasks.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-[7px] border border-hair bg-surface px-2 py-1.5"
                  style={{ borderLeft: `3px solid ${kindColor}` }}
                >
                  <div className="text-[9.5px] font-semibold uppercase tracking-[0.05em] text-faint">
                    {TASK_LABEL[t.kind]}
                  </div>
                  <div className="font-mono text-[12px] font-semibold">
                    {t.due ?? "—"}
                  </div>
                  {t.owner && (
                    <div className="truncate text-[11px] text-ink-muted">{t.owner}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* role views: send + coding */}
          <div className="mb-3 flex flex-col gap-2">
            {(d.email_subject || d.segment || d.sf_name || d.deliver_at) && (
              <RoleCard icon={<Mail size={12} />} title="Email send" tint="#0f7a6e">
                {d.sf_name && <RoleKV k="SF campaign" v={d.sf_name} />}
                {d.deliver_at && <RoleKV k="Deliver" v={fmtDeliver(d.deliver_at)} mono />}
                {d.email_subject && <RoleKV k="Subject" v={d.email_subject} />}
                {d.segment && <RoleKV k="Segment" v={d.segment} />}
              </RoleCard>
            )}
            <RoleCard icon={<Code2 size={12} />} title="Coding" tint="#3f6fb0">
              {d.sf_id && <RoleKV k="Campaign ID" v={d.sf_id} mono />}
              <RoleKV k="UTM" v={utm} mono />
              {d.landing_page && <RoleKV k="Landing page" v={d.landing_page} mono />}
            </RoleCard>
          </div>

          {/* audience lists */}
          {d.lists.length > 0 && (
            <div className="mb-1">
              <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-faint">
                <Radio size={11} /> Audience{d.lists.length > 1 ? " lists" : ""}
                {d.lists.length > 1 && (
                  <span className="font-mono normal-case tracking-normal text-[#3f6fb0]">
                    {fmtReach(reach)} combined
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {d.lists.map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-0.5 text-[11.5px]"
                  >
                    {l.name}
                    <span className="rounded bg-[var(--color-hover)] px-1 font-mono text-[10.5px] text-muted2">
                      {fmtReach(l.reach)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {d.notes && (
            <div className="mt-2 flex gap-1.5 rounded-[7px] border border-[#efe9d9] bg-[#fbfaf6] px-2.5 py-1.5 text-[11.5px] text-ink-muted">
              <span className="mt-px font-semibold text-[#8a5a0b]">Note</span>
              <span className="break-words">{d.notes}</span>
            </div>
          )}

          {/* UTM copy + actions */}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCopy(utm)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] transition-colors hover:bg-[var(--color-hover)]"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy UTM"}
            </button>
            <span className="flex-1" />
            {canWrite && (
              <>
                <IconBtn label="Edit deliverable" onClick={onEdit}>
                  <Pencil size={13} />
                </IconBtn>
                <IconBtn label="Delete deliverable" onClick={onDelete}>
                  <Trash2 size={13} />
                </IconBtn>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleCard({
  icon,
  title,
  tint,
  children,
}: {
  icon: ReactNode;
  title: string;
  tint: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-hair bg-surface">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-white"
        style={{ background: tint }}
      >
        {icon} {title}
      </div>
      <div className="flex flex-col px-2.5 py-1.5">{children}</div>
    </div>
  );
}

function RoleKV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-2 py-[3px] text-[12px]">
      <span className="min-w-[74px] shrink-0 font-medium text-muted2">{k}</span>
      <span className={`break-words ${mono ? "font-mono text-[11px]" : ""}`}>{v}</span>
    </div>
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
