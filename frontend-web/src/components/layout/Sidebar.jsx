import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <div style={sidebarStyle}>
      <h2 style={logoStyle}>Attendance</h2>

      <nav style={{ marginTop: "40px" }}>
        <NavLink to="/admin/dashboard" style={linkStyle}>
          Dashboard
        </NavLink>

        <NavLink to="/admin/students" style={linkStyle}>
          Students
        </NavLink>
      </nav>
    </div>
  );
};

const sidebarStyle = {
  width: "230px",
  backgroundColor: "var(--color-primary)",
  color: "white",
  padding: "30px 20px",
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  position: "sticky",
  top: 0,
};

const logoStyle = {
  margin: 0,
  fontSize: "20px",
  fontWeight: "600",
};

const linkStyle = ({ isActive }) => ({
  display: "block",
  padding: "12px 15px",
  marginBottom: "10px",
  borderRadius: "8px",
  textDecoration: "none",
  color: "white",
  backgroundColor: isActive ? "var(--color-secondary)" : "transparent",
  transition: "0.2s",
});

export default Sidebar;