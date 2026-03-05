import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "30px" }}>

      {/* Admin Info */}
      <div style={adminInfoCard}>
        <p style={{ margin: 0 }}>
          Welcome Back, <strong>Admin</strong> 👋
        </p>
        <small style={{ color: "#64748B" }}>
          Role: System Administrator
        </small>
      </div>

      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <p style={{ color: "#64748B", marginTop: "5px" }}>
            Overview of university system
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={statsContainer}>
        <div style={statCard} onClick={() => navigate("/admin/students")}>
          <h3 style={statNumber}>120</h3>
          <p style={statLabel}>Total Students</p>
        </div>

        <div style={statCard} onClick={() => navigate("/admin/instructors")}>
          <h3 style={statNumber}>15</h3>
          <p style={statLabel}>Total Instructors</p>
        </div>

        <div style={statCard} onClick={() => navigate("/admin/subjects")}>
          <h3 style={statNumber}>8</h3>
          <p style={statLabel}>Total Subjects</p>
        </div>

        <div style={statCard} onClick={() => navigate("/admin/pending-accounts")}>
          <h3 style={statNumber}>5</h3>
          <p style={statLabel}>Pending Accounts</p>
        </div>
      </div>

    </div>
  );
};

/* ===== Styles ===== */

const adminInfoCard = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "20px",
  marginBottom: "30px",
  boxShadow: "0 5px 15px rgba(0,0,0,0.05)",
};

const headerStyle = {
  marginBottom: "25px",
};

const statsContainer = {
  display: "flex",
  gap: "20px",
};

const statCard = {
  flex: 1,
  backgroundColor: "white",
  padding: "25px",
  borderRadius: "12px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  textAlign: "center",
  cursor: "pointer",
};

const statNumber = {
  margin: 0,
  fontSize: "28px",
  color: "#1E3A8A",
};

const statLabel = {
  marginTop: "8px",
  color: "#64748B",
  fontSize: "14px",
};

export default AdminDashboard;