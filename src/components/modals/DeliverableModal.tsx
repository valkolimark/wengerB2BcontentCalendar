"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  DeliverableKind,
  DeliverableTaskKind,
  DeliverableWithMeta,
  List,
} from "@/lib/types";
import { assembleDeliverableUtm } from "@/lib/utm";
import { TASK_LABEL, fmtReach } from "@/lib/deliverables";
import { createDeliverable, updateDeliverable } from "@/lib/actions";
import { Field, inputClass } from "./Field";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const KINDS: DeliverableKind[] = ["email", "blog", "social"];
const CHAIN: DeliverableTaskKind[] = ["comp", "code", "send"];

// timestamptz → the value a <input type="datetime-local"> expects (local, no tz).
const toLocalInput = (iso: string | null): string =>
  iso ? iso.slice(0, 16) : "";

export function DeliverableModal({
  deliverable,
  campaignId,
  campaignName,
  campaignSfCode,
  campaignOverride,
  lists,
  onClose,
}: {
  deliverable: DeliverableWithMeta | null;
  campaignId: string;
  campaignName: string;
  campaignSfCode?: string | null;
  campaignOverride?: string | null;
  lists: List[];
  onClose: () => void;
}) {
  const router = useRouter();
  const editing = !!deliverable;

  const [kind, setKind] = useState<DeliverableKind>(deliverable?.kind ?? "email");
  const [name, setName] = useState(deliverable?.name ?? "");
  const [sfCode, setSfCode] = useState(deliverable?.sf_code ?? "");
  const [sfId, setSfId] = useState(deliverable?.sf_id ?? "");
  const [sfName, setSfName] = useState(deliverable?.sf_name ?? "");
  const [content, setContent] = useState(deliverable?.utm_content ?? "");
  const [source, setSource] = useState(deliverable?.utm_source ?? "pardot");
  const [subject, setSubject] = useState(deliverable?.email_subject ?? "");
  const [segment, setSegment] = useState(deliverable?.segment ?? "");
  const [landing, setLanding] = useState(deliverable?.landing_page ?? "");
  const [deliverAt, setDeliverAt] = useState(
    toLocalInput(deliverable?.deliver_at ?? null)
  );
  const [setupDate, setSetupDate] = useState(deliverable?.setup_date ?? "");
  const [sendTime, setSendTime] = useState(deliverable?.send_time ?? "");
  const [status, setStatus] = useState(deliverable?.status ?? "");
  const [notes, setNotes] = useState(deliverable?.notes ?? "");

  // Chain: one editable {due, owner} per comp/code/send.
  const initialChain = useMemo(() => {
    const map: Record<string, { due: string; owner: string }> = {};
    for (const k of CHAIN) map[k] = { due: "", owner: "" };
    for (const t of deliverable?.tasks ?? [])
      map[t.kind] = { due: t.due ?? "", owner: t.owner ?? "" };
    return map;
  }, [deliverable]);
  const [chain, setChain] =
    useState<Record<string, { due: string; owner: string }>>(initialChain);

  const [listIds, setListIds] = useState<Set<string>>(
    new Set((deliverable?.lists ?? []).map((l) => l.id))
  );
  const [listOpen, setListOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const listsByRegion = useMemo(() => {
    const groups: Record<string, List[]> = {};
    for (const l of lists) (groups[l.region || "Other"] ??= []).push(l);
    return groups;
  }, [lists]);

  const combinedReach = useMemo(
    () =>
      lists.filter((l) => listIds.has(l.id)).reduce((s, l) => s + l.reach, 0),
    [lists, listIds]
  );

  const preview = assembleDeliverableUtm(
    { utm_source: source, kind, sf_code: sfCode, utm_content: content || "content" },
    { utm_campaign_override: campaignOverride, sf_code: campaignSfCode }
  );

  const toggleList = (id: string) =>
    setListIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setChainField = (
    k: DeliverableTaskKind,
    field: "due" | "owner",
    value: string
  ) => setChain((prev) => ({ ...prev, [k]: { ...prev[k], [field]: value } }));

  const save = () => {
    if (!name.trim()) {
      setErr("Deliverable name is required.");
      return;
    }
    setErr(null);
    const input = {
      campaign_id: campaignId,
      kind,
      name,
      sf_code: sfCode,
      sf_id: sfId,
      sf_name: sfName,
      utm_content: content,
      utm_source: source,
      email_subject: subject,
      segment,
      landing_page: landing,
      deliver_at: deliverAt ? deliverAt : null,
      setup_date: setupDate || null,
      send_time: sendTime,
      status,
      notes,
      sort: deliverable?.sort ?? 0,
      tasks: CHAIN.map((k) => ({
        kind: k,
        due: chain[k].due || null,
        owner: chain[k].owner,
      })),
      list_ids: [...listIds],
    };
    start(async () => {
      try {
        if (editing) await updateDeliverable(deliverable!.id, input);
        else await createDeliverable(input);
        router.refresh();
        onClose();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit deliverable" : "New deliverable"}
          </DialogTitle>
          <p className="text-[12.5px] text-muted2">
            Under <span className="font-medium text-ink-muted">{campaignName}</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="Kind">
            <select
              className={`${inputClass} cursor-pointer`}
              value={kind}
              onChange={(e) => setKind(e.target.value as DeliverableKind)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k[0].toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deliverable name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Elementary send · TK–5"
            />
          </Field>
        </div>

        {/* Salesforce member identity → utm_campaign. */}
        <div className="mb-2 mt-1.5 flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
          Salesforce member
        </div>
        <Field label="SF member code (→ utm_campaign)">
          <input
            className={`${inputClass} font-mono`}
            value={sfCode}
            onChange={(e) => setSfCode(e.target.value)}
            placeholder="P28-EML-EL"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SF Campaign ID">
            <input
              className={`${inputClass} font-mono`}
              value={sfId}
              onChange={(e) => setSfId(e.target.value)}
              placeholder="701..."
            />
          </Field>
          <Field label="SF Campaign Name">
            <input
              className={inputClass}
              value={sfName}
              onChange={(e) => setSfName(e.target.value)}
              placeholder="optional"
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
            />
          </Field>
        </div>

        {/* UTM: content + editable source; medium/campaign derive. */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="utm_content">
            <input
              className={`${inputClass} font-mono`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="wave7-elm"
            />
          </Field>
          <Field label="utm_source">
            <select
              className={`${inputClass} cursor-pointer`}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="pardot">pardot</option>
              <option value="salesforce">salesforce</option>
            </select>
          </Field>
        </div>

        {/* Email/coding metadata (role-view fields). */}
        <Field label="Email subject">
          <input
            className={inputClass}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Summer is the quiet window…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Segment">
            <input
              className={inputClass}
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="Elementary — TK–5 teachers"
            />
          </Field>
          <Field label="Landing page">
            <input
              className={`${inputClass} font-mono`}
              value={landing}
              onChange={(e) => setLanding(e.target.value)}
              placeholder="P28-WEB · 701..."
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deliver at">
            <input
              type="datetime-local"
              className={inputClass}
              value={deliverAt}
              onChange={(e) => setDeliverAt(e.target.value)}
            />
          </Field>
          <Field label="Send time (display)">
            <input
              className={inputClass}
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              placeholder="10:00 AM PT"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Setup / staging date">
            <input
              type="date"
              className={inputClass}
              value={setupDate}
              onChange={(e) => setSetupDate(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <input
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="Scheduled"
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            className={`${inputClass} min-h-[56px] resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dependencies, hand-off caveats…"
          />
        </Field>

        {/* comp → code → send hand-off chain. */}
        <div className="mb-2 mt-1.5 flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
          Hand-off chain
        </div>
        <div className="flex flex-col gap-2">
          {CHAIN.map((k) => (
            <div key={k} className="grid grid-cols-[92px_1fr_1fr] items-center gap-2">
              <span className="text-[12px] font-medium text-ink-muted">
                {TASK_LABEL[k]}
              </span>
              <input
                type="date"
                className={inputClass}
                value={chain[k].due}
                onChange={(e) => setChainField(k, "due", e.target.value)}
              />
              <input
                className={inputClass}
                value={chain[k].owner}
                onChange={(e) => setChainField(k, "owner", e.target.value)}
                placeholder="Owner"
              />
            </div>
          ))}
        </div>

        {/* Audience lists. */}
        <div className="mb-2 mt-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
            Audience lists
          </span>
          <span className="font-mono text-[11.5px] text-muted2">
            {listIds.size} selected · {fmtReach(combinedReach)} reach
          </span>
        </div>
        <button
          type="button"
          onClick={() => setListOpen((o) => !o)}
          className="w-full rounded-[9px] border border-line bg-surface px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--color-hover)]"
        >
          {listIds.size === 0
            ? "Pick audience lists…"
            : `${listIds.size} list${listIds.size === 1 ? "" : "s"} · ${fmtReach(
                combinedReach
              )} combined`}{" "}
          <span className="text-faint">{listOpen ? "▴" : "▾"}</span>
        </button>
        {listOpen && (
          <div className="mt-1.5 max-h-[210px] overflow-y-auto rounded-[9px] border border-hair bg-surface p-1.5">
            {Object.entries(listsByRegion).map(([region, rows]) => (
              <div key={region}>
                <div className="px-1.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-faint">
                  {region}
                </div>
                {rows.map((l) => (
                  <label
                    key={l.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-[5px] text-[12.5px] hover:bg-[var(--color-hover)]"
                  >
                    <input
                      type="checkbox"
                      checked={listIds.has(l.id)}
                      onChange={() => toggleList(l.id)}
                    />
                    <span className="flex-1">{l.name}</span>
                    <span className="font-mono text-[11px] text-muted2">
                      {fmtReach(l.reach)}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Live UTM preview. */}
        <div className="mb-2 mt-3 flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
          UTM preview
          <span className="ml-1.5 rounded-md bg-[#e7f1e6] px-[7px] py-px text-[11px] font-medium normal-case tracking-normal text-[#2e6b3e]">
            live
          </span>
        </div>
        <div className="rounded-[10px] border border-hair bg-[var(--color-surface-2)] px-3 py-2.5">
          <code className="break-all text-[11.5px] leading-relaxed text-[var(--color-ink-muted)]">
            {preview}
          </code>
        </div>

        {err && <p className="mt-2 text-[12.5px] text-[#b91c1c]">{err}</p>}

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-[11.5px] text-faint">
            utm_medium derives from kind · utm_campaign = SF member code
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
