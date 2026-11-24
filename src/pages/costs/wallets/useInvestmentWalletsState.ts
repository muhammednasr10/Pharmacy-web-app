import { useCallback, useEffect, useState } from "react";
import type { PharmacyWallet } from "../../../types";
import * as pharmacyService from "../../../services/pharmacyService";
import {
  emptyTransferForm,
  emptyWalletForm,
  type TransferFormState,
  type WalletFormState,
} from "./walletTypes";

type Input = {
  isArabic: boolean;
  pharmacyId: string;
  canManageCosts: boolean;
  isSubscriptionExpired: boolean;
};

export function useInvestmentWalletsState({
  isArabic,
  pharmacyId,
  canManageCosts,
  isSubscriptionExpired,
}: Input) {
  const [wallets, setWallets] = useState<PharmacyWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [defaultPosSavingId, setDefaultPosSavingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editing, setEditing] = useState<PharmacyWallet | null>(null);
  const [form, setForm] = useState<WalletFormState>(emptyWalletForm);
  const [transferForm, setTransferForm] = useState<TransferFormState>(emptyTransferForm);

  const loadWallets = useCallback(async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const rows = await pharmacyService.getPharmacyWallets(pharmacyId);
      setWallets(rows.filter((item) => item.isActive !== false));
    } catch (error) {
      console.error("Load wallets error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر تحميل المحافظ"
            : "Could not load wallets",
      );
    } finally {
      setLoading(false);
    }
  }, [pharmacyId, isArabic]);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  function openAddModal() {
    setEditing(null);
    setForm(emptyWalletForm);
    setShowModal(true);
  }

  function openEditModal(wallet: PharmacyWallet) {
    setEditing(wallet);
    setForm({
      name: wallet.name,
      walletType: wallet.walletType,
      balance: wallet.balance,
      notes: wallet.notes || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setEditing(null);
    setForm(emptyWalletForm);
  }

  function openTransferModal() {
    const first = wallets[0];
    const second = wallets[1];
    setTransferForm({
      fromWalletId: first ? String(first.id) : "",
      toWalletId: second ? String(second.id) : "",
      amount: "",
    });
    setShowTransferModal(true);
  }

  function closeTransferModal() {
    if (transferring) return;
    setShowTransferModal(false);
    setTransferForm(emptyTransferForm);
  }

  async function handleSave() {
    if (!canManageCosts || isSubscriptionExpired || saving) return;
    if (!form.name.trim()) {
      alert(isArabic ? "أدخل اسم المحفظة" : "Enter a wallet name");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await pharmacyService.updatePharmacyWallet(editing.id, {
          name: form.name.trim(),
          walletType: form.walletType,
          balance: Number(form.balance) || 0,
          notes: form.notes.trim(),
        });
      } else {
        const now = new Date().toISOString();
        await pharmacyService.savePharmacyWallet({
          id: Date.now(),
          pharmacyId,
          name: form.name.trim(),
          walletType: form.walletType,
          balance: Number(form.balance) || 0,
          notes: form.notes.trim(),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
      await loadWallets();
      closeModal();
    } catch (error) {
      console.error("Save wallet error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر حفظ المحفظة"
            : "Could not save wallet",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTransfer() {
    if (!canManageCosts || isSubscriptionExpired || transferring) return;

    const fromWalletId = Number(transferForm.fromWalletId);
    const toWalletId = Number(transferForm.toWalletId);
    const amount = Number(transferForm.amount);

    if (!fromWalletId || !toWalletId) {
      alert(isArabic ? "اختر المحفظتين" : "Select both wallets");
      return;
    }
    if (fromWalletId === toWalletId) {
      alert(isArabic ? "اختر محفظتين مختلفتين" : "Choose two different wallets");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert(isArabic ? "أدخل مبلغ تحويل صحيح" : "Enter a valid transfer amount");
      return;
    }

    const fromWallet = wallets.find((item) => item.id === fromWalletId);
    if (fromWallet && Number(fromWallet.balance) < amount) {
      alert(isArabic ? "رصيد المحفظة المصدر غير كافٍ" : "Insufficient source wallet balance");
      return;
    }

    setTransferring(true);
    try {
      await pharmacyService.transferBetweenWallets({ fromWalletId, toWalletId, amount });
      await loadWallets();
      closeTransferModal();
    } catch (error) {
      console.error("Transfer wallet error:", error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Insufficient")) {
        alert(isArabic ? "رصيد المحفظة المصدر غير كافٍ" : "Insufficient source wallet balance");
      } else if (message.includes("different")) {
        alert(isArabic ? "اختر محفظتين مختلفتين" : "Choose two different wallets");
      } else {
        alert(
          message ||
            (isArabic ? "تعذر التحويل بين المحافظ" : "Could not transfer between wallets"),
        );
      }
    } finally {
      setTransferring(false);
    }
  }

  async function handleSetDefaultPos(wallet: PharmacyWallet) {
    if (!canManageCosts || isSubscriptionExpired || defaultPosSavingId) return;
    setDefaultPosSavingId(wallet.id);
    try {
      await pharmacyService.setDefaultPosWallet(pharmacyId, wallet.id);
      await loadWallets();
    } catch (error) {
      console.error("Set default POS wallet error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر تعيين المحفظة الافتراضية"
            : "Could not set default POS wallet",
      );
    } finally {
      setDefaultPosSavingId(null);
    }
  }

  async function handleDelete(wallet: PharmacyWallet) {
    if (!canManageCosts || isSubscriptionExpired) return;
    const confirmed = window.confirm(
      isArabic ? `حذف المحفظة "${wallet.name}"؟` : `Delete wallet "${wallet.name}"?`,
    );
    if (!confirmed) return;

    setDeletingId(wallet.id);
    try {
      await pharmacyService.deletePharmacyWallet(wallet.id);
      await loadWallets();
    } catch (error) {
      console.error("Delete wallet error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر حذف المحفظة"
            : "Could not delete wallet",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const totalBalance = wallets.reduce((sum, item) => sum + Number(item.balance || 0), 0);
  const canTransfer = canManageCosts && wallets.length >= 2 && !isSubscriptionExpired;

  return {
    wallets,
    loading,
    saving,
    transferring,
    deletingId,
    defaultPosSavingId,
    showModal,
    showTransferModal,
    editing,
    form,
    setForm,
    transferForm,
    setTransferForm,
    totalBalance,
    canTransfer,
    openAddModal,
    openEditModal,
    closeModal,
    openTransferModal,
    closeTransferModal,
    handleSave,
    handleTransfer,
    handleDelete,
    handleSetDefaultPos,
  };
}
