import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/arc/empty-state/empty-state";

export interface AdminDataTableColumn<T extends object> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface AdminDataTableProps<T extends object> {
  columns: AdminDataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyState: { icon: LucideIcon; title: string; description: string };
  caption?: string;
}

export default function AdminDataTable<T extends object>({ columns, data, rowKey, emptyState, caption = "Data table" }: AdminDataTableProps<T>) {
  if (data.length === 0) {
    const Icon = emptyState.icon;

    return (
      <div className="ad-card">
        <EmptyState description={emptyState.description} icon={<Icon aria-hidden="true" size={22} strokeWidth={1.75} />} title={emptyState.title} />
      </div>
    );
  }

  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <caption className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key} className={c.headerClassName} scope="col">{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => <td key={c.key} className={c.cellClassName}>{c.render(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
