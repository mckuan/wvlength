import { BrowserRouter, Routes, Route } from "react-router-dom"
import UploadPage from "./pages/UploadPage"
import ChartPage from "./pages/ChartPage"
import PreviewPage from "./pages/PreviewPage"
import WorkspacePage from "./pages/WorkspacePage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/chart" element={<ChartPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
      </Routes>
    </BrowserRouter>
  )
}