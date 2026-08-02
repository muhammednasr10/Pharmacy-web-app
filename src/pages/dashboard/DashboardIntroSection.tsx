type DashboardIntroSectionProps = {
  isArabic: boolean;
};

export default function DashboardIntroSection({ isArabic }: DashboardIntroSectionProps) {
  return (
    <section className="card dashboardIntro">
      <h2>{isArabic ? "لوحة التحكم" : "Dashboard"}</h2>
      <p className="returnsSectionHint">
        {isArabic
          ? "ملخص سريع حسب صلاحياتك — اضغط على أي بطاقة للانتقال"
          : "Quick summary for your role — click any card to navigate"}
      </p>
    </section>
  );
}
