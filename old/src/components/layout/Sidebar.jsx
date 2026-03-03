import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div style={{
      width: "220px",
      background: "#1E3A8A",
      color: "white",
      padding: "20px"
    }}>
      <h2>System</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li><Link to="/dashboard" style={{ color: "white" }}>Dashboard</Link></li>
        <li><Link to="/students" style={{ color: "white" }}>Students</Link></li>
        <li><Link to="/attendance" style={{ color: "white" }}>Attendance</Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;