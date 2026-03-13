import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx"; // التعديل هنا

import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import ForgetPassword from "../pages/ForgetPassword.jsx";
import RequestEmail from "../pages/RequestEmail.jsx";

import Layout from "../components/layout/Layout.jsx";

import AdminDashboard from "../pages/admin/AdminDashboard.jsx";
import Students from "../pages/admin/Students.jsx";
import Instructors from "../pages/admin/Instructors.jsx";
import Subjects from "../pages/admin/Subjects.jsx";
import PendingAccounts from "../pages/admin/PendingAccounts.jsx";
import SubjectStudents from "../pages/admin/SubjectStudents.jsx";

// مكون حماية المسارات (فقط للأدمن)
const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null; 

  if (!user || user.role !== "admin") {
    return <Navigate replace to="/login" />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/forget-password" element={<ForgetPassword />} />
        <Route path="/request-email" element={<RequestEmail />} />

        {/* حماية مسار الأدمن بالكامل */}
        <Route 
          path="/admin" 
          element={
            <ProtectedAdminRoute>
              <Layout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="instructors" element={<Instructors />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="pending-accounts" element={<PendingAccounts />} />
          <Route path="subject-students/:id" element={<SubjectStudents />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;