import { useLocation, useNavigate } from "react-router-dom"
import DataPreview from "../components/PreviewPage/DataPreview"

export default function PreviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state?.dataset

  if (!result) {
    navigate("/")
    return null
  }

  const handleContinue = () => {
    navigate("/chart", { state: { dataset: result } })
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <button
        onClick={() => navigate("/")}
        className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block"
      >
        ← Back to upload
      </button>
      <DataPreview {...result} />
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleContinue}
          className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Continue to Analysis →
        </button>
      </div>
    </div>
  )
}