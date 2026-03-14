import { NavLink, useNavigate } from "react-router-dom";
import { auth } from "../../firebase"; 
import { signOut } from "firebase/auth";

const StudentSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Failed to logout!");
    }
  };

  return (
    <div style={sidebarStyle}>
      <h2 style={logoStyle}>Student</h2>

      <nav style={{ marginTop: "40px", flex: 1 }}>
        <NavLink to="/student" end style={linkStyle}>
          Dashboard
        </NavLink>

        <NavLink to="/student/courses" style={linkStyle}>
          Courses
        </NavLink>

        <NavLink to="/student/grades" style={linkStyle}>
          Grades
        </NavLink>

        <NavLink to="/student/attendance" style={linkStyle}>
          Attendance
        </NavLink>

        <NavLink to="/student/profile" style={linkStyle}>
          Profile
        </NavLink>

        <NavLink to="/student/reset-password" style={linkStyle}>
          Reset Password
        </NavLink>
      </nav>

      {/* زرار Logout ثابت في الأسفل */}
      <button onClick={handleLogout} style={logoutButtonStyle}>
        Logout
      </button>
    </div>
  );
};

const sidebarStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  width: "230px",
  backgroundColor: "var(--color-primary)",
  color: "white",
  padding: "30px 20px",
  height: "100vh",
  position: "sticky",
  top: 0,
  alignSelf: "flex-start",
  overflowY: "auto",
};

const logoStyle = { margin: 0 };

const linkStyle = ({ isActive }) => ({
  display: "block",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "8px",
  textDecoration: "none",
  color: "white",
  backgroundColor: isActive ? "var(--color-secondary)" : "transparent",
  transition: "background-color 0.2s",
  cursor: "pointer",
});

const logoutButtonStyle = {
  padding: "12px",
  borderRadius: "8px",
  width: "100%",
  border: "none",
  backgroundColor: "#ff4d4f",
  color: "white",
  cursor: "pointer",
  fontSize: "16px",
};

export default StudentSidebar;
