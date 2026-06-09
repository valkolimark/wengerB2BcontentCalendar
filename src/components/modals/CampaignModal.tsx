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
  Brand,
  CampaignWithEvents,
  Initiative,
  SfParent,
} from "@/lib/types";
import {
  CHANNELS,
  assembleUtm,
  deriveMedium,
  hasSalesforce,
  resolveSource,
} from "@/lib/utm";
import { sfParentChain } from "@/lib/sf";
import { addDays, key, parseISO } from "@/lib/dates";
import { createCampaign, updateCampaign } from "@/lib/actions";
import { Field, inputClass } from "./Field";
import { InitiativePicker } from "./InitiativePicker";
import { SfParentModal } from "./SfParentModal";
import { Plus } from "lucide-react";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function CampaignModal({
  campaign,
  presetInitiative,
  initiatives,
  brands,
  sfParents,
  onClose,
}: {
  campaign: CampaignWithEvents | null;
  presetInitiative?: string;
  initiatives: Initiative[];
  brands: Brand[];
  sfParents: SfParent[];
  onClose: () => void;
}) {
  const router = useRouter();
  const editing = !!campaign;

  const [initiativeId, setInitiativeId] = useState(
    campaign?.initiative_id ?? presetInitiative ?? initiatives[0]?.id ?? ""
  );
  const [brand, setBrand] = useState(campaign?.brand_id ?? brands[0]?.id ?? "");
  const [name, setName] = useState(campaign?.name ?? "");
  const [channel, setChannel] = useState(campaign?.channel ?? "Email");
  const [vendor, setVendor] = useState(campaign?.vendor ?? "N/A (Owned)");
  const [segment, setSegment] = useState(campaign?.segment ?? "");
  const [owner, setOwner] = useState(campaign?.owner ?? "");
  const [sf, setSf] = useState(campaign?.sf_code ?? "");
  const [sfId, setSfId] = useState(campaign?.sf_id ?? "");
  const [sfName, setSfName] = useState(campaign?.sf_name ?? "");
  const [sfParentId, setSfParentId] = useState(campaign?.sf_parent_id ?? "");
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [content, setContent] = useState(campaign?.utm_content ?? "");
  const [launch, setLaunch] = useState("");
  const [autoComp, setAutoComp] = useState(true);
  const [comp, setComp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const sfInfo = { sf_code: sf, sf_id: sfId, sf_name: sfName };
  const onSalesforce = hasSalesforce(sfInfo);
  const source = resolveSource({ vendor, channel, ...sfInfo });
  const medium = deriveMedium(channel);
  const compAuto = useMemo(
    () => (launch ? key(addDays(parseISO(launch), -10)) : ""),
    [launch]
  );
  const compVal = autoComp ? compAuto : comp;
  const preview = assembleUtm({
    source,
    medium,
    campaign: sf || "SF-CODE",
    content: content || "content",
  });

  const sfHint =
    (brands.find((b) => b.id === brand)?.label ?? "SF")
      .slice(0, 3)
      .toUpperCase() + "-2026-…";

  const save = () => {
    if (!name.trim() || !initiativeId || !brand) {
      setErr("Name, initiative, and brand are required.");
      return;
    }
    setErr(null);
    const input = {
      initiative_id: initiativeId,
      brand_id: brand,
      name,
      channel,
      vendor,
      segment,
      owner,
      sf_code: sf,
      sf_id: sfId,
      sf_name: sfName,
      sf_parent_id: sfParentId || null,
      utm_content: content,
    };
    start(async () => {
      try {
        if (editing) {
          await updateCampaign(campaign!.id, input);
        } else {
          await createCampaign({
            ...input,
            launch: launch || undefined,
            comp: compVal || undefined,
          });
        }
        router.refresh();
        onClose();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit campaign" : "New campaign"}</DialogTitle>
        </DialogHeader>

        <Field label="Initiative">
          <InitiativePicker
            initiatives={initiatives}
            value={initiativeId}
            onChange={setInitiativeId}
          />
        </Field>

        <Field label="Brand">
          <select
            className={`${inputClass} cursor-pointer`}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Campaign name">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PUPN — Wenger feature"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Channel">
            <select
              className={`${inputClass} cursor-pointer`}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Vendor">
            <input
              className={inputClass}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="NAfME, LinkedIn, N/A (Owned)…"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Segment">
            <input
              className={inputClass}
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="semicolon for multi"
            />
          </Field>
          <Field label="Owner">
            <input
              className={inputClass}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </Field>
        </div>

        {/* Salesforce identity. Any field present forces utm_source=salesforce. */}
        <div className="mb-2 mt-1.5 flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
          Salesforce
          {onSalesforce && (
            <span className="ml-1.5 rounded-md bg-[#e7f1e6] px-[7px] py-px text-[11px] font-medium normal-case tracking-normal text-[#2e6b3e]">
              source = salesforce
            </span>
          )}
        </div>
        <Field label="SF campaign code">
          <input
            className={`${inputClass} font-mono`}
            value={sf}
            onChange={(e) => setSf(e.target.value)}
            placeholder={sfHint}
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
              placeholder="FY26 Prop 28 — Spring"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
            />
          </Field>
        </div>
        <Field
          label={
            <span className="flex items-center justify-between">
              SF Parent (rolls up into)
              <button
                type="button"
                onClick={() => setParentModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-px text-[11px] text-ink-muted transition-colors hover:bg-[var(--color-hover)]"
              >
                <Plus size={11} /> New parent
              </button>
            </span>
          }
        >
          <select
            className={`${inputClass} cursor-pointer`}
            value={sfParentId}
            onChange={(e) => setSfParentId(e.target.value)}
          >
            <option value="">None</option>
            {sfParents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        {sfParentId &&
          (() => {
            const chain = sfParentChain(sfParentId, sfParents);
            return chain.length > 0 ? (
              <div className="mb-3.5 -mt-1.5 text-[11.5px] text-faint">
                Reporting chain: {chain.map((c) => c.name).join(" → ")}
              </div>
            ) : null;
          })()}

        <Field label="utm_content">
          <input
            className={`${inputClass} font-mono`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="wave1-urgency"
          />
        </Field>

        {!editing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Launch date">
              <input
                type="date"
                className={inputClass}
                value={launch}
                onChange={(e) => setLaunch(e.target.value)}
              />
            </Field>
            <Field
              label={
                <span className="flex items-center gap-2">
                  Comp due
                  <button
                    type="button"
                    onClick={() => setAutoComp((a) => !a)}
                    className="rounded-md border border-line bg-[var(--color-hover)] px-2 py-px text-[11px] text-ink-muted"
                  >
                    {autoComp ? "auto −10d" : "manual"}
                  </button>
                </span>
              }
            >
              {autoComp ? (
                <input
                  className={inputClass}
                  value={compAuto}
                  readOnly
                  placeholder="set launch first"
                />
              ) : (
                <input
                  type="date"
                  className={inputClass}
                  value={comp}
                  onChange={(e) => setComp(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}

        <div className="mb-2 mt-1.5 flex items-center text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
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
            {editing
              ? "Sends stay as-is — events aren't changed here"
              : "Brand lives on the campaign"}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={pending || !name.trim() || !initiativeId || !brand}
            className="rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
          >
            {editing ? "Save" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>

      {parentModalOpen && (
        <SfParentModal
          sfParents={sfParents}
          onClose={() => setParentModalOpen(false)}
          onCreated={(id) => setSfParentId(id)}
        />
      )}
    </Dialog>
  );
}
