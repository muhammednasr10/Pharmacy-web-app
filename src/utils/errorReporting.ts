import {
  captureSentryException,
  initSentryMonitoring,
  isSentryMonitoringActive,
} from "./sentryMonitoring";

const MAX_STORED_ERRORS = 20;
const STORAGE_KEY = "pharmacy_app_recent_errors";

export type ReportedError = {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  at: string;
};

function serializeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || error.name, stack: error.stack };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

function persistError(entry: ReportedError) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as ReportedError[]) : [];
    const next = [entry, ...existing].slice(0, MAX_STORED_ERRORS);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  const { message, stack } = serializeError(error);
  const entry: ReportedError = {
    message,
    stack,
    context,
    at: new Date().toISOString(),
  };

  persistError(entry);
  captureSentryException(error, context);

  if (import.meta.env.DEV) {
    console.error("[pharmacy-error]", entry);
    return;
  }

  if (!isSentryMonitoringActive()) {
    console.error("[pharmacy-error]", message, context || "");
  }
}

export function getRecentReportedErrors(): ReportedError[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReportedError[]) : [];
  } catch {
    return [];
  }
}

function listenForSentryPersistedErrors() {
  if (typeof window === "undefined") return;
  window.addEventListener("pharmacy:error-reported", (event) => {
    const detail = (event as CustomEvent<{ message: string; at: string; source?: string }>).detail;
    if (!detail?.message) return;
    persistError({
      message: detail.message,
      at: detail.at,
      context: detail.source ? { source: detail.source } : undefined,
    });
  });
}

function listenForWindowErrors() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, {
      source: "window.error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { source: "unhandledrejection" });
  });
}

export function initErrorReporting() {
  const sentryActive = initSentryMonitoring();
  listenForSentryPersistedErrors();

  if (!sentryActive) {
    listenForWindowErrors();
  }
}

export { isSentryMonitoringActive };
