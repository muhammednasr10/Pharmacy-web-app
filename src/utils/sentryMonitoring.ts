import * as Sentry from "@sentry/react";
import type { AppUser } from "../types";

let sentryReady = false;

function readSentryDsn(): string {
  return String(import.meta.env.VITE_SENTRY_DSN || "").trim();
}

function isSentryDevEnabled(): boolean {
  return String(import.meta.env.VITE_SENTRY_DEV || "").trim().toLowerCase() === "true";
}

export function isSentryMonitoringActive(): boolean {
  return sentryReady;
}

export function initSentryMonitoring(): boolean {
  const dsn = readSentryDsn();
  if (!dsn) return false;

  const enabled = import.meta.env.PROD || isSentryDevEnabled();
  if (!enabled) return false;

  Sentry.init({
    dsn,
    environment: String(import.meta.env.VITE_DEPLOY_ENV || import.meta.env.MODE || "production"),
    release: `pharmacy-web-app@${import.meta.env.VITE_APP_VERSION || "1.0.0"}`,
    enabled: true,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.05,
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value || event.message || "Unknown error";
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("pharmacy:error-reported", {
            detail: {
              message,
              at: new Date().toISOString(),
              source: "sentry",
            },
          }),
        );
      }
      return event;
    },
  });

  sentryReady = true;
  return true;
}

export function syncSentryUser(appUser: AppUser | null) {
  if (!sentryReady) return;

  if (!appUser) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: appUser.uid,
    email: appUser.email || undefined,
    username: appUser.username || appUser.name,
  });

  Sentry.setContext("pharmacy", {
    pharmacyId: appUser.pharmacyId,
    role: appUser.role,
    employeeId: appUser.employeeId || null,
  });
}

export function captureSentryException(error: unknown, context?: Record<string, unknown>) {
  if (!sentryReady) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("app", context);
    }
    if (error instanceof Error) {
      Sentry.captureException(error);
      return;
    }
    Sentry.captureMessage(typeof error === "string" ? error : JSON.stringify(error), "error");
  });
}

export function addSentryBreadcrumb(message: string, data?: Record<string, unknown>) {
  if (!sentryReady) return;
  Sentry.addBreadcrumb({
    category: "app",
    message,
    data,
    level: "info",
  });
}
