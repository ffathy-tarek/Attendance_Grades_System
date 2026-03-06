import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../firebase"; // تأكد من المسار

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // State للأرقام
  const [stats, setStats] = useState({
    students: 0,
    instructors: 0,
    subjects: 0,
    pending: 0
  });

  useEffect(() => {
    // 1. حساب الطلاب (role == student)
    const qStudents = query(collection(db, "users"), where("role", "==", "student"));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStats(prev => ({ ...prev, students: snap.size }));
    });

    // 2. حساب المدرسين (role == instructor)
    const qInstructors = query(collection(db, "users"), where("role", "==", "instructor"));
    const unsubInstructors = onSnapshot(qInstructors, (snap) => {
      setStats(prev => ({ ...prev, instructors: snap.size }));
    });

    // 3. حساب الطلبات المعلقة (status == pending)
    const qPending = query(collection(db, "emailRequests"), where("status", "==", "pending"));
    const unsubPending = onSnapshot(qPending, (snap) => {
      setStats(prev => ({ ...prev, pending: snap.size }));
    });

    // 4. حساب المواد (كولكشن courses)
    const unsubSubjects = onSnapshot(collection(db, "courses"), (snap) => {
      setStats(prev => ({ ...prev, subjects: snap.size }));
    });

    return () => {
      unsubStudents();
      unsubInstructors();
      unsubPending();
      unsubSubjects();
    };
  }, []);

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
          <h3 style={{...statNumber, color: stats.pending > 0 ? "#EF4444" : "#1E3A8A"}}>
            {stats.pending}
          </h3>
          <p style={statLabel}>Pending Accounts</p>
        </div>
      </div>
    </div>
  );
};

/* ===== Styles (نفس الستايلز بتاعتك) ===== */
const adminInfoCard = { backgroundColor: "white", padding: "20px", borderRadius: "20px", marginBottom: "30px", boxShadow: "0 5px 15px rgba(0,0,0,0.05)" };
const headerStyle = { marginBottom: "25px" };
const statsContainer = { display: "flex", gap: "20px" };
const statCard = { flex: 1, backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", textAlign: "center", cursor: "pointer", transition: "0.3s" };
const statNumber = { margin: 0, fontSize: "28px", color: "#1E3A8A" };
const statLabel = { marginTop: "8px", color: "#64748B", fontSize: "14px" };

export default AdminDashboard;