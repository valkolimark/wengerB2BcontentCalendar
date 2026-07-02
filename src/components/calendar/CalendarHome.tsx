"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Plus, LogOut, Users, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import type {
  Brand,
  CalendarEvent,
  CalendarMarkerType,
  CampaignWithEvents,
  Initiative,
  List,
  Role,
  Selected,
  SfParent,
} from "@/lib/types";
import { parseISO } from "@/lib/dates";
import { sendDateOf, taskOf } from "@/lib/deliverables";
import { deleteCampaign, deleteInitiative, signOut } from "@/lib/actions";
import { Toolbar } from "./Toolbar";
import { BrandLegend } from "./BrandLegend";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { InitiativeCards } from "@/components/initiative/InitiativeCards";
import { DetailDrawer } from "@/components/drawer/DetailDrawer";
import { GlobalSearch } from "@/components/home/GlobalSearch";
import { OrphanBar } from "@/components/home/OrphanBar";
import { BrandModal } from "@/components/modals/BrandModal";
import { InitiativeModal } from "@/components/modals/InitiativeModal";
import { CampaignModal } from "@/components/modals/CampaignModal";
import { DataMenu } from "@/components/data/DataMenu";
import { ImportModal } from "@/components/data/ImportModal";

export type CalendarView = "month" | "week" | "day";

type ModalState =
  | { type: "brand" }
  | { type: "initiative"; editId?: string }
  | { type: "campaign"; editId?: string; presetInitiative?: string }
  | null;

// Default to June 2026, where the seed lives, so the calendar shows populated
// on first load. The Today button jumps to the real current month.
const DEFAULT_CURSOR = new Date(2026, 5, 1);

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  member: "Member",
  external: "External",
};

export function CalendarHome({
  brands,
  initiatives,
  campaigns,
  sfParents,
  lists,
  todayKey,
  role,
  canSeeFinancials,
  jiraConfigured,
  userEmail,
}: {
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  sfParents: SfParent[];
  lists: List[];
  todayKey: string;
  role: Role;
  canSeeFinancials: boolean;
  jiraConfigured: boolean;
  userEmail: string | null;
}) {
  // External users are read-only; admin/member can write content.
  const canWrite = role !== "external";
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState<Date>(DEFAULT_CURSOR);
  const [hiddenBrands, setHiddenBrands] = useState<Set<string>>(new Set());
  const [hiddenTypes, setHiddenTypes] = useState<Set<CalendarMarkerType>>(
    new Set()
  );
  const [selected, setSelected] = useState<Selected>(null);
  const [focusDeliverableId, setFocusDeliverableId] = useState<string | null>(
    null
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [importing, setImporting] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [q, setQ] = useState("");
  const [, startDelete] = useTransition();

  // Server-provided "today" — deterministic across SSR/hydration.
  const today = useMemo(() => parseISO(todayKey), [todayKey]);

  const brandMap = useMemo(() => {
    const m: Record<string, Brand> = {};
    for (const b of brands) m[b.id] = b;
    return m;
  }, [brands]);

  const initiativeById = (id: string | null) =>
    id ? initiatives.find((i) => i.id === id) : undefined;

  // Flatten campaigns → events into the calendar's render shape (Cycle 2), plus
  // deliverable send markers (Cycle 12) synthesized from each send date.
  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      campaigns.flatMap((c) => {
        const events: CalendarEvent[] = c.events.map((e) => ({
          id: e.id,
          date: e.date,
          type: e.type,
          label: e.label,
          brandId: c.brand_id,
          campaignId: c.id,
          campaignName: c.name,
        }));
        for (const d of c.deliverables) {
          const base = {
            brandId: c.brand_id,
            campaignId: c.id,
            campaignName: c.name,
            deliverableId: d.id,
          };
          const send = sendDateOf(d);
          if (send)
            events.push({ id: `send-${d.id}`, date: send, type: "send", label: `Send · ${d.name}`, ...base });
          const comp = taskOf(d.tasks, "comp")?.due;
          if (comp)
            events.push({ id: `dcomp-${d.id}`, date: comp, type: "deliv_comp", label: `Comp · ${d.name}`, ...base });
          const code = taskOf(d.tasks, "code")?.due;
          if (code)
            events.push({ id: `dcode-${d.id}`, date: code, type: "deliv_code", label: `Code · ${d.name}`, ...base });
        }
        return events;
      }),
    [campaigns]
  );

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of calendarEvents) {
      if (hiddenBrands.has(ev.brandId)) continue;
      if (hiddenTypes.has(ev.type)) continue;
      (map[ev.date] ??= []).push(ev);
    }
    return map;
  }, [calendarEvents, hiddenBrands, hiddenTypes]);

  const toggleType = (t: CalendarMarkerType) =>
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  // Orphans: no initiative, or pointing at a missing one.
  const initiativeIds = useMemo(
    () => new Set(initiatives.map((i) => i.id)),
    [initiatives]
  );
  const orphans = useMemo(
    () =>
      campaigns.filter(
        (c) => !c.initiative_id || !initiativeIds.has(c.initiative_id)
      ),
    [campaigns, initiativeIds]
  );

  // Global search over initiatives + campaigns.
  const ql = q.trim().toLowerCase();
  const campMatch = (c: CampaignWithEvents) =>
    [
      c.name,
      c.brand_id,
      brandMap[c.brand_id]?.label,
      c.channel,
      c.vendor,
      c.segment,
      c.owner,
      c.sf_code,
      c.utm_content,
    ].some((v) => (v || "").toLowerCase().includes(ql));
  const initMatch = (i: Initiative) =>
    [i.name, i.owner, i.status].some((v) =>
      (v || "").toLowerCase().includes(ql)
    ) || campaigns.filter((c) => c.initiative_id === i.id).some(campMatch);

  const visibleInitiatives = ql ? initiatives.filter(initMatch) : initiatives;
  const matchedCampaigns = ql ? campaigns.filter(campMatch) : [];

  const move = (dir: number) => {
    setCursor((c) => {
      const d = new Date(c);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  };

  const toggleBrand = (id: string) =>
    setHiddenBrands((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectCampaign = (campaignId: string, deliverableId?: string) => {
    setSelected({ kind: "campaign", id: campaignId });
    setFocusDeliverableId(deliverableId ?? null);
  };

  const editSelected = () => {
    if (!selected) return;
    setModal(
      selected.kind === "campaign"
        ? { type: "campaign", editId: selected.id }
        : { type: "initiative", editId: selected.id }
    );
    setSelected(null);
  };

  const deleteSelected = () => {
    if (!selected) return;
    const isCamp = selected.kind === "campaign";
    const name = isCamp
      ? campaigns.find((c) => c.id === selected.id)?.name
      : initiativeById(selected.id)?.name;
    const ok = window.confirm(
      isCamp
        ? `Delete campaign “${name}”?`
        : `Delete “${name}”? Its campaigns become unassigned, not deleted.`
    );
    if (!ok) return;
    const id = selected.id;
    startDelete(async () => {
      try {
        if (isCamp) await deleteCampaign(id);
        else await deleteInitiative(id);
        setSelected(null);
        router.refresh();
      } catch (e) {
        window.alert(errMsg(e));
      }
    });
  };

  const editCampaign = modal?.type === "campaign" && modal.editId
    ? campaigns.find((c) => c.id === modal.editId) ?? null
    : null;
  const editInitiative = modal?.type === "initiative" && modal.editId
    ? initiatives.find((i) => i.id === modal.editId) ?? null
    : null;

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hair bg-surface px-[22px] py-[13px]">
        <div className="flex items-center gap-3">
          {/* Theme-swapped Wenger logo (light artwork on dark, dark on light). */}
          <Image
            src="/brand/logo-lt.png"
            alt="Wenger"
            width={120}
            height={68}
            priority
            className="block h-7 w-auto dark:hidden"
          />
          <Image
            src="/brand/logo-dk.png"
            alt="Wenger"
            width={120}
            height={68}
            priority
            className="hidden h-7 w-auto dark:block"
          />
          <span className="hidden h-6 w-px bg-line sm:block" />
          <div className="hidden text-[13px] font-semibold tracking-[-0.01em] text-ink-muted sm:block">
            Content Tracker
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-surface px-2.5 py-[6px] text-[13px] font-medium transition-colors hover:border-[#d5d1c7] hover:bg-[var(--color-hover)]"
            title="Ask the assistant"
          >
            <Sparkles size={14} /> Ask
          </button>
          <ThemeToggle />
          <DataMenu
            brands={brands}
            initiatives={initiatives}
            campaigns={campaigns}
            sfParents={sfParents}
            canSeeFinancials={canSeeFinancials}
            isAdmin={role === "admin"}
            onImport={() => setImporting(true)}
          />
          {role === "admin" && (
            <Link
              href="/team"
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-surface px-2.5 py-[6px] text-[13px] font-medium transition-colors hover:bg-[var(--color-hover)]"
            >
              <Users size={14} /> Team
            </Link>
          )}
          <div
            className="flex items-center gap-[7px] rounded-[9px] border border-hair bg-[var(--color-hover)] px-2.5 py-[5px] text-[13px] font-medium text-ink-muted"
            title={userEmail ?? undefined}
          >
            <ShieldCheck size={15} />
            <span className="max-w-[180px] truncate">{userEmail ?? "Signed in"}</span>
            <span className="rounded-md bg-surface px-1.5 py-px text-[11px] text-muted2">
              {ROLE_LABEL[role]}
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-hover)]"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] p-[22px]">
        <Toolbar
          view={view}
          cursor={cursor}
          onView={setView}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
          onToday={goToday}
        />

        <BrandLegend
          brands={brands}
          hiddenBrands={hiddenBrands}
          onToggle={toggleBrand}
          canWrite={canWrite}
          onAddBrand={() => setModal({ type: "brand" })}
        />

        <section className="mb-[26px] rounded-[14px] border border-hair bg-surface p-4">
          <MarkerLegend hidden={hiddenTypes} onToggle={toggleType} />
          {view === "month" && (
            <MonthView
              cursor={cursor}
              eventsByDay={eventsByDay}
              brandMap={brandMap}
              today={today}
              onSelect={selectCampaign}
            />
          )}
          {view === "week" && (
            <WeekView
              cursor={cursor}
              eventsByDay={eventsByDay}
              brandMap={brandMap}
              today={today}
              onSelect={selectCampaign}
            />
          )}
          {view === "day" && (
            <DayView
              cursor={cursor}
              eventsByDay={eventsByDay}
              brandMap={brandMap}
              onSelect={selectCampaign}
            />
          )}
        </section>

        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-[-0.01em]">
              Initiatives
            </h2>
            <span className="rounded-[20px] bg-seg px-[9px] py-px text-xs font-semibold text-muted2">
              {initiatives.length}
            </span>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModal({ type: "campaign" })}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-surface px-[13px] py-1.5 text-[13px] font-medium transition-colors hover:border-[#d5d1c7] hover:bg-[var(--color-hover)]"
              >
                <Plus size={14} /> Campaign
              </button>
              <button
                type="button"
                onClick={() => setModal({ type: "initiative" })}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-navy bg-navy px-[13px] py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-navy-dark"
              >
                <Plus size={14} /> Initiative
              </button>
            </div>
          )}
        </div>

        <GlobalSearch
          q={q}
          onQ={setQ}
          matched={matchedCampaigns}
          visibleInitiativeCount={visibleInitiatives.length}
          brandMap={brandMap}
          initiativeById={initiativeById}
          onPick={selectCampaign}
        />

        {canWrite && (
          <OrphanBar
            orphans={orphans}
            brandMap={brandMap}
            onAdopt={(campaignId) =>
              setModal({ type: "campaign", editId: campaignId })
            }
          />
        )}

        <InitiativeCards
          initiatives={visibleInitiatives}
          campaigns={campaigns}
          brandMap={brandMap}
          today={today}
          canSeeFinancials={canSeeFinancials}
          emptyLabel={ql ? `No initiatives match “${q.trim()}”.` : undefined}
          onSelect={(id) => setSelected({ kind: "initiative", id })}
        />
      </main>

      {selected && (
        <DetailDrawer
          selected={selected}
          brandMap={brandMap}
          initiatives={initiatives}
          campaigns={campaigns}
          lists={lists}
          today={today}
          canSeeFinancials={canSeeFinancials}
          jiraConfigured={jiraConfigured}
          sfParents={sfParents}
          focusDeliverableId={focusDeliverableId}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
          canWrite={canWrite}
          onEdit={editSelected}
          onDelete={deleteSelected}
        />
      )}

      {modal?.type === "brand" && (
        <BrandModal
          brands={brands}
          campaigns={campaigns}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "initiative" && (
        <InitiativeModal
          initiative={editInitiative}
          initiatives={initiatives}
          campaigns={campaigns}
          brands={brands}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "campaign" && (
        <CampaignModal
          campaign={editCampaign}
          presetInitiative={modal.presetInitiative}
          initiatives={initiatives}
          brands={brands}
          sfParents={sfParents}
          onClose={() => setModal(null)}
        />
      )}

      {importing && (
        <ImportModal
          initiatives={initiatives}
          campaigns={campaigns}
          onClose={() => setImporting(false)}
        />
      )}

      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}

/* --------------------------- marker legend/toggles ------------------------ */

const MARKERS: {
  type: CalendarMarkerType;
  label: string;
  group: "Campaign" | "Deliverables";
  swatch: React.CSSProperties;
}[] = [
  { type: "launch", label: "Launches", group: "Campaign", swatch: { background: "#1C3B66", opacity: 0.28 } },
  { type: "comp", label: "Comp-review due", group: "Campaign", swatch: { border: "1px dashed #8a8a93" } },
  { type: "deliv_comp", label: "Comp due", group: "Deliverables", swatch: { border: "1px dashed #c47614" } },
  { type: "deliv_code", label: "Code due", group: "Deliverables", swatch: { border: "1px dashed #3f6fb0" } },
  { type: "send", label: "Sends", group: "Deliverables", swatch: { background: "#1C3B66" } },
];

function MarkerLegend({
  hidden,
  onToggle,
}: {
  hidden: Set<CalendarMarkerType>;
  onToggle: (t: CalendarMarkerType) => void;
}) {
  const groups: ("Campaign" | "Deliverables")[] = ["Campaign", "Deliverables"];
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hair pb-3">
      {groups.map((g) => (
        <div key={g} className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
            {g}
          </span>
          {MARKERS.filter((m) => m.group === g).map((m) => {
            const on = !hidden.has(m.type);
            return (
              <button
                key={m.type}
                type="button"
                onClick={() => onToggle(m.type)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11.5px] font-medium transition-colors ${
                  on
                    ? "border-line bg-surface text-ink"
                    : "border-hair bg-transparent text-muted2 line-through opacity-60"
                }`}
              >
                <span
                  className="size-2.5 rounded-[3px]"
                  style={{ ...m.swatch, opacity: on ? m.swatch.opacity ?? 1 : 0.4 }}
                />
                {m.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
