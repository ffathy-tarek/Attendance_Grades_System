import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/* ===== Auth Pages ===== */
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import ForgetPassword from "../pages/ForgetPassword.jsx";
import RequestEmail from "../pages/RequestEmail.jsx";

/* ===== Admin Pages ===== */
import Layout from "../components/layout/Layout.jsx";
import AdminDashboard from "../pages/admin/AdminDashboard.jsx";
import Students from "../pages/admin/Students.jsx";
import Instructors from "../pages/admin/Instructors.jsx";
import Subjects from "../pages/admin/Subjects.jsx";
import PendingAccounts from "../pages/admin/PendingAccounts.jsx";
import SubjectStudents from "../pages/admin/SubjectStudents.jsx";

/* ===== Student Pages ===== */
import StudentLayout from "../components/student/StudentLayout.jsx";
import StudentDashboard from "../pages/student/StudentDashboard.jsx";
import GradesPage from "../pages/student/GradesPage.jsx";
import AttendancePage from "../pages/student/AttendancePage.jsx";
import CoursesPage from "../pages/student/CoursesPage.jsx";
import CourseDetails from "../pages/student/CourseDetails.jsx";
import ProfilePage from "../pages/student/ProfilePage.jsx";
import ResetPassword from "../pages/student/ResetPassword.jsx";
import ReviewsPage from '../pages/student/ReviewsPage';

/* ===== Instructor Pages ===== */
import InstructorLayout from "../components/instructor/InstructorLayout";
import InstructorDashboard from "../pages/instructor/InstructorDashboard";
import InstructorSubjects from "../pages/instructor/InstructorSubjects.jsx";
import Attendance from "../pages/instructor/Attendance";
import Lectures from "../pages/instructor/Lectures";
import Grades from "../pages/instructor/Grades";
import SeeStudents from "../pages/instructor/SeeStudents";
import InstructorProfile from "../pages/instructor/InstructorProfile";
import AttendanceManager from "../pages/instructor/AttendanceManager.jsx";
import ViewReviewsPage from "../pages/instructor/ViewReviewsPage.jsx";

/* ===== 404 Page ===== */
const NotFound = () => (
  <div style={{ textAlign: "center", marginTop: "100px" }}>
    <h1>404 - Page Not Found</h1>
    <p>Sorry, you don't have permission to access this page.</p>
  </div>
);

/* ===== Protected Routes ===== */
const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "admin") return <Navigate replace to="/login" />;
  return children;
};

const ProtectedStudentRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "student") return <Navigate replace to="/login" />;
  return children;
};

const ProtectedInstructorRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: "40px" }}>Loading...</div>;
  if (!user || user.role !== "instructor")
    return <Navigate replace to="/login" />;
  return children;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ===== Auth Routes ===== */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forget-password" element={<ForgetPassword />} />
        <Route path="/request-email" element={<RequestEmail />} />

        {/* ===== Admin Routes ===== */}
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

        {/* ===== Student Routes ===== */}
        <Route
          path="/student"
          element={
            <ProtectedStudentRoute>
              <StudentLayout />
            </ProtectedStudentRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:courseId" element={<CourseDetails />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="reviews" element={<ReviewsPage />} />
        </Route>

        {/* ===== Instructor Routes ===== */}
        <Route
          path="/instructor"
          element={
            <ProtectedInstructorRoute>
              <InstructorLayout />
            </ProtectedInstructorRoute>
          }
        >
          <Route index element={<InstructorDashboard />} />
          <Route path="subjects" element={<InstructorSubjects />} />
          <Route path="lectures" element={<Lectures />} />

          {/* Attendance Routes */}
          <Route path="attendance" element={<Attendance />} />

          {/* المسار الصحيح لإدارة الحضور */}
          <Route path="attendance/:subjectId" element={<AttendanceManager />} />

          {/* مسار إضافي للتوافق */}
          <Route
            path="manage-attendance/:subjectId"
            element={<AttendanceManager />}
          />

          <Route path="grades" element={<Grades />} />
          <Route path="grades/:subjectId" element={<Grades />} />
          <Route path="students" element={<SeeStudents />} />
          <Route path="profile" element={<InstructorProfile />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="reviews" element={<ViewReviewsPage />} />
        </Route>

        {/* ===== 404 ===== */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
