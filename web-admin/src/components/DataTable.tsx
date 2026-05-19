import type { ReactNode } from 'react';

type DataTableProps<T> = {
  title: string;
  rows: T[];
  columns: Array<{ label: string; render: (row: T) => ReactNode }>;
};

export function DataTable<T>({ title, rows, columns }: DataTableProps<T>) {
  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2>{title}</h2>
        <span>{rows.length} kayit</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.label}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.label}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
