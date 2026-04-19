import type { PrimaryClass } from "@/types/app";

const ORDER: PrimaryClass[] = [
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
  "P7",
];

export function primaryClassToYear(c: PrimaryClass): number {
  return ORDER.indexOf(c) + 1;
}

/** Prefer the pupil's year, then widen one step at a time (e.g. P4 → 4,3,5,2,6,…). */
export function targetYearPriority(centerYear: number): number[] {
  const order: number[] = [centerYear];
  for (let d = 1; d <= 6; d++) {
    if (centerYear - d >= 1) order.push(centerYear - d);
    if (centerYear + d <= 7) order.push(centerYear + d);
  }
  return order;
}

export const PRIMARY_CLASSES: PrimaryClass[] = ORDER;
