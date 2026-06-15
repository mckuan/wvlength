import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import DropZone from "../components/Upload/DropZone"
import DataPreview from "../components/Upload/DataPreview"

interface Column {
  name: string
  type: string
  null_count: number
  null_pct: number
}

interface UploadResult {
  filename: string
  rows: number
  columns: Column[]
  preview: Record<string, unknown>[]
}

export default function UploadPage() {
  const navigate = useNavigate()
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
      setResult(res.data)  // show preview, don't navigate yet
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError("Upload failed — make sure your backend is running.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (!result) return
    navigate("/chart", { state: { dataset: result } })
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-8">WVLENGTH</h1>
      <DropZone onUpload={handleUpload} loading={loading} />
      {error && <p className="mt-4 text-red-500">{error}</p>}
      {result && (
        <>
          <DataPreview {...result} />
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleContinue}
              className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Continue to Analysis →
            </button>
          </div>
        </>
      )}
    </div>
  )
}