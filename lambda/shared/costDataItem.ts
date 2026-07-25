import { DYNAMO_KEYS } from "./constants";
import type { CostDataItem } from "./types";

/**
 * Cost records written before the `Id` attribute existed are keyed as
 * `COST#{timestamp}` with no `Id` on the item. Every consumer (dashboard
 * summaries, update, delete) identifies a record by `Id` and rebuilds the sort
 * key as `COST#{Id}`, so recovering the id from the sort key keeps those legacy
 * records addressable and keeps response validation from failing on them.
 */
export function normalizeCostDataItem(item: CostDataItem): CostDataItem {
  if (typeof item.Id === "string" && item.Id.length > 0) {
    return item;
  }

  return {
    ...item,
    Id: item.SK.startsWith(DYNAMO_KEYS.COST_PREFIX)
      ? item.SK.slice(DYNAMO_KEYS.COST_PREFIX.length)
      : item.SK,
  };
}
