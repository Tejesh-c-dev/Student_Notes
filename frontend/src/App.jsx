import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./services/pages/Home";
import NoteDetail from "./services/pages/NoteDetail";
import Notes from "./services/pages/Notes";
import PublicNotes from "./services/pages/PublicNotes";
import Quiz from "./services/pages/Quiz";
import PYQs from "./services/pages/PYQs";
import Doubts from "./services/pages/Doubts";
import Login from "./services/pages/Login";
import Register from "./services/pages/Register";
import ForgotPassword from "./services/pages/ForgotPassword";
import ResetPassword from "./services/pages/ResetPassword";
import Navbar from "./components/Navbar";

/**
 * Main App Component
 * Sets up routing and authentication context for the entire application
 */
function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/:id" element={<NoteDetail />} />
        <Route path="/public-notes" element={<PublicNotes />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/pyqs" element={<PYQs />} />
        <Route path="/doubts" element={<Doubts />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
