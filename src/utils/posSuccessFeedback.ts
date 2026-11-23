import { playBarcodeBeep } from "./barcodeBeep";

/** Stronger success cue for completed sales / returns. */
export function playPosSuccessFanfare() {
  playBarcodeBeep(true);
  window.setTimeout(() => playBarcodeBeep(true), 120);
}

export function flashPosSuccess(selector = ".posOnlyPage, .posQuickSaleCard") {
  const root = document.querySelector(selector);
  if (!root) return;
  root.classList.add("posSuccessFlash");
  window.setTimeout(() => root.classList.remove("posSuccessFlash"), 700);
}
