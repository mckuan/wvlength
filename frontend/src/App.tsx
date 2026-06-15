import { BrowserRouter, Routes, Route } from "react-router-dom"
import UploadPage from "./pages/UploadPage"
import ChartPage from "./pages/ChartPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/chart" element={<ChartPage />} />
      </Routes>
    </BrowserRouter>
  )
}