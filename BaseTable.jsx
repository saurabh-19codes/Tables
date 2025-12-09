// BaseTable.jsx
import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  getExpandedRowModel,
} from '@tanstack/react-table';
import PropTypes from 'prop-types';
import './FinancialTable.css';

/**
 * Generic table:
 * - columns: tanstack column definitions
 * - data: rows array
 * - enableExpand: boolean to enable row expansion (uses row.subRows)
 * - renderSubRow: function(row) => ReactNode for expanded content (if enableExpand)
 */
const BaseTable = ({ columns, data, enableExpand = false, renderSubRow }) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data: data || [],
    columns: columns || [],
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: enableExpand ? getExpandedRowModel() : undefined,
    debugTable: false,
  });

  return (
    <div className="ft-table-wrapper">
      <div className="ft-table-toolbar">
        <input
          data-testid="global-search"
          className="ft-global-search"
          placeholder="Search..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      </div>

      <div className="ft-table-scroll">
        <table className="ft-table">
          <thead className="ft-thead">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="ft-th"
                    style={{
                      position: header.column.columnDef.meta?.sticky ? 'sticky' : undefined,
                      left: header.column.columnDef.meta?.left ?? undefined,
                      zIndex: header.column.columnDef.meta?.sticky ? 2 : 1,
                      minWidth: header.column.columnDef.meta?.minWidth,
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="ft-th-inner">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className="ft-sort-indicator">
                        {header.column.getIsSorted() === 'asc' ? ' 🔼' : header.column.getIsSorted() === 'desc' ? ' 🔽' : ''}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="ft-no-data">No records found!</td>
              </tr>
            )}
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr
                  className={`ft-tr ${row.getIsExpanded() ? 'ft-row-expanded' : ''}`}
                  onClick={() => {
                    // Prevent toggling expand when clicking inside expand button cell (handled separately)
                    // default row click does nothing; expansion handled via expand icon or row-specific click handlers in column events
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="ft-td"
                      style={{
                        minWidth: cell.column.columnDef.meta?.minWidth,
                        position: cell.column.columnDef.meta?.sticky ? 'sticky' : undefined,
                        left: cell.column.columnDef.meta?.left ?? undefined,
                        background: cell.column.columnDef.meta?.sticky ? '#F7F8F9' : undefined,
                        zIndex: cell.column.columnDef.meta?.sticky ? 1 : undefined,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>

                {/* Expanded content (if any) */}
                {enableExpand && row.getIsExpanded() && (
                  <tr className="ft-subrow">
                    <td colSpan={columns.length} className="ft-subrow-td">
                      {renderSubRow ? renderSubRow(row.original, row) : null}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

BaseTable.propTypes = {
  columns: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  enableExpand: PropTypes.bool,
  renderSubRow: PropTypes.func,
};

export default BaseTable;
