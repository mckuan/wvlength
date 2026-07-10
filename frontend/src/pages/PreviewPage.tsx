import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import DataPreview from "../components/PreviewPage/DataPreview"
import DataTransforms from "../components/PreviewPage/DataTransform"

export default function PreviewPage() {
  const location = useLocation()
  const navigate  = useNavigate()
  const result    = location.state?.dataset
  const [transformedDataset, setTransformedDataset] = useState(result)
  const [resetting, setResetting] = useState(false)

  if (!result) {
    navigate("/")
    return null
  }

  const handleTransform = (transformed: object) => {
    setTransformedDataset((prev: object) => ({ ...prev, ...transformed }))
  }

  const handleContinue = () => {
    navigate("/chart", { state: { dataset: transformedDataset } })
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const res = await axios.post("http://localhost:8000/transforms/reset", {
        file_id: result.file_id,
      })
      // restore frontend state to original data
      setTransformedDataset({
        file_id:  res.data.file_id,
        filename: res.data.filename,
        rows:     res.data.rows,
        columns:  res.data.columns,
        preview:  res.data.preview,
      })
    } catch (err) {
      console.error("Reset failed", err)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>

      {/* top bar */}
      <div style={{
        display: "flex", alignItems: "center", padding: "10px 20px",
        borderBottom: "0.5px solid #dce8f0", background: "#F7F4F3", flexShrink: 0,
      }}>
        <button
          onClick={() => navigate("/")}
          style={{ fontSize: 12, color: "#5F7B94", background: "none", border: "none", cursor: "pointer" }}
        >
          ← Back to upload
        </button>
      </div>

      {/* split pane */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* left — data preview */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", borderRight: "0.5px solid #dce8f0" }}>
          <DataPreview {...transformedDataset} />
        </div>

        {/* right — guided transforms */}
        <div style={{ width: 300, flexShrink: 0, overflowY: "auto", background: "#F7F4F3" }}>
          {resetting ? (
            <div style={{ padding: 24, fontSize: 12, color: "#5F7B94" }}>Resetting...</div>
          ) : (
            <DataTransforms
              fileId={transformedDataset.file_id}
              columns={transformedDataset.columns}
              preview={transformedDataset.preview}
              onTransform={handleTransform}
              onContinue={handleContinue}
              onReset={handleReset}
            />
          )}
        </div>

      </div>
    </div>
  )
}