import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../components/student/PageLayout";
import styles from "../../components/student/PageLayout.module.css";

const AttendanceManager = () => {
  const { subjectId } = useParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceDetails, setAttendanceDetails] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // جلب المادة
  useEffect(() => {
    const fetchCourse = async () => {
      if (!subjectId) return;
      const courseDoc = await getDoc(doc(db, "courses", subjectId));
      if (courseDoc.exists()) {
        setCourse(courseDoc.data());
      }
    };
    fetchCourse();
  }, [subjectId]);

  // جلب الجلسة النشطة
  useEffect(() => {
    if (!subjectId) return;

    const qSession = query(
      collection(db, "lecture_sessions"),
      where("courseId", "==", subjectId),
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
  }, [subjectId]);

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

      const unsubscribeAttend = onSnapshot(qAttend, (aSnap) => {
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

      return () => unsubscribeAttend();
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
          courseName: activeSession.courseName || course?.name || "Unknown Course",
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
        subtitle={course ? `Course: ${course.name}` : "Loading..."}
      >
        <div className={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3>No Active Lecture Session</h3>
          <p>Please start a lecture session from the Lectures page first.</p>
          <button 
            className={styles.courseButton}
            onClick={() => window.location.href = '/instructor/lectures'}
            style={{ marginTop: '16px' }}
          >
            🎬 Go to Lectures
          </button>
        </div>
      </PageLayout>
    );
  }

  const presentCount = Object.keys(attendanceMap).length;
  const totalStudents = students.length;
  const attendanceRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;

  return (
    <PageLayout
      title="Attendance Management"
      subtitle={course ? `Course: ${course.name}` : "Loading..."}
      actions={
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={styles.exportButton}
            onClick={() => window.print()}
          >
            📥 Export PDF Report
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
        <input
          type="text"
          placeholder="Search by student name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
          }}
        />
      </div>

      {/* Students Table */}
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
                <tr key={student.id}>
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
                        onClick={() => toggleAttendance(student.id, student.fullName)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isPresent ? '#fee2e2' : '#dcfce7',
                          color: isPresent ? '#ef4444' : '#15803d',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        {isPresent ? 'Mark Absent' : 'Mark Present'}
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
    </PageLayout>
  );
};

export default AttendanceManager;