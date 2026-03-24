import React, { useState, useEffect } from "react";
import { db } from "../../firebase.js";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";
import PageLayout from "../../components/student/PageLayout";
import styles from "../../components/student/PageLayout.module.css";

function InstructorDashboard() {
  const [studentsCount, setStudentsCount] = useState(0);
  const [lecturesCount, setLecturesCount] = useState(0);
  const [averageAttendance, setAverageAttendance] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentSubjects, setRecentSubjects] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        // 1. جلب المواد اللي بيدرسها من courses
        const coursesQuery = query(
          collection(db, "courses"),
          where("instructorIds", "array-contains", user.uid)
        );
        const coursesSnap = await getDocs(coursesQuery);
        setSubjectsCount(coursesSnap.size);
        
        // حفظ المواد الحديثة
        const subjectsList = await Promise.all(
          coursesSnap.docs.map(async (doc) => {
            const courseData = { id: doc.id, ...doc.data() };
            
            // جلب عدد الطلاب من enrollments
            const enrollmentsQuery = query(
              collection(db, "enrollments"),
              where("courseId", "==", doc.id)
            );
            const enrollmentsSnap = await getDocs(enrollmentsQuery);
            
            return {
              ...courseData,
              studentsCount: enrollmentsSnap.size
            };
          })
        );
        setRecentSubjects(subjectsList.slice(0, 4));

        // 2. جلب كل الطلاب المسجلين في المواد دي من enrollments
        let totalStudents = 0;
        for (const course of coursesSnap.docs) {
          const enrollmentsQuery = query(
            collection(db, "enrollments"),
            where("courseId", "==", course.id)
          );
          const enrollmentsSnap = await getDocs(enrollmentsQuery);
          totalStudents += enrollmentsSnap.size;
        }
        setStudentsCount(totalStudents);

        // 3. جلب المحاضرات من lecture_sessions
        const lecturesQuery = query(
          collection(db, "lecture_sessions"),
          where("instructorId", "==", user.uid)
        );
        const lecturesSnap = await getDocs(lecturesQuery);
        setLecturesCount(lecturesSnap.size);

        // 4. جلب سجلات الحضور وحساب المتوسط
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("instructorId", "==", user.uid)
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        
        if (attendanceSnap.size > 0) {
          let totalAttendees = 0;
          
          
          attendanceSnap.forEach(doc => {
            const data = doc.data();
            const attendeesCount = data.attendees?.length || 0;
            totalAttendees += attendeesCount;
            
            // جلب عدد الطلاب في هذه المادة
            // يمكن تخزينه في session لحساب النسبة
          });
          
          // حساب متوسط الحضور (تقديري)
          const avg = (totalAttendees / (attendanceSnap.size * 10)).toFixed(1);
          setAverageAttendance(avg);
        }

        // 5. جلب سجلات الحضور للإنذارات
        const allAttendanceQuery = query(
          collection(db, "attendance"),
          where("instructorId", "==", user.uid)
        );
        const allAttendanceSnap = await getDocs(allAttendanceQuery);
        setAttendanceRecords(allAttendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.uid]);

  if (loading) {
    return (
      <PageLayout title="Instructor Dashboard" subtitle="Loading your data...">
        <div className={styles.loading}>Loading Dashboard...</div>
      </PageLayout>
    );
  }

  const stats = [
    { label: "My Subjects", value: subjectsCount, icon: "📚", color: "#3b82f6" },
    { label: "Total Students", value: studentsCount, icon: "👥", color: "#10b981" },
    { label: "Lectures", value: lecturesCount, icon: "📝", color: "#f59e0b" },
    { label: "Avg Attendance", value: `${averageAttendance}%`, icon: "📊", color: "#8b5cf6" },
  ];

  return (
    <PageLayout 
      title="Instructor Dashboard" 
      subtitle={`Welcome back! Here's your teaching overview`}
    >
      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        {stats.map((stat, index) => (
          <div key={index} className={styles.summaryCard}>
            <div className={styles.summaryIcon} style={{ backgroundColor: `${stat.color}20` }}>
              {stat.icon}
            </div>
            <div>
              <span className={styles.summaryLabel}>{stat.label}</span>
              <span className={styles.summaryValue}>{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Subjects */}
      <div className={styles.grid} style={{ marginTop: "32px" }}>
        <div className={styles.card}>
          <h3>📖 Recent Subjects</h3>
          {recentSubjects.length === 0 ? (
            <p style={{ color: "#64748b", marginTop: "16px" }}>No subjects assigned yet</p>
          ) : (
            <ul style={{ marginTop: "16px", listStyle: "none", padding: 0 }}>
              {recentSubjects.map((subject) => (
                <li key={subject.id} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <strong>{subject.code}</strong> - {subject.name}
                  <br />
                  <small style={{ color: "#64748b" }}>
                    {subject.studentsCount || 0} students
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.card}>
          <h3>⚠️ Attendance Alerts</h3>
          <div style={{ marginTop: "16px" }}>
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span>Overall Attendance Rate</span>
                <span className={styles.progressPercent}>{averageAttendance}%</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ 
                    width: `${averageAttendance}%`,
                    backgroundColor: averageAttendance >= 75 ? "#10b981" : averageAttendance >= 50 ? "#f59e0b" : "#ef4444"
                  }}
                />
              </div>
            </div>
            <p style={{ marginTop: "16px", fontSize: "14px", color: "#64748b" }}>
              Students with attendance below 75% will receive warnings
            </p>
            {attendanceRecords.length === 0 && (
              <p style={{ marginTop: "16px", fontSize: "14px", color: "#f97316" }}>
                No attendance records yet. Start a lecture to track attendance.
              </p>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default InstructorDashboard;