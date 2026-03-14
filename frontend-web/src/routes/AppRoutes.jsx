import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

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

// 1. صفحة بسيطة للـ 404 أو الوصول الممنوع
const NotFound = () => (
  <div style={{ textAlign: 'center', marginTop: '100px' }}>
    <h1>404 - Page Not Found</h1>
    <p>Sorry, you don't have permission to access this page.</p>
  </div>
);

// مكون حماية المسارات المطور
const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null; 

  // حالة 1: المستخدم مش مسجل دخول أصلاً
  if (!user) {
    return <Navigate replace to="/login" />;
  }

  // حالة 2: المستخدم مسجل دخول بس "مش أدمن" (طالب مثلاً) وحاول يدخل لينك أدمن
  if (user.role !== "admin") {
    return <Navigate replace to="/404" />; // يوديه لصفحة 404 بدل اللوج إن
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

        {/* مسار صفحة الـ 404 */}
        <Route path="/404" element={<NotFound />} />
        
        {/* أي مسار غير معروف يروح للـ 404 */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;