export type UiSpotlightStep = {
  selector: string;
  labelAr?: string;
  labelEn?: string;
  durationMs?: number;
};

const STORAGE_KEY = "pharmacy_ui_spotlight_queue";
const EVENT_NAME = "pharmacy:ui-spotlight";

type SpotlightRuntime = {
  overlay: HTMLDivElement;
  card: HTMLDivElement;
  style: HTMLStyleElement;
  cleanupFns: Array<() => void>;
};

let activeRuntime: SpotlightRuntime | null = null;

export function requestUiSpotlight(steps: UiSpotlightStep[]) {
  if (typeof window === "undefined" || steps.length === 0) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(steps));
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: steps }));
}

export function consumePendingUiSpotlight(): UiSpotlightStep[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as UiSpotlightStep[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function subscribeUiSpotlight(handler: (steps: UiSpotlightStep[]) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onEvent = (event: Event) => {
    const detail = (event as CustomEvent<UiSpotlightStep[]>).detail;
    if (Array.isArray(detail) && detail.length > 0) handler(detail);
  };
  window.addEventListener(EVENT_NAME, onEvent);
  return () => window.removeEventListener(EVENT_NAME, onEvent);
}

function clearActiveSpotlight() {
  if (!activeRuntime) return;
  activeRuntime.cleanupFns.forEach((fn) => fn());
  activeRuntime.overlay.remove();
  activeRuntime.card.remove();
  activeRuntime.style.remove();
  activeRuntime = null;
}

function waitForElement(selector: string, timeoutMs = 8000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing instanceof HTMLElement && existing.getClientRects().length > 0) {
      resolve(existing);
      return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
      const node = document.querySelector(selector);
      if (node instanceof HTMLElement && node.getClientRects().length > 0) {
        window.clearInterval(timer);
        resolve(node);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, 80);
  });
}

function placeCard(card: HTMLDivElement, target: HTMLElement, isArabic: boolean) {
  const rect = target.getBoundingClientRect();
  const cardWidth = Math.min(280, window.innerWidth - 24);
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - cardWidth / 2),
    window.innerWidth - cardWidth - 12,
  );
  const below = rect.bottom + 12;
  const above = rect.top - 12;
  const preferBelow = below + 88 < window.innerHeight;
  card.style.width = `${cardWidth}px`;
  card.style.left = `${left}px`;
  if (preferBelow) {
    card.style.top = `${below}px`;
    card.style.transform = "none";
  } else {
    card.style.top = `${above}px`;
    card.style.transform = "translateY(-100%)";
  }
  card.dir = isArabic ? "rtl" : "ltr";
}

async function highlightStep(step: UiSpotlightStep, isArabic: boolean, index: number, total: number) {
  const target = await waitForElement(step.selector);
  if (!target) return;

  clearActiveSpotlight();

  target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

  const style = document.createElement("style");
  style.textContent = `
    .uiSpotlightOverlay {
      position: fixed; inset: 0; z-index: 12000;
      background: rgba(8, 18, 28, 0.55);
      pointer-events: auto;
    }
    .uiSpotlightTarget {
      position: relative !important;
      z-index: 12001 !important;
      box-shadow: 0 0 0 3px #1fa97a, 0 0 0 10px rgba(31, 169, 122, 0.28) !important;
      border-radius: 10px;
      animation: uiSpotlightPulse 1.1s ease-in-out infinite;
    }
    .uiSpotlightCard {
      position: fixed; z-index: 12002;
      background: #102433; color: #edf7f2;
      border: 1px solid rgba(31, 169, 122, 0.55);
      border-radius: 12px; padding: 0.75rem 0.9rem;
      box-shadow: 0 14px 34px rgba(0,0,0,0.35);
      font-size: 0.92rem; line-height: 1.45;
    }
    .uiSpotlightCard strong { display:block; margin-bottom: 0.2rem; color: #8ef0c4; }
    .uiSpotlightCard span { opacity: 0.85; font-size: 0.82rem; }
    @keyframes uiSpotlightPulse {
      0%, 100% { box-shadow: 0 0 0 3px #1fa97a, 0 0 0 8px rgba(31, 169, 122, 0.22); }
      50% { box-shadow: 0 0 0 3px #1fa97a, 0 0 0 14px rgba(31, 169, 122, 0.38); }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "uiSpotlightOverlay";
  overlay.setAttribute("aria-hidden", "true");

  const card = document.createElement("div");
  card.className = "uiSpotlightCard";
  const label = isArabic ? step.labelAr || "" : step.labelEn || step.labelAr || "";
  card.innerHTML = `<strong>${label}</strong><span>${
    isArabic ? `خطوة ${index + 1} من ${total} — اضغط للمتابعة` : `Step ${index + 1} of ${total} — click to continue`
  }</span>`;

  document.body.appendChild(overlay);
  document.body.appendChild(card);
  target.classList.add("uiSpotlightTarget");
  placeCard(card, target, isArabic);

  const onReposition = () => placeCard(card, target, isArabic);
  window.addEventListener("resize", onReposition);
  window.addEventListener("scroll", onReposition, true);

  activeRuntime = {
    overlay,
    card,
    style,
    cleanupFns: [
      () => target.classList.remove("uiSpotlightTarget"),
      () => window.removeEventListener("resize", onReposition),
      () => window.removeEventListener("scroll", onReposition, true),
    ],
  };

  const duration = step.durationMs ?? 2800;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      overlay.removeEventListener("click", finish);
      card.removeEventListener("click", finish);
      resolve();
    };
    const timer = window.setTimeout(finish, duration);
    overlay.addEventListener("click", finish);
    card.addEventListener("click", finish);
  });

  clearActiveSpotlight();
}

export async function runUiSpotlight(steps: UiSpotlightStep[], isArabic = true) {
  if (typeof window === "undefined" || steps.length === 0) return;
  clearActiveSpotlight();
  for (let index = 0; index < steps.length; index += 1) {
    await highlightStep(steps[index], isArabic, index, steps.length);
  }
}
