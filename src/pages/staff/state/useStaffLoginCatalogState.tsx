import { formatLoginAccountOptionLabel } from "../helpers";
import { createStaffLoginCatalogRenderers } from "./login-catalog/staffLoginCatalogRenderers";
import type { StaffLoginCatalogParams } from "./login-catalog/types";
import { useStaffLoginCatalogApproval } from "./login-catalog/useStaffLoginCatalogApproval";
import {
  useStaffLoginCatalogCrud,
  useStaffLoginCatalogModalState,
} from "./login-catalog/useStaffLoginCatalogCrud";
import { useStaffLoginCatalogData } from "./login-catalog/useStaffLoginCatalogData";

export type { StaffLoginCatalogParams } from "./login-catalog/types";

export function useStaffLoginCatalogState(params: StaffLoginCatalogParams) {
  const modal = useStaffLoginCatalogModalState();
  const approval = useStaffLoginCatalogApproval(params);
  const data = useStaffLoginCatalogData({ ...params, editCatalogId: modal.editCatalogId });
  const crud = useStaffLoginCatalogCrud({ ...params, ...modal, ...data, ...approval });
  const { renderLoginAccountLinkStatus, renderSystemUserStatus } = createStaffLoginCatalogRenderers(
    params.isArabic,
  );

  return {
    ...modal,
    ...data,
    ...approval,
    ...crud,
    renderLoginAccountLinkStatus,
    renderSystemUserStatus,
    formatLoginAccountOptionLabel,
  };
}
