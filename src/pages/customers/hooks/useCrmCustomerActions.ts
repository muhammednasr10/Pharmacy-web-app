import { useState, type Dispatch, type SetStateAction } from "react";
import * as pharmacyService from "../../../services/pharmacyService";
import type {
  CrmCustomer,
  CrmCustomerProfile,
  CustomerActivity,
  PharmacySupplier,
} from "../../../types";
import { crmActionErrorAlert, subscriptionBlockedAlert } from "../crmPageErrors";

type Params = {
  isArabic: boolean;
  isSubscriptionExpired: boolean;
  getPharmacyId: () => string;
  setCrmCustomers: Dispatch<SetStateAction<CrmCustomer[]>>;
  setSuppliers: Dispatch<SetStateAction<PharmacySupplier[]>>;
  setCustomerActivities: Dispatch<SetStateAction<CustomerActivity[]>>;
};

export function useCrmCustomerActions({
  isArabic,
  isSubscriptionExpired,
  getPharmacyId,
  setCrmCustomers,
  setSuppliers,
  setCustomerActivities,
}: Params) {
  const [selectedProfile, setSelectedProfile] = useState<CrmCustomerProfile | null>(null);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [customerFormInitial, setCustomerFormInitial] = useState<Partial<CrmCustomer> | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [supplierFormInitial, setSupplierFormInitial] = useState<Partial<PharmacySupplier> | null>(
    null,
  );
  const [savingSupplier, setSavingSupplier] = useState(false);

  async function saveCrmCustomer(customer: CrmCustomer) {
    if (isSubscriptionExpired) {
      alert(subscriptionBlockedAlert(isArabic));
      return;
    }
    setSavingCustomer(true);
    try {
      const saved = await pharmacyService.saveCrmCustomer({
        ...customer,
        pharmacyId: getPharmacyId(),
      });
      setCrmCustomers((prev) => {
        const index = prev.findIndex((item) => item.id === saved.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setCustomerFormOpen(false);
      setCustomerFormInitial(null);
      alert(isArabic ? "تم حفظ بيانات العميل" : "Customer saved");
    } catch (error) {
      alert(
        crmActionErrorAlert(
          error,
          isArabic,
          isArabic ? "تعذر حفظ العميل" : "Could not save customer",
          "customers-crm.sql",
        ),
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  async function saveSupplier(supplier: PharmacySupplier) {
    if (isSubscriptionExpired) {
      alert(subscriptionBlockedAlert(isArabic));
      return;
    }
    setSavingSupplier(true);
    try {
      const saved = await pharmacyService.savePharmacySupplier({
        ...supplier,
        pharmacyId: getPharmacyId(),
      });
      setSuppliers((prev) => {
        const index = prev.findIndex((item) => item.id === saved.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setSupplierFormOpen(false);
      setSupplierFormInitial(null);
      alert(isArabic ? "تم حفظ المورد" : "Supplier saved");
    } catch (error) {
      alert(
        crmActionErrorAlert(
          error,
          isArabic,
          isArabic ? "تعذر حفظ المورد" : "Could not save supplier",
          "pharmacy-suppliers.sql",
        ),
      );
    } finally {
      setSavingSupplier(false);
    }
  }

  async function deleteSupplier(id: number, name: string) {
    if (isSubscriptionExpired) {
      alert(subscriptionBlockedAlert(isArabic));
      return;
    }
    const confirmed = window.confirm(
      isArabic ? `حذف المورد «${name}»؟` : `Delete supplier "${name}"?`,
    );
    if (!confirmed) return;
    try {
      await pharmacyService.deletePharmacySupplier(id);
      setSuppliers((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      alert(
        crmActionErrorAlert(
          error,
          isArabic,
          isArabic ? "تعذر حذف المورد" : "Could not delete supplier",
          "pharmacy-suppliers.sql",
        ),
      );
    }
  }

  async function addCustomerActivity(activity: CustomerActivity) {
    try {
      const saved = await pharmacyService.saveCustomerActivity({
        ...activity,
        pharmacyId: getPharmacyId(),
      });
      setCustomerActivities((prev) => {
        const index = prev.findIndex((item) => item.id === saved.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = saved;
          return next;
        }
        return [saved, ...prev];
      });
    } catch (error) {
      alert(
        crmActionErrorAlert(
          error,
          isArabic,
          isArabic ? "تعذر حفظ النشاط" : "Could not save activity",
          "customers-crm.sql",
        ),
      );
      throw error;
    }
  }

  async function updateActivityStatus(id: number, status: CustomerActivity["status"]) {
    try {
      await pharmacyService.updateCustomerActivityStatus(id, status);
    } catch (error) {
      alert(
        crmActionErrorAlert(
          error,
          isArabic,
          isArabic ? "تعذر تحديث المتابعة" : "Could not update follow-up",
        ),
      );
    }
  }

  function openProfile(profile: CrmCustomerProfile) {
    setSelectedProfile(profile);
  }

  function openEditCustomer(profile: CrmCustomerProfile) {
    setCustomerFormInitial(profile);
    setCustomerFormOpen(true);
  }

  async function deleteCrmCustomer(profile: CrmCustomerProfile) {
    if (profile.source !== "registered" || !profile.id) return;
    if (isSubscriptionExpired) {
      alert(subscriptionBlockedAlert(isArabic));
      return;
    }
    const confirmed = window.confirm(
      isArabic ? `حذف العميل «${profile.name}»؟` : `Delete customer "${profile.name}"?`,
    );
    if (!confirmed) return;
    try {
      await pharmacyService.deleteCrmCustomer(profile.id);
      setCrmCustomers((prev) => prev.filter((item) => item.id !== profile.id));
      if (selectedProfile?.id === profile.id) setSelectedProfile(null);
    } catch (error) {
      alert(
        crmActionErrorAlert(
          error,
          isArabic,
          isArabic ? "تعذر حذف العميل" : "Could not delete customer",
          "customers-crm.sql",
        ),
      );
    }
  }

  function openRegisterInferred(profile: CrmCustomerProfile) {
    setCustomerFormInitial({
      id: Date.now(),
      name: profile.name,
      phone: profile.phone,
      address: profile.address,
      segment: profile.segment,
      notes: profile.notes,
    });
    setCustomerFormOpen(true);
  }

  return {
    selectedProfile,
    setSelectedProfile,
    customerFormOpen,
    setCustomerFormOpen,
    customerFormInitial,
    setCustomerFormInitial,
    savingCustomer,
    supplierFormOpen,
    setSupplierFormOpen,
    supplierFormInitial,
    setSupplierFormInitial,
    savingSupplier,
    saveCrmCustomer,
    saveSupplier,
    deleteSupplier,
    addCustomerActivity,
    updateActivityStatus,
    openProfile,
    openEditCustomer,
    deleteCrmCustomer,
    openRegisterInferred,
  };
}
