type SalesPoint = { date: string; total: number };
type PaymentSlice = { method: string; total: number };
type TopItem = {
  medicineId: number;
  name_ar: string;
  name_en: string;
  quantity: number;
  total: number;
};

type DashboardChartsProps = {
  isArabic: boolean;
  currency: string;
  salesTrend: SalesPoint[];
  paymentBreakdown: PaymentSlice[];
  topSelling: TopItem[];
};

const PAYMENT_META: Record<string, { color: string; ar: string; en: string }> = {
  cash: { color: "#12b76a", ar: "نقدي", en: "Cash" },
  visa: { color: "#2e90fa", ar: "فيزا", en: "Visa" },
  wallet: { color: "#f79009", ar: "محفظة", en: "Wallet" },
  credit: { color: "#f04438", ar: "آجل", en: "Credit" },
};

const fallbackPayment = { color: "#667085", ar: "أخرى", en: "Other" };

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function SalesTrendChart({
  isArabic,
  currency,
  salesTrend,
}: {
  isArabic: boolean;
  currency: string;
  salesTrend: SalesPoint[];
}) {
  const hasData = salesTrend.some((p) => p.total > 0);
  const maxVal = Math.max(1, ...salesTrend.map((p) => p.total));

  const chartH = 150;
  const slot = 46;
  const barW = 24;
  const width = Math.max(salesTrend.length * slot, slot);
  const labelStep = salesTrend.length > 12 ? Math.ceil(salesTrend.length / 12) : 1;

  return (
    <div className="card chartCard">
      <div className="cardHeader">
        <h2>{isArabic ? "اتجاه المبيعات" : "Sales Trend"}</h2>
      </div>
      {!hasData ? (
        <p className="empty">
          {isArabic ? "لا توجد مبيعات في هذه الفترة" : "No sales in this period"}
        </p>
      ) : (
        <div className="chartScroll">
          <svg
            className="trendSvg"
            viewBox={`0 0 ${width} ${chartH + 34}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
          >
            {salesTrend.map((point, index) => {
              const h = Math.round((point.total / maxVal) * chartH);
              const x = index * slot + (slot - barW) / 2;
              const y = chartH - h;
              const day = String(point.date || "").slice(8, 10);
              const showLabel = index % labelStep === 0;
              return (
                <g key={point.date}>
                  <rect x={x} y={0} width={barW} height={chartH} rx={6} fill="var(--chart-bar-track)" />
                  <rect x={x} y={y} width={barW} height={h} rx={6} fill="#05693b">
                    <title>{`${point.date}: ${formatMoney(point.total)} ${currency}`}</title>
                  </rect>
                  {showLabel && (
                    <text
                      x={x + barW / 2}
                      y={chartH + 18}
                      textAnchor="middle"
                      fontSize="11"
                      fill="var(--chart-axis-label)"
                    >
                      {day}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

function PaymentDonut({
  isArabic,
  currency,
  paymentBreakdown,
}: {
  isArabic: boolean;
  currency: string;
  paymentBreakdown: PaymentSlice[];
}) {
  const total = paymentBreakdown.reduce((sum, slice) => sum + slice.total, 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="card chartCard">
      <div className="cardHeader">
        <h2>{isArabic ? "طرق الدفع" : "Payment Methods"}</h2>
      </div>
      {total <= 0 ? (
        <p className="empty">{isArabic ? "لا توجد بيانات دفع" : "No payment data"}</p>
      ) : (
        <div className="donutWrap">
          <svg width="150" height="150" viewBox="0 0 150 150" role="img">
            <g transform="rotate(-90 75 75)">
              <circle cx="75" cy="75" r={radius} fill="none" stroke="var(--chart-donut-ring-bg)" strokeWidth="18" />
              {paymentBreakdown.map((slice) => {
                const meta = PAYMENT_META[slice.method] || fallbackPayment;
                const fraction = slice.total / total;
                const dash = fraction * circumference;
                const seg = (
                  <circle
                    key={slice.method}
                    cx="75"
                    cy="75"
                    r={radius}
                    fill="none"
                    stroke={meta.color}
                    strokeWidth="18"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                  >
                    <title>{`${isArabic ? meta.ar : meta.en}: ${formatMoney(slice.total)} ${currency}`}</title>
                  </circle>
                );
                offset += dash;
                return seg;
              })}
            </g>
            <text x="75" y="71" textAnchor="middle" fontSize="13" fill="var(--chart-center-label)">
              {isArabic ? "الإجمالي" : "Total"}
            </text>
            <text x="75" y="90" textAnchor="middle" fontSize="15" fontWeight="bold" fill="var(--chart-center-value)">
              {formatMoney(total)}
            </text>
          </svg>

          <div className="donutLegend">
            {paymentBreakdown.map((slice) => {
              const meta = PAYMENT_META[slice.method] || fallbackPayment;
              const pct = Math.round((slice.total / total) * 100);
              return (
                <div className="donutLegendItem" key={slice.method}>
                  <span className="legendDot" style={{ background: meta.color }} />
                  <span className="legendLabel">{isArabic ? meta.ar : meta.en}</span>
                  <span className="legendValue">
                    {formatMoney(slice.total)} {currency} · {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TopSellingBars({
  isArabic,
  currency,
  topSelling,
}: {
  isArabic: boolean;
  currency: string;
  topSelling: TopItem[];
}) {
  const maxQty = Math.max(1, ...topSelling.map((item) => item.quantity));

  return (
    <div className="card chartCard">
      <div className="cardHeader">
        <h2>{isArabic ? "أعلى الأصناف مبيعًا" : "Top Selling Items"}</h2>
      </div>
      {topSelling.length === 0 ? (
        <p className="empty">{isArabic ? "لا توجد مبيعات كافية" : "Not enough sales data"}</p>
      ) : (
        <div className="barList">
          {topSelling.map((item) => {
            const pct = Math.round((item.quantity / maxQty) * 100);
            return (
              <div className="barRow" key={item.medicineId}>
                <div className="barRowTop">
                  <span className="barName">{isArabic ? item.name_ar : item.name_en}</span>
                  <span className="barValue">
                    {item.quantity} {isArabic ? "وحدة" : "units"}
                  </span>
                </div>
                <div className="barTrack">
                  <div className="barFill" style={{ width: `${pct}%` }} />
                </div>
                <span className="barSub">
                  {formatMoney(item.total)} {currency}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardCharts({
  isArabic,
  currency,
  salesTrend,
  paymentBreakdown,
  topSelling,
}: DashboardChartsProps) {
  return (
    <section className="chartsGrid">
      <SalesTrendChart isArabic={isArabic} currency={currency} salesTrend={salesTrend} />
      <PaymentDonut isArabic={isArabic} currency={currency} paymentBreakdown={paymentBreakdown} />
      <TopSellingBars isArabic={isArabic} currency={currency} topSelling={topSelling} />
    </section>
  );
}
