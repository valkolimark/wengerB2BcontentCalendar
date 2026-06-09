"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { SfParent } from "@/lib/types";
import { sfParentChain } from "@/lib/sf";
import { createSfParent, deleteSfParent } from "@/lib/actions";
import { Field, inputClass } from "./Field";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Manage SF reporting parents inline (mirrors BrandModal): add a parent with an
 * optional "reports into" rollup, and delete existing ones. onCreated lets the
 * caller (CampaignModal) auto-select a freshly created parent.
 */
export function SfParentModal({
  sfParents,
  onClose,
  onCreated,
}: {
  sfParents: SfParent[];
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () => {
    if (!name.trim()) {
      setErr("Parent name is required.");
      return;
    }
    setErr(null);
    start(async () => {
      try {
        const id = await createSfParent({
          name,
          parent_id: parentId || null,
        });
        onCreated?.(id);
        setName("");
        setParentId("");
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
        await deleteSfParent(id);
        router.refresh();
      } catch (e) {
        setErr(errMsg(e));
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Salesforce reporting parents</DialogTitle>
        </DialogHeader>

        <Field label="Parent name">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Conv Music Ed 2026"
          />
        </Field>
        <Field label="Reports into (optional)">
          <select
            className={`${inputClass} cursor-pointer`}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">None (root)</option>
            {sfParents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="mb-2.5 mt-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">
          Existing
        </div>
        <div className="flex max-h-[200px] flex-col gap-1 overflow-y-auto">
          {sfParents.length === 0 && (
            <div className="px-1 py-2 text-[13px] text-faint">No parents yet.</div>
          )}
          {sfParents.map((p) => {
            const chain = sfParentChain(p.parent_id, sfParents);
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 py-[5px] text-[13.5px]"
              >
                <span className="flex-1">
                  {p.name}
                  {chain.length > 0 && (
                    <span className="ml-1.5 text-[11.5px] text-faint">
                      → {chain.map((c) => c.name).join(" → ")}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(p.id)}
                  title="Delete (dependents become roots / campaigns unlink)"
                  className="flex size-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-[var(--color-hover)] disabled:opacity-40"
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
            disabled={pending || !name.trim()}
            className="rounded-[9px] border border-navy bg-navy px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
          >
            Add parent
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
