import { useState } from "react"
import axios from "axios"
import DropZone from "../components/DropZone"
import DataPreview from "../components/DataPreview"

interface Column {
  name: string
  type: string
}

interface UploadResult {
  filename: string
  rows: number
  columns: Column[]
  preview: Record<string, unknown>[]
}

export default function Upload() {
  const [result, setResult] = useState<UploadResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await axios.post("http://localhost:8000/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setResult(res.data)
    } catch (err) {
      setError("Upload failed — make sure your backend is running.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-8">WVLENGTH</h1>
      <DropZone onUpload={handleUpload} loading={loading} />
      {error && <p className="mt-4 text-red-500">{error}</p>}
      {result && <DataPreview {...result} />}
    </div>
  )
}