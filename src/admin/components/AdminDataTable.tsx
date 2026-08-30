import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Table } from "@heroui/react";

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
}

export default function AdminDataTable<T extends object>({
  columns,
  data,
  rowKey,
  emptyState,
}: AdminDataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] border border-border bg-surface-secondary p-10 text-center sm:p-14">
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-surface-tertiary text-muted">
          <emptyState.icon className="size-8" />
        </span>
        <h4 className="m-0 text-lg font-bold text-foreground">{emptyState.title}</h4>
        <p className="m-0 max-w-md text-sm text-muted">{emptyState.description}</p>
      </div>
    );
  }

  return (
    <Table className="w-full overflow-hidden rounded-[28px] border border-border bg-surface-secondary shadow-[0_4px_20px_rgba(0,0,0,0.04)]" variant="secondary">
      <Table.ScrollContainer className="w-full">
        <Table.Content aria-label="Admin data table" className="min-w-[800px]">
          <Table.Header>
            {columns.map((column) => (
              <Table.Column key={column.key} id={column.key} className={column.headerClassName}>
                {column.header}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body items={data}>
            {(row) => (
              <Table.Row id={rowKey(row)}>
                {columns.map((column) => (
                  <Table.Cell key={column.key} className={column.cellClassName}>
                    {column.render(row)}
                  </Table.Cell>
                ))}
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
