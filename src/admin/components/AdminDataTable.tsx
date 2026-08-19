import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// NOTE (HeroUI v3 rebuild): HeroUI's real Table component is a full
// react-aria-components collection (generic <Column>/<Row> render-prop API)
// — genuinely powerful, but wiring it generically across 4 admin pages with
// very different column shapes (Products/Categories/Orders/Bookings) under
// this migration's scope favored a simpler, still-reusable approach: a plain
// semantic <table> styled with Tailwind + real HeroUI tokens, driven by a
// column-definition prop so each admin page supplies its own columns/rows
// instead of hand-rolling table markup 4 separate times (which is what the
// original app did). This is what actually makes the admin section "cleaner
// and easier to use" going forward — one table implementation to maintain.

export interface AdminDataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface AdminDataTableProps<T> {
  columns: AdminDataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyState: { icon: LucideIcon; title: string; description: string };
}

export default function AdminDataTable<T>({
  columns,
  data,
  rowKey,
  emptyState,
}: AdminDataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] border border-border bg-surface-secondary p-14 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-surface-tertiary text-muted">
          <emptyState.icon className="size-8" />
        </span>
        <h4 className="m-0 text-lg font-bold text-foreground">
          {emptyState.title}
        </h4>
        <p className="m-0 text-sm text-muted">{emptyState.description}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-surface-secondary shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted ${col.headerClassName || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={rowKey(row)}
                className={i % 2 === 1 ? "bg-surface/40" : ""}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 align-middle ${col.cellClassName || ""}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
