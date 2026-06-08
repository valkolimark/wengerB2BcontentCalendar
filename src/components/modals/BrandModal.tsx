"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Brand, CampaignWithEvents } from "@/lib/types";
import { SWATCHES, tintOf, textOf } from "@/lib/brands";
import { createBrand, deleteBrand } from "@/lib/actions";
import { Field, inputClass } from "./Field";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function BrandModal({
  brands,
  campaigns,
  onClose,
}: {
  brands: Brand[];
  campaigns: CampaignWithEvents[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [dot, setDot] = useState(SWATCHES[0]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () => {
    setErr(null);
    start(async () => {
      try {
        await createBrand({ label, dot });
        setLabel("");
        router.refresh();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

  const remove = (id: string) => {
    setErr(null);
    start(async () => {
      try {
        await deleteBrand(id);
        router.refresh();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Brands</DialogTitle>
        </DialogHeader>

        <Field label="Brand name">
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Wenger Rental"
          />
        </Field>

        <Field label="Color">
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDot(s)}
                className="size-[26px] rounded-[7px] border-2"
                style={{
                  background: s,
                  borderColor: dot === s ? "var(--color-ink)" : "transparent",
                  boxShadow: dot === s ? "0 0 0 2px var(--color-surface) inset" : undefined,
                }}
              />
            ))}
            <input
              type="color"
              value={dot}
              onChange={(e) => setDot(e.target.value)}
              className="h-[30px] w-9 cursor-pointer rounded-[7px] border border-line bg-none p-0.5"
            />
          </div>
        </Field>

        <div className="mt-3 w-40">
          <span
            className="inline-flex items-center gap-1 rounded-[7px] px-1.5 py-[3px] text-[11px] font-medium"
            style={{
              background: tintOf(dot),
              color: textOf(dot),
              border: `0.5px solid ${dot}55`,
            }}
          >
            <Send size={11} />
            {label || "Preview"}
          </span>
        </div>

        <div className="mb-2.5 mt-[18px] text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
          Existing
        </div>
        <div className="flex max-h-[180px] flex-col gap-1 overflow-y-auto">
          {brands.map((b) => {
            const used = campaigns.some((c) => c.brand_id === b.id);
            return (
              <div key={b.id} className="flex items-center gap-2.5 py-[5px] text-[13.5px]">
                <span className="size-2.5 rounded-[3px]" style={{ background: b.dot }} />
                <span className="flex-1">{b.label}</span>
                <button
                  type="button"
                  disabled={used || pending}
                  onClick={() => remove(b.id)}
                  title={used ? "In use by campaigns" : "Delete"}
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-hover)] disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {err && <p className="mt-2 text-[12.5px] text-[#b91c1c]">{err}</p>}

        <DialogFooter>
          <button
            type="button"
            onClick={add}
            disabled={pending || !label.trim()}
            className="rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
          >
            Add brand
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
