import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import FirestoreTest from "../components/FirestoreTest";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/test-firestore" element={<FirestoreTest />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
