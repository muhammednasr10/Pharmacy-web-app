import { isPreviewDeploy } from "../config/deployEnv";

type PreviewDeployBannerProps = {
  isArabic: boolean;
};

export default function PreviewDeployBanner({ isArabic }: PreviewDeployBannerProps) {
  if (!isPreviewDeploy) return null;

  return (
    <div className="previewDeployBanner" dir={isArabic ? "rtl" : "ltr"}>
      <strong>{isArabic ? "بيئة معاينة" : "Preview environment"}</strong>
      <span>
        {isArabic
          ? "هذا نشر تجريبي من Vercel — البيانات والإعدادات قد تختلف عن الإنتاج."
          : "This is a Vercel preview deployment — data and settings may differ from production."}
      </span>
    </div>
  );
}
