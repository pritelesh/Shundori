import { BarChart3, Boxes, PackageCheck, TrendingUp } from "lucide-react";

import type { AnalyticsReport } from "@/types/phase8";
import { formatPrice } from "@/utils/format";

const fieldClass =
  "h-11 rounded-lg border border-line bg-white px-4 text-sm text-charcoal transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/15";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <span className="flex size-9 items-center justify-center rounded-full bg-emerald-soft">
        <Icon className="size-4 text-emerald" aria-hidden="true" />
      </span>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl text-charcoal">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function RankedList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { name: string; quantity: number; revenue: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.revenue));

  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <h2 className="font-display text-xl text-charcoal">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{empty}</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {rows.map((row, index) => (
            <li key={`${row.name}-${index}`}>
              <div className="flex items-baseline justify-between gap-4">
                <p className="truncate text-sm font-medium text-charcoal">
                  {index + 1}. {row.name}
                </p>
                <p className="shrink-0 text-xs text-muted">
                  {row.quantity} sold · {formatPrice(row.revenue)}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-deep">
                <div
                  className="h-full rounded-full bg-emerald"
                  style={{ width: `${Math.max(3, (row.revenue / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function AnalyticsReportView({ report }: { report: AnalyticsReport }) {
  const maxMonth = Math.max(1, ...report.monthlySales.map((month) => month.sales));

  return (
    <div className="space-y-7">
      <form action="/admin/reports" method="get" className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="from" className="mb-2 block text-sm font-medium">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={report.range.from}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="to" className="mb-2 block text-sm font-medium">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={report.range.to}
            className={fieldClass}
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-emerald px-6 text-sm font-medium text-white transition-colors hover:bg-emerald/90"
        >
          Apply range
        </button>
      </form>

      <p className="text-xs text-muted">
        Reporting {report.range.from} to {report.range.to}. Cancelled, returned
        and refunded orders are excluded. No customer details are included.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total sales"
          value={formatPrice(report.totals.totalSales)}
          hint="Non-cancelled, non-refunded orders"
          icon={TrendingUp}
        />
        <StatCard
          label="Orders"
          value={String(report.totals.orders)}
          hint="Within the selected range"
          icon={BarChart3}
        />
        <StatCard
          label="Average order"
          value={formatPrice(report.totals.averageOrderValue)}
          hint={`Coupon discounts: ${formatPrice(report.totals.discountTotal)}`}
          icon={BarChart3}
        />
        <StatCard
          label="Stock value"
          value={formatPrice(report.inventory.stockValue)}
          hint={`${report.inventory.units} units across ${report.inventory.skus} SKUs`}
          icon={Boxes}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RankedList
          title="Best-selling products"
          rows={report.bestSellingProducts.map((item) => ({
            name: item.name,
            quantity: item.quantitySold,
            revenue: item.revenue,
          }))}
          empty="No product sales in this range."
        />
        <RankedList
          title="Top brands"
          rows={report.topBrands.map((item) => ({
            name: item.brand,
            quantity: item.quantitySold,
            revenue: item.revenue,
          }))}
          empty="No brand sales in this range."
        />
      </div>

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="font-display text-xl text-charcoal">Monthly sales</h2>
        {report.monthlySales.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No monthly sales to show.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {report.monthlySales.map((month) => (
              <div key={month.month}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm font-medium">{month.month}</p>
                  <p className="text-xs text-muted">
                    {month.orders} orders · {formatPrice(month.sales)}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-deep">
                  <div
                    className="h-full rounded-full bg-pink"
                    style={{
                      width: `${Math.max(3, (month.sales / maxMonth) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="flex items-center gap-2 font-display text-xl text-charcoal">
          <PackageCheck className="size-5 text-emerald" aria-hidden="true" />
          Inventory summary
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          {[
            { label: "SKUs", value: report.inventory.skus },
            { label: "Units", value: report.inventory.units },
            { label: "Out of stock", value: report.inventory.outOfStock },
            { label: "Low stock", value: report.inventory.lowStock },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-cream/60 p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                {item.label}
              </p>
              <p className="mt-1 font-display text-2xl">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
