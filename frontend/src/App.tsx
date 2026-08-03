import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import WelcomePage from "./pages/WelcomePage"
import UploadPage from "./pages/UploadPage"
import ChartPage from "./pages/ChartPage"
import PreviewPage from "./pages/PreviewPage"
import WorkspacePage from "./pages/WorkspacePage"
import SignUpPage from "./pages/SignUpPage"
import SignInPage from "./pages/SignInPage"
import ProjectPage from "./pages/ProjectPage"


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sign-in" element={<SignInPage />} />

          {/* everything past this point requires a logged-in user */}
          <Route path ="/project" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/chart" element={<ProtectedRoute><ChartPage /></ProtectedRoute>} />
          <Route path="/preview" element={<ProtectedRoute><PreviewPage /></ProtectedRoute>} />
          <Route path="/workspace" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}