import { useState } from "react";

/** Initialise une plage de dates par défaut sur "aujourd'hui". */
export function useDefaultDateRange() {
  const todayStr = new Date().toISOString().slice(0, 10);
  return useState({ from: todayStr, to: todayStr, preset: "today" });
}
