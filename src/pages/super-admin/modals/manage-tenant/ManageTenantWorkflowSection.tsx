import { getSupabaseUserWorkflowSteps } from "../../../../utils/supabaseUserWorkflow";
import type { SuperAdminPageState } from "../../useSuperAdminPageState";

type Props = Pick<SuperAdminPageState, "isArabic">;

export default function ManageTenantWorkflowSection({ isArabic }: Props) {
  return (
    <details className="supabaseWorkflowDetails saasManageWorkflowDetails">
      <summary>{isArabic ? "كيفية الربط مع الموظفين" : "Linking with staff"}</summary>
      <ol>
        {getSupabaseUserWorkflowSteps(isArabic).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </details>
  );
}
