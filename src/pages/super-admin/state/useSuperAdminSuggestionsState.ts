import { useCallback, useEffect, useState } from "react";
import * as pharmacyService from "../../../services/pharmacyService";
import type { MedicineCatalogSuggestion } from "../../../services/pharmacy/medicineCatalogSuggestionService";
import type { SaasTab } from "../types";

type Params = {
  isArabic: boolean;
  activeTab: SaasTab;
  operatorUid?: string;
  operatorName?: string;
};

export function useSuperAdminSuggestionsState({
  isArabic,
  activeTab,
  operatorUid,
  operatorName,
}: Params) {
  const [suggestions, setSuggestions] = useState<MedicineCatalogSuggestion[]>([]);
  const [pendingSuggestionsCount, setPendingSuggestionsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");

  const refreshSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, count] = await Promise.all([
        pharmacyService.listPendingMedicineCatalogSuggestions(),
        pharmacyService.countPendingMedicineCatalogSuggestions(),
      ]);
      setSuggestions(rows);
      setPendingSuggestionsCount(count);
    } catch (error) {
      console.error("refreshSuggestions error:", error);
      setSuggestions([]);
      setPendingSuggestionsCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSuggestions();
  }, [refreshSuggestions]);

  useEffect(() => {
    if (activeTab !== "suggestions") return;
    void refreshSuggestions();
  }, [activeTab, refreshSuggestions]);

  async function handleApproveSuggestion(suggestionId: string) {
    setBusyId(suggestionId);
    try {
      await pharmacyService.approveMedicineCatalogSuggestion({
        suggestionId,
        reviewerId: operatorUid,
        reviewerName: operatorName,
      });
      await refreshSuggestions();
      alert(isArabic ? "تم اعتماد الاقتراح وتحديث قاعدة الأدوية" : "Suggestion approved and catalog updated");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر اعتماد الاقتراح"
            : "Could not approve suggestion",
      );
    } finally {
      setBusyId("");
    }
  }

  async function handleRejectSuggestion(suggestionId: string) {
    const note = window.prompt(
      isArabic ? "سبب الرفض (اختياري):" : "Rejection note (optional):",
      "",
    );
    if (note === null) return;
    setBusyId(suggestionId);
    try {
      await pharmacyService.rejectMedicineCatalogSuggestion({
        suggestionId,
        reviewerId: operatorUid,
        reviewerName: operatorName,
        reviewNote: note.trim() || undefined,
      });
      await refreshSuggestions();
      alert(isArabic ? "تم رفض الاقتراح" : "Suggestion rejected");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر رفض الاقتراح"
            : "Could not reject suggestion",
      );
    } finally {
      setBusyId("");
    }
  }

  return {
    suggestions,
    pendingSuggestionsCount,
    suggestionsLoading: loading,
    suggestionBusyId: busyId,
    refreshSuggestions,
    handleApproveSuggestion,
    handleRejectSuggestion,
  };
}
