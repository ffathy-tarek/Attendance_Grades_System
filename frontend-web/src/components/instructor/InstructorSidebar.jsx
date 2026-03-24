import { NavLink, useNavigate } from "react-router-dom";
import { auth } from "../../firebase"; 
import { signOut } from "firebase/auth";

const InstructorSidebar = () => {
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
      <h2 style={logoStyle}>Instructor</h2>

      <nav style={{ marginTop: "40px", flex: 1 }}>
        <NavLink to="/instructor" end style={linkStyle}>
          Dashboard
        </NavLink>

        <NavLink to="/instructor/subjects" style={linkStyle}>
          Subjects
        </NavLink>

        <NavLink to="/instructor/lectures" style={linkStyle}>
          Lectures
        </NavLink>

        <NavLink to="/instructor/attendance" style={linkStyle}>
          Attendance
        </NavLink>

        <NavLink to="/instructor/grades" style={linkStyle}>
          Grades
        </NavLink>

        <NavLink to="/instructor/profile" style={linkStyle}>
          Profile
        </NavLink>

        <NavLink to="/instructor/reset-password" style={linkStyle}>
          Reset Password
        </NavLink>
      </nav>

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

export default InstructorSidebar;