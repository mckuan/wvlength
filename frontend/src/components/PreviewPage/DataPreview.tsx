interface Column {
  name: string
  type: string
}

interface Props {
  filename: string
  rows: number
  columns: Column[]
  preview: Record<string, unknown>[]
}

export default function DataPreview({ filename, rows, columns, preview }: Props) {
  return (
    <div>
      {/* Summary */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{filename}</h2>
        <p className="text-gray-500 text-sm">{rows} rows · {columns.length} columns</p>
      </div>

      {/* Column tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {columns.map((col) => (
          <span key={col.name} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
            {col.name} <span className="text-gray-400">({col.type})</span>
          </span>
        ))}
      </div>

      {/* Preview table — fills remaining height */}
      <div className="overflow-x-auto overflow-y-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th key={col.name} className="px-4 py-2 text-left font-medium text-324E66 whitespace-nowrap">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#F7F4F3" : "#E8EFF4" }}>
                {columns.map((col) => (
                  <td key={col.name} className="px-4 py-2 text-gray-700 whitespace-nowrap">
                    {String(row[col.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}