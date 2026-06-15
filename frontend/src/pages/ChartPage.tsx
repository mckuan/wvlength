import { useLocation, useNavigate } from "react-router-dom"
import ChartBuilder from "../components/ChartPage/ChartBuilder"

export default function ChartPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const dataset = location.state?.dataset

  // if no data, send them back to upload
  if (!dataset) {
    navigate("/")
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-8">Chart Builder</h1>
      <ChartBuilder columns={dataset.columns} preview={dataset.preview} />
    </div>
  )
}