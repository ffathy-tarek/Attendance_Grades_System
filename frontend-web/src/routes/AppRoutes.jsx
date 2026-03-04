import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import ForgetPassword from "../pages/ForgetPassword.jsx";
import RequestEmail from "../pages/RequestEmail.jsx";

import Layout from "../components/layout/layout";
import AdminDashboard from "../pages/admin/AdminDashboard.jsx";
import Students from "../pages/admin/Students.jsx";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/forget-password" element={<ForgetPassword />} />
        <Route path="/request-email" element={<RequestEmail />} />

        {/* Admin Nested Routes */}
        <Route path="/admin" element={<Layout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<Students />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;