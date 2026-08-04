import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import { api } from "../lib/api"
import DropZone from "../components/Upload/DropZone"
import DataPreview from "../components/PreviewPage/DataPreview"
import PastUploads from "../components/Upload/PastUploads"

interface Column {
  name: string
  type: string
  null_count: number
  null_pct: number
}

interface UploadResult {
  file_id: string
  filename: string
  rows: number
  columns: Column[]
  preview: Record<string, unknown>[]
}

export default function UploadPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // present only when arriving here from ProjectPage's "set up this graph"
  // flow — carried through untouched so ChartPage can PATCH the right block
  const projectId: number | undefined = location.state?.projectId
  const blockId: string | undefined = location.state?.blockId

  const [result, setResult] = useState<UploadResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUpload = async (file: File) => {
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await api.post("/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setRefreshTrigger(t => t + 1)
      navigate("/preview", { state: { dataset: res.data, projectId, blockId } })
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

  const handlePastUpload = async (file_id: string) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.get(`/upload/files/${file_id}/preview`)
      navigate("/preview", { state: { dataset: res.data, projectId, blockId } })
    } catch (err) {
      setError("Failed to load past upload.")
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (!result) return
    navigate("/chart", { state: { dataset: result, projectId, blockId } })
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-8">WVLENGTH</h1>
      <DropZone onUpload={handleUpload} loading={loading} />
      <PastUploads onSelect={handlePastUpload} refreshTrigger={refreshTrigger} />
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