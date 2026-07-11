import { useLocation, useNavigate } from "react-router-dom"
import ChartBuilder from "../components/ChartPage/ChartBuilder"

export default function ChartPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const dataset = location.state?.dataset

  if (!dataset) {
    navigate("/")
    return null
  }

  return (
    <div className="w-full min-h-screen px-6 py-8" style={{ background: "#F7F4F3" }}>
      <ChartBuilder
        columns={dataset.columns}
        preview={dataset.preview}
        fileId={dataset.file_id}
      />
    </div>
  )
}