// Salesforce reporting-parent helpers. The app records which parent a campaign
// reports into; Salesforce does the rollup. These walk the self-referential
// sf_parents chain and guard against cycles.
import type { SfParent } from "./types";

/**
 * The reporting chain starting at `parentId`, leaf → root. e.g. for a campaign
 * whose parent is "Conv Music Ed 2026" this returns
 * [Conv Music Ed 2026, CONV ALL Campaigns 2026]. Returns [] if parentId is null
 * or unknown. Bounded to avoid looping on malformed data.
 */
export function sfParentChain(
  parentId: string | null | undefined,
  parents: SfParent[]
): SfParent[] {
  const byId = new Map(parents.map((p) => [p.id, p]));
  const chain: SfParent[] = [];
  const seen = new Set<string>();
  let current = parentId ? byId.get(parentId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return chain;
}

/**
 * Whether setting node `id`'s parent to `parentId` would create a cycle —
 * either a direct self-reference, or because `id` already appears upstream of
 * `parentId`. Used to guard sf_parent create/update.
 */
export function wouldCycle(
  id: string,
  parentId: string | null | undefined,
  parents: SfParent[]
): boolean {
  if (!parentId) return false;
  if (parentId === id) return true;
  const byId = new Map(parents.map((p) => [p.id, p]));
  const seen = new Set<string>();
  let current = byId.get(parentId);
  while (current && !seen.has(current.id)) {
    if (current.id === id) return true;
    seen.add(current.id);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return false;
}
