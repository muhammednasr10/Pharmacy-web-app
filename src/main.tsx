import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { supabaseConfigError } from "./services/supabaseClient";
import { initDisplayPreferences } from "./utils/displayPreferences";
import "./styles.css";
import "./theme.css";

initDisplayPreferences();

if (typeof window !== "undefined" && !supabaseConfigError) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // لا نُعيد تحميل الصفحة تلقائياً — التحديث يُطبَّق عند زيارة لاحقة أو تحديث يدوي
    },
  });
}

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Segoe UI, Tahoma, sans-serif",
        direction: "rtl",
        background: "#f4f7f5",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#fff",
          border: "1px solid #d1d5db",
          borderRadius: 12,
          padding: 28,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>تعذّر تشغيل التطبيق</h1>
        <p style={{ margin: "0 0 16px", lineHeight: 1.7 }}>{message}</p>
        <ol style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.8, fontSize: 14 }}>
          <li>Vercel → pharmacy-web-app → Settings → Environment Variables</li>
          <li>احذف أي قيمة placeholder (aBcDe) وأضف القيم من Supabase → Settings → API</li>
          <li>Deployments → Redeploy</li>
        </ol>
      </div>
    </div>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root not found");
}

if (supabaseConfigError) {
  ReactDOM.createRoot(root).render(<ConfigErrorScreen message={supabaseConfigError} />);
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
