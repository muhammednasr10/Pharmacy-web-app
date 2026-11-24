import { useEffect } from "react";
import {
  consumePendingUiSpotlight,
  runUiSpotlight,
  subscribeUiSpotlight,
  type UiSpotlightStep,
} from "../utils/uiSpotlight";

/** Runs a queued spotlight tour when the host screen mounts or a new request arrives. */
export function useUiSpotlightOnMount(isArabic: boolean, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function play(steps: UiSpotlightStep[]) {
      if (cancelled || steps.length === 0) return;
      await runUiSpotlight(steps, isArabic);
    }

    const pending = consumePendingUiSpotlight();
    if (pending) {
      void play(pending);
    }

    const unsubscribe = subscribeUiSpotlight((steps) => {
      // Event path means the tour is starting now — drop the queued copy.
      consumePendingUiSpotlight();
      void play(steps);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled, isArabic]);
}
