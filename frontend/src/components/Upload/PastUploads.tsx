// frontend/src/components/Upload/PastUploads.tsx
import { useEffect, useState } from "react"
import { api } from "../../lib/api"

interface FileMeta {
  file_id: string
  filename: string
  rows: number
  columns: { name: string; type: string }[]
  uploaded_at: number
}

interface Props {
  onSelect: (file_id: string) => void
  refreshTrigger: number
}

export default function PastUploads({ onSelect, refreshTrigger }: Props) {
  const [files, setFiles] = useState<FileMeta[]>([])

  useEffect(() => {
    api.get("/upload/files")
      .then(res => setFiles(res.data.files.slice(0, 5)))
      .catch(() => {})
  }, [refreshTrigger])

  if (files.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2"> or open recent </h3>
      <div className="space-y-2">
        {files.map(f => (
          <button
            key={f.file_id}
            onClick={() => onSelect(f.file_id)}
            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            <p className="text-sm font-medium text-gray-700">{f.filename}</p>
            <p className="text-xs text-gray-400">
              {f.rows} rows · {f.columns.length} cols · {new Date(f.uploaded_at * 1000).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}