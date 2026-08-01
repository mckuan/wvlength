import { BrowserRouter, Routes, Route } from "react-router-dom"
import WelcomePage from "./pages/WelcomePage"
import UploadPage from "./pages/UploadPage"
import ChartPage from "./pages/ChartPage"
import PreviewPage from "./pages/PreviewPage"
import WorkspacePage from "./pages/WorkspacePage"
import SignUpPage from "./pages/SignUpPage"
import SignInPage from "./pages/SignInPage"


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/chart" element={<ChartPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
      </Routes>
    </BrowserRouter>
  )
}