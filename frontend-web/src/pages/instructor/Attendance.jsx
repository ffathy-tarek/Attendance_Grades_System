import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import PageLayout from "../../components/student/PageLayout";
import styles from "../../components/student/PageLayout.module.css";

const Attendance = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceDetails, setAttendanceDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // جلب الجلسة النشطة
  useEffect(() => {
    if (!user) return;

    const qSession = query(
      collection(db, "lecture_sessions"),
      where("instructorId", "==", user.uid),
      where("status", "==", "active"),
    );

    const unsubSession = onSnapshot(qSession, async (snap) => {
      if (snap.empty) {
        setActiveSession(null);
        setLoading(false);
        return;
      }
      const sessionData = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setActiveSession(sessionData);
      await fetchEnrolledStudents(sessionData);
    });

    return () => unsubSession();
  }, [user]);

  const fetchEnrolledStudents = async (session) => {
    try {
      const qEnroll = query(
        collection(db, "enrollments"),
        where("courseId", "==", session.courseId),
      );
      const enrollSnap = await getDocs(qEnroll);

      const studentList = [];
      const studentIds = enrollSnap.docs.map((doc) => doc.data().studentId);

      for (const sId of studentIds) {
        const uDoc = await getDoc(doc(db, "users", sId));
        if (uDoc.exists()) {
          studentList.push({
            id: sId,
            fullName: uDoc.data().fullName,
            universityId: uDoc.data().universityId || uDoc.data().code || "N/A",
          });
        }
      }
      setStudents(studentList);

      const qAttend = query(
        collection(db, "attendance"),
        where("sessionId", "==", session.id),
      );

      onSnapshot(qAttend, (aSnap) => {
        const map = {};
        const details = {};
        aSnap.docs.forEach((d) => {
          const data = d.data();
          map[data.studentId] = d.id;
          details[data.studentId] = {
            time: data.timestamp?.toDate
              ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : "...",
            method: data.method || "auto"
          };
        });
        setAttendanceMap(map);
        setAttendanceDetails(details);
        setLoading(false);
      });
    } catch (error) {
      console.error("Error fetching students:", error);
      setLoading(false);
    }
  };

  const toggleAttendance = async (studentId, studentName) => {
    if (!activeSession) return;

    try {
      if (attendanceMap[studentId]) {
        await deleteDoc(doc(db, "attendance", attendanceMap[studentId]));
      } else {
        const attendId = `${activeSession.id}_${studentId}`;
        await setDoc(doc(db, "attendance", attendId), {
          sessionId: activeSession.id,
          studentId: studentId,
          studentName: studentName,
          courseId: activeSession.courseId,
          courseName: activeSession.courseName || "Unknown Course",
          timestamp: serverTimestamp(),
          method: "manual",
          status: "present",
          instructorId: user?.uid,
        });
      }
    } catch (error) {
      console.error("Error toggling attendance:", error);
      alert("Manual update failed. Please check permissions.");
    }
  };

  const filteredStudents = students.filter((s) =>
    s.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <PageLayout title="Attendance Management" subtitle="Loading...">
        <div className={styles.loading}>Loading...</div>
      </PageLayout>
    );
  }

  if (!activeSession) {
    return (
      <PageLayout 
        title="Attendance Management" 
        subtitle="Manage student attendance"
        actions={
          <button 
            className={styles.courseButton}
            onClick={() => navigate('/instructor/lectures')}
            style={{ width: 'auto' }}
          >
            🎬 Go to Lectures
          </button>
        }
      >
        <div className={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3>No Active Lecture</h3>
          <p>Start a session from the Lectures page to manage attendance records.</p>
        </div>
      </PageLayout>
    );
  }

  const presentCount = Object.keys(attendanceMap).length;
  const totalStudents = students.length;
  const attendanceRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;

  return (
    <PageLayout
      title="Instructor Control Panel"
      subtitle={activeSession.courseName}
      actions={
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={styles.exportButton}
            onClick={() => {
              const csvData = students.map(s => ({
                Name: s.fullName,
                ID: s.universityId,
                Status: attendanceMap[s.id] ? 'Present' : 'Absent',
                Method: attendanceDetails[s.id]?.method || '-',
                Time: attendanceDetails[s.id]?.time || '-'
              }));
              console.log('CSV Data:', csvData);
              alert('Export to console - Check developer console');
            }}
          >
            📥 Export CSV
          </button>
          <button 
            className={styles.courseButton}
            onClick={() => navigate('/instructor/lectures')}
            style={{ width: 'auto', padding: '10px 20px' }}
          >
            🎬 Back to Lectures
          </button>
        </div>
      }
    >
      {/* Statistics Cards */}
      <div className={styles.summaryCards} style={{ marginBottom: '24px' }}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ backgroundColor: '#3b82f620' }}>👥</div>
          <div>
            <span className={styles.summaryLabel}>Total Students</span>
            <span className={styles.summaryValue}>{totalStudents}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ backgroundColor: '#10b98120' }}>✅</div>
          <div>
            <span className={styles.summaryLabel}>Present</span>
            <span className={styles.summaryValue} style={{ color: '#10b981' }}>{presentCount}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ backgroundColor: '#ef444420' }}>❌</div>
          <div>
            <span className={styles.summaryLabel}>Absent</span>
            <span className={styles.summaryValue} style={{ color: '#ef4444' }}>{totalStudents - presentCount}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ backgroundColor: '#f9731620' }}>📊</div>
          <div>
            <span className={styles.summaryLabel}>Attendance Rate</span>
            <span className={styles.summaryValue}>{attendanceRate}%</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px',
          gap: '10px'
        }}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search by student name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              background: 'transparent'
            }}
          />
        </div>
      </div>

      {/* Students List */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Status</th>
              <th>Time</th>
              <th>Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              const isPresent = !!attendanceMap[student.id];
              const detail = attendanceDetails[student.id];
              
              return (
                <tr key={student.id} style={{
                  borderLeft: isPresent ? '6px solid #22c55e' : '6px solid #ef4444'
                }}>
                  <td style={{ fontWeight: '500' }}>{student.fullName}</td>
                  <td>{student.universityId}</td>
                  <td>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: isPresent ? '#dcfce7' : '#fee2e2',
                      color: isPresent ? '#166534' : '#991b1b'
                    }}>
                      {isPresent ? 'Present' : 'Absent'}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>
                    {detail?.time || '-'}
                  </td>
                  <td>
                    {isPresent && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '500',
                        background: detail?.method === 'manual' ? '#fef3c7' : '#e0f2fe',
                        color: detail?.method === 'manual' ? '#92400e' : '#0369a1'
                      }}>
                        {detail?.method === 'manual' ? '🛡️ Manual' : '📱 Auto'}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => !isPresent && toggleAttendance(student.id, student.fullName)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          background: isPresent ? '#22c55e' : '#f1f5f9',
                          color: isPresent ? 'white' : '#94a3b8',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        P
                      </button>
                      <button
                        onClick={() => isPresent && toggleAttendance(student.id, student.fullName)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          background: !isPresent ? '#ef4444' : '#f1f5f9',
                          color: !isPresent ? 'white' : '#94a3b8',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        A
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        fontSize: '14px',
        color: '#475569'
      }}>
        <p style={{ fontWeight: '600', marginBottom: '8px' }}>📌 How to use:</p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Click <strong>P</strong> to mark student as <strong style={{ color: '#22c55e' }}>Present</strong></li>
          <li>Click <strong>A</strong> to mark student as <strong style={{ color: '#ef4444' }}>Absent</strong></li>
          <li>Students can also register through the mobile app during active session</li>
          <li>Manual entries are marked with 🛡️ badge</li>
          <li>All changes are saved immediately to the database</li>
        </ul>
      </div>
    </PageLayout>
  );
};

export default Attendance;
