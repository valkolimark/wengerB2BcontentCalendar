"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Plus, LogOut, Users } from "lucide-react";
import type {
  Brand,
  CalendarEvent,
  CampaignWithEvents,
  Initiative,
  Role,
  Selected,
} from "@/lib/types";
import { parseISO } from "@/lib/dates";
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
  todayKey,
  role,
  canSeeFinancials,
  userEmail,
}: {
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  todayKey: string;
  role: Role;
  canSeeFinancials: boolean;
  userEmail: string | null;
}) {
  // External users are read-only; admin/member can write content.
  const canWrite = role !== "external";
  const router = useRouter();
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState<Date>(DEFAULT_CURSOR);
  const [hiddenBrands, setHiddenBrands] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Selected>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [importing, setImporting] = useState(false);
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

  // Flatten campaigns → events into the calendar's render shape (Cycle 2 behavior).
  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      campaigns.flatMap((c) =>
        c.events.map((e) => ({
          id: e.id,
          date: e.date,
          type: e.type,
          label: e.label,
          brandId: c.brand_id,
          campaignId: c.id,
          campaignName: c.name,
        }))
      ),
    [campaigns]
  );

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of calendarEvents) {
      if (hiddenBrands.has(ev.brandId)) continue;
      (map[ev.date] ??= []).push(ev);
    }
    return map;
  }, [calendarEvents, hiddenBrands]);

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

  const selectCampaign = (campaignId: string) =>
    setSelected({ kind: "campaign", id: campaignId });

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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hair bg-white px-[22px] py-[13px]">
        <div className="flex items-center gap-[11px]">
          <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-base font-bold text-white">
            W
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.01em]">
              Content Tracker
            </div>
            <div className="text-[11px] text-muted2">Wenger B2B · 2026</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DataMenu
            brands={brands}
            initiatives={initiatives}
            campaigns={campaigns}
            canSeeFinancials={canSeeFinancials}
            isAdmin={role === "admin"}
            onImport={() => setImporting(true)}
          />
          {role === "admin" && (
            <Link
              href="/team"
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-white px-2.5 py-[6px] text-[13px] font-medium transition-colors hover:bg-[#f2f0ea]"
            >
              <Users size={14} /> Team
            </Link>
          )}
          <div
            className="flex items-center gap-[7px] rounded-[9px] border border-hair bg-[#f4f2ec] px-2.5 py-[5px] text-[13px] font-medium text-muted"
            title={userEmail ?? undefined}
          >
            <ShieldCheck size={15} />
            <span className="max-w-[180px] truncate">{userEmail ?? "Signed in"}</span>
            <span className="rounded-md bg-white px-1.5 py-px text-[11px] text-muted2">
              {ROLE_LABEL[role]}
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex size-8 items-center justify-center rounded-lg border border-line bg-white text-[#4a4a45] transition-colors hover:bg-[#f2f0ea]"
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

        <section className="mb-[26px] rounded-[14px] border border-hair bg-white p-4">
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
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-line bg-white px-[13px] py-1.5 text-[13px] font-medium transition-colors hover:border-[#d5d1c7] hover:bg-[#f2f0ea]"
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
          today={today}
          canSeeFinancials={canSeeFinancials}
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
    </div>
  );
}
