import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext.jsx";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, instructors: 0, subjects: 0, pending: 0 });

  useEffect(() => {
    // Listeners الإحصائيات (بتاعتك زي ما هي)
    const unsubStudents = onSnapshot(query(collection(db, "users"), where("role", "==", "student")), 
      (snap) => setStats(prev => ({ ...prev, students: snap.size })));

    const unsubInstructors = onSnapshot(query(collection(db, "users"), where("role", "==", "instructor")), 
      (snap) => setStats(prev => ({ ...prev, instructors: snap.size })));

    const unsubPending = onSnapshot(query(collection(db, "emailRequests"), where("status", "==", "pending")), 
      (snap) => setStats(prev => ({ ...prev, pending: snap.size })));

    const unsubSubjects = onSnapshot(collection(db, "courses"), 
      (snap) => setStats(prev => ({ ...prev, subjects: snap.size })));

    return () => {
      unsubStudents();
      unsubInstructors();
      unsubPending();
      unsubSubjects();
    };
  }, []);

  return (
    <div style={{ padding: "30px" }}>
      {/* الجزء اللي اتعدل: مستطيل الترحيب والرول فقط */}
      <div style={welcomeCardStyle}>
        <div style={{ marginBottom: "12px" }}>
          <h2 style={{ margin: 0, color: "#1E3A8A", fontSize: "23px" }}>
            Welcome Back, <strong>{user?.fullName || "Admin"}</strong> 👋
          </h2>
        </div>
        <div>
          <span style={roleBadgeStyle}>
            Role: {"ِAdmin"}
          </span>
        </div>
      </div>

      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p style={{ color: "#64748B", marginTop: "5px" }}>Overview of university system</p>
      </div>

      <div style={statsContainer}>
        <div style={statCard} onClick={() => navigate("/admin/students")}>
          <h3 style={statNumber}>{stats.students}</h3>
          <p style={statLabel}>Total Students</p>
        </div>
        <div style={statCard} onClick={() => navigate("/admin/instructors")}>
          <h3 style={statNumber}>{stats.instructors}</h3>
          <p style={statLabel}>Total Instructors</p>
        </div>
        <div style={statCard} onClick={() => navigate("/admin/subjects")}>
          <h3 style={statNumber}>{stats.subjects}</h3>
          <p style={statLabel}>Total Subjects</p>
        </div>
        <div style={statCard} onClick={() => navigate("/admin/pending-accounts")}>
          <h3 style={{...statNumber, color: stats.pending > 0 ? "#EF4444" : "#1E3A8A"}}>{stats.pending}</h3>
          <p style={statLabel}>Pending Accounts</p>
        </div>
      </div>
    </div>
  );
};

const welcomeCardStyle = {
  backgroundColor: "white",
  padding: "25px 30px",
  borderRadius: "15px",
  marginBottom: "35px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  borderLeft: "6px solid #1E3A8A" 
};

const roleBadgeStyle = {
  backgroundColor: "#F1F5F9",
  color: "#475569",
  padding: "6px 15px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "500"
};

// --- Styles ---
const headerStyle = { marginBottom: "25px" };
const statsContainer = { display: "flex", gap: "20px" };
const statCard = { flex: 1, backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", textAlign: "center", cursor: "pointer" };
const statNumber = { margin: 0, fontSize: "28px", color: "#1E3A8A" };
const statLabel = { marginTop: "8px", color: "#64748B", fontSize: "14px" };

export default AdminDashboard;