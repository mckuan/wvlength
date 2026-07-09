import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import DataPreview from "../components/PreviewPage/DataPreview"
import DataTransforms from "../components/PreviewPage/DataTransform"

export default function PreviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.dataset
  const [transformedDataset, setTransformedDataset] = useState(result)

  if (!result) {
    navigate("/")
    return null
  }

  const handleTransform = (transformed: object) => {
    setTransformedDataset((prev: object) => ({ ...prev, ...transformed }))
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "#E8EFF4" }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="text-sm #9DB6C9 hover:#5F7B94"
        >
          ← Back to upload
        </button>
      </div>

      {/* ── Split pane ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — data preview */}
        <div className="flex-1 overflow-y-auto px-6 py-6 border-r border-gray-200">
          <DataPreview {...transformedDataset} />
        </div>

        {/* Right — transforms */}
        <div className="w-96 shrink-0 overflow-y-auto px-6 py-6">
          <DataTransforms
            fileId={transformedDataset.file_id}
            columns={transformedDataset.columns}
            preview={transformedDataset.preview}
            onTransform={handleTransform}
          />
        </div>

      </div>
    </div>
  )
}