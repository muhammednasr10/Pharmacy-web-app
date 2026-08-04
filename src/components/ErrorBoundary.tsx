import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "../utils/errorReporting";

type ErrorBoundaryProps = {
  children: ReactNode;
  isArabic?: boolean;
};

type ErrorBoundaryState = {
  error: Error | null;
  componentStack: string;
};

function isDomReconciliationNoise(message: string) {
  return /removeChild|insertBefore|not a child of this node/i.test(message);
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: "" };

  private rootError: Error | null = null;

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const domNoise = isDomReconciliationNoise(error.message);

    if (domNoise && this.rootError) {
      this.setState({ error: this.rootError, componentStack: this.state.componentStack });
      reportError(error, {
        source: "react.error-boundary.dom-noise",
        componentStack: info.componentStack,
        rootError: this.rootError.message,
      });
      return;
    }

    if (domNoise) {
      reportError(error, {
        source: "react.error-boundary.dom-noise",
        componentStack: info.componentStack,
      });
      this.setState({ error: null, componentStack: "" });
      return;
    }

    this.rootError = error;
    this.setState({
      error,
      componentStack: info.componentStack || "",
    });

    reportError(error, {
      source: "react.error-boundary",
      componentStack: info.componentStack,
    });
  }

  private handleRetry = () => {
    this.rootError = null;
    this.setState({ error: null, componentStack: "" });
  };

  render() {
    const { error, componentStack } = this.state;
    const { children, isArabic = true } = this.props;

    if (!error) return children;

    return (
      <div className="card errorBoundaryCard" dir={isArabic ? "rtl" : "ltr"}>
        <h2>{isArabic ? "حدث خطأ في عرض الصفحة" : "Something went wrong"}</h2>
        <p className="returnsSectionHint">
          {isArabic
            ? "جرّب «إعادة المحاولة» أو حدّث الصفحة. إذا استمر الخطأ، أرسل رسالة الخطأ للدعم."
            : "Try again or reload the page. If the issue persists, share the error with support."}
        </p>
        <pre className="errorBoundaryMessage">{error.message}</pre>
        {import.meta.env.DEV && componentStack ? (
          <pre className="errorBoundaryMessage errorBoundaryStack">{componentStack.trim()}</pre>
        ) : null}
        <div className="modalActions">
          <button type="button" className="editBtn" onClick={this.handleRetry}>
            {isArabic ? "إعادة المحاولة" : "Try again"}
          </button>
          <button
            type="button"
            className="printFullBtn"
            onClick={() => {
              this.rootError = null;
              this.setState({ error: null, componentStack: "" });
              window.location.reload();
            }}
          >
            {isArabic ? "تحديث الصفحة" : "Reload page"}
          </button>
        </div>
      </div>
    );
  }
}
