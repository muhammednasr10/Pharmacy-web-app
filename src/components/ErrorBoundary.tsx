import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "../utils/errorReporting";

type ErrorBoundaryProps = {
  children: ReactNode;
  isArabic?: boolean;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, {
      source: "react.error-boundary",
      componentStack: info.componentStack,
    });
  }

  render() {
    const { error } = this.state;
    const { children, isArabic = true } = this.props;

    if (!error) return children;

    return (
      <div className="card errorBoundaryCard" dir={isArabic ? "rtl" : "ltr"}>
        <h2>{isArabic ? "حدث خطأ في عرض الصفحة" : "Something went wrong"}</h2>
        <p className="returnsSectionHint">
          {isArabic
            ? "حدّث الصفحة أو ارجع للوحة التحكم. إذا استمر الخطأ، أرسل رسالة الخطأ للدعم."
            : "Refresh the page or return to the dashboard. If the issue persists, share the error with support."}
        </p>
        <pre className="errorBoundaryMessage">{error.message}</pre>
        <button
          type="button"
          className="printFullBtn"
          onClick={() => {
            this.setState({ error: null });
            window.location.reload();
          }}
        >
          {isArabic ? "تحديث الصفحة" : "Reload page"}
        </button>
      </div>
    );
  }
}
