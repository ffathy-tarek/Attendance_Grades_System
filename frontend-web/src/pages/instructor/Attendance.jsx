import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import PageLayout from "../../components/student/PageLayout";
import styles from "../../components/student/PageLayout.module.css";

const Attendance = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendanceSession, setAttendanceSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [duration, setDuration] = useState(10);
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [lectureSessions, setLectureSessions] = useState([]);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [coursesList, setCoursesList] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // جلب المواد الخاصة بالمدرب لو مفيش subjectId
  useEffect(() => {
    const fetchCourses = async () => {
      if (subjectId) {
        setLoadingCourses(false);
        return;
      }

      try {
        const q = query(
          collection(db, "courses"),
          where("instructorIds", "array-contains", user?.uid),
        );
        const coursesSnap = await getDocs(q);
        const courses = await Promise.all(
          coursesSnap.docs.map(async (doc) => {
            const enrollmentsQuery = query(
              collection(db, "enrollments"),
              where("courseId", "==", doc.id),
            );
            const enrollmentsSnap = await getDocs(enrollmentsQuery);

            return {
              id: doc.id,
              ...doc.data(),
              studentsCount: enrollmentsSnap.size,
            };
          }),
        );
        setCoursesList(courses);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [subjectId, user?.uid]);

  // جلب بيانات المادة والطلاب
  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId) return;

      try {
        const courseDoc = await getDoc(doc(db, "courses", subjectId));
        if (courseDoc.exists()) {
          setCourse({ id: courseDoc.id, ...courseDoc.data() });
        } else {
          console.log("Course not found");
          return;
        }

        const enrollmentsQuery = query(
          collection(db, "enrollments"),
          where("courseId", "==", subjectId),
        );
        const enrollmentsSnap = await getDocs(enrollmentsQuery);

        if (enrollmentsSnap.size > 0) {
          const studentsList = [];
          for (const enrollment of enrollmentsSnap.docs) {
            const enrollmentData = enrollment.data();
            const studentDoc = await getDoc(
              doc(db, "users", enrollmentData.studentId),
            );
            if (studentDoc.exists()) {
              studentsList.push({
                id: studentDoc.id,
                ...studentDoc.data(),
                enrollmentId: enrollment.id,
              });
            }
          }
          setStudents(studentsList);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [subjectId]);

  // جلب جلسات المحاضرات لهذه المادة
  useEffect(() => {
    if (!subjectId) return;

    const q = query(
      collection(db, "lecture_sessions"),
      where("courseId", "==", subjectId),
      where("status", "==", "active"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lectures = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLectureSessions(lectures);

      if (lectures.length > 0 && !selectedLecture) {
        setSelectedLecture(lectures[0]);
      }
    });

    return () => unsubscribe();
  }, [subjectId]);

  // الاستماع لجلسة الحضور النشطة
  useEffect(() => {
    if (!selectedLecture) return;

    const q = query(
      collection(db, "attendance"),
      where("lectureId", "==", selectedLecture.id),
      where("status", "==", "active"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const session = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setAttendanceSession(session);
        setAttendees(session.attendees || []);

        const endTime = session.endTime.toDate();
        const now = new Date();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(remaining);
      } else {
        setAttendanceSession(null);
        setAttendees([]);
        setTimeLeft(null);
      }
    });

    return () => unsubscribe();
  }, [selectedLecture]);

  // Timer
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const startAttendance = async () => {
    if (!selectedLecture) {
      alert("Please select a lecture session first");
      return;
    }

    setLoading(true);
    try {
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + duration);

      const sessionData = {
        courseId: subjectId,
        lectureId: selectedLecture.id,
        instructorId: user.uid,
        startTime: Timestamp.now(),
        endTime: Timestamp.fromDate(endTime),
        duration,
        status: "active",
        attendees: [],
      };

      await addDoc(collection(db, "attendance"), sessionData);
    } catch (error) {
      console.error("Error starting attendance:", error);
      alert("Failed to start attendance session");
    } finally {
      setLoading(false);
    }
  };

  const closeAttendance = async () => {
    if (!attendanceSession) return;

    try {
      await updateDoc(doc(db, "attendance", attendanceSession.id), {
        status: "closed",
      });
    } catch (error) {
      console.error("Error closing attendance:", error);
    }
  };

  const toggleStudentAttendance = async (studentId, isCurrentlyPresent) => {
    if (!attendanceSession) {
      alert("No active attendance session");
      return;
    }

    try {
      const attendanceRef = doc(db, "attendance", attendanceSession.id);

      if (!isCurrentlyPresent) {
        await updateDoc(attendanceRef, {
          attendees: arrayUnion(studentId),
        });
      } else {
        await updateDoc(attendanceRef, {
          attendees: arrayRemove(studentId),
        });
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      alert("Failed to update attendance");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const attendancePercentage =
    students.length > 0
      ? ((attendees.length / students.length) * 100).toFixed(1)
      : 0;

  // عرض قائمة المواد لو مفيش subjectId
  if (!subjectId) {
    if (loadingCourses) {
      return (
        <PageLayout title="Attendance Management" subtitle="Loading...">
          <div className={styles.loading}>Loading courses...</div>
        </PageLayout>
      );
    }

    return (
      <PageLayout
        title="Attendance Management"
        subtitle="Select a course to manage attendance"
      >
        <div className={styles.coursesGrid}>
          {coursesList.map((course) => (
            <div key={course.id} className={styles.courseCard}>
              <div className={styles.courseHeader}>
                <span className={styles.courseCode}>{course.code}</span>
                <span className={styles.courseHours}>
                  {course.creditHours || 3} Credits
                </span>
              </div>
              <div className={styles.courseBody}>
                <h3 className={styles.courseName}>{course.name}</h3>
                <div className={styles.courseInstructor}>
                  👥 {course.studentsCount} Students
                </div>
                {/* تم تعديل هذا الزرار ليوجه إلى صفحة الـ Manager بدلاً من إعادة تحميل نفس الصفحة */}
                <button
                  className={styles.courseButton}
                  onClick={() =>
                    navigate(`/instructor/attendance/${course.id}`)
                  }
                >
                  📝 Manage Attendance
                </button>
              </div>
            </div>
          ))}

          {coursesList.length === 0 && (
            <div className={styles.emptyState}>
              <h3>No Courses Found</h3>
              <p>You haven't been assigned to any courses yet</p>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  // عرض حالة التحميل
  if (!course) {
    return (
      <PageLayout title="Attendance Management" subtitle="Loading...">
        <div className={styles.loading}>Loading course data...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Attendance Management"
      subtitle={`${course.name} - Manage student attendance`}
      actions={<button className={styles.exportButton}>📥 Export CSV</button>}
    >
      {/* Select Lecture */}
      {lectureSessions.length === 0 && (
        <div
          className={styles.card}
          style={{ marginBottom: "24px", background: "#fef3c7" }}
        >
          <p>⚠️ No active lecture session. Please start a lecture first.</p>
          <button
            className={styles.courseButton}
            onClick={() => navigate(`/instructor/lectures/start/${subjectId}`)}
            style={{ marginTop: "12px", width: "auto" }}
          >
            Start Lecture
          </button>
        </div>
      )}

      {lectureSessions.length > 0 && !selectedLecture && (
        <div className={styles.card} style={{ marginBottom: "24px" }}>
          <h3>Select Active Lecture</h3>
          <div
            className={styles.grid}
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              marginTop: "16px",
            }}
          >
            {lectureSessions.map((lecture) => (
              <button
                key={lecture.id}
                onClick={() => setSelectedLecture(lecture)}
                className={styles.changePhotoButton}
                style={{ padding: "12px" }}
              >
                {lecture.startTime?.toDate()
                  ? new Date(lecture.startTime.toDate()).toLocaleTimeString()
                  : "Lecture"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Controls */}
      {selectedLecture && (
        <div className={styles.card} style={{ marginBottom: "24px" }}>
          <h2>Attendance Session</h2>
          <p style={{ color: "#64748b", marginBottom: "16px" }}>
            Lecture:{" "}
            {selectedLecture.startTime?.toDate()
              ? new Date(selectedLecture.startTime.toDate()).toLocaleString()
              : "Active"}
          </p>

          {!attendanceSession ? (
            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div>
                <label className={styles.summaryLabel}>
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className={styles.input}
                  style={{ width: "100px" }}
                />
              </div>
              <button
                onClick={startAttendance}
                disabled={loading}
                className={styles.saveButton}
              >
                {loading ? "Starting..." : "Start Attendance Session"}
              </button>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                <div>
                  <span className={styles.summaryLabel}>Time Remaining: </span>
                  <span
                    style={{
                      fontSize: "28px",
                      fontWeight: "bold",
                      color: "#f97316",
                    }}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <button
                  onClick={closeAttendance}
                  className={styles.cancelButton}
                  style={{
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                  }}
                >
                  Close Session Early
                </button>
              </div>

              <div className={styles.progressBar} style={{ height: "8px" }}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${(timeLeft / (duration * 60)) * 100}%`,
                    backgroundColor: "#f97316",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      <div className={styles.summaryCards} style={{ marginBottom: "24px" }}>
        <div className={styles.summaryCard}>
          <div
            className={styles.summaryIcon}
            style={{ backgroundColor: "#3b82f620" }}
          >
            👥
          </div>
          <div>
            <span className={styles.summaryLabel}>Total Students</span>
            <span className={styles.summaryValue}>{students.length}</span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div
            className={styles.summaryIcon}
            style={{ backgroundColor: "#10b98120" }}
          >
            ✅
          </div>
          <div>
            <span className={styles.summaryLabel}>Present</span>
            <span className={styles.summaryValue} style={{ color: "#10b981" }}>
              {attendees.length}
            </span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div
            className={styles.summaryIcon}
            style={{ backgroundColor: "#f9731620" }}
          >
            📊
          </div>
          <div>
            <span className={styles.summaryLabel}>Attendance Rate</span>
            <span className={styles.summaryValue}>{attendancePercentage}%</span>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student Code</th>
              <th>Status</th>
              {attendanceSession && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const isPresent = attendees.includes(student.id);

              return (
                <tr key={student.id}>
                  <td style={{ fontWeight: "500" }}>
                    {student.fullName || student.name}
                  </td>
                  <td>
                    {student.code ||
                      student.uniqueCode ||
                      student.id.slice(0, 8)}
                  </td>
                  <td>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        isPresent
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isPresent ? "✓ Present" : "✗ Absent"}
                    </span>
                  </td>
                  {attendanceSession && (
                    <td>
                      <button
                        onClick={() =>
                          toggleStudentAttendance(student.id, isPresent)
                        }
                        style={{
                          padding: "6px 16px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "500",
                          cursor: "pointer",
                          border: "none",
                          background: isPresent ? "#ef4444" : "#10b981",
                          color: "white",
                          transition: "all 0.2s",
                        }}
                      >
                        {isPresent ? "Mark Absent" : "Mark Present"}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}

            {students.length === 0 && (
              <tr>
                <td
                  colSpan={attendanceSession ? "4" : "3"}
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#64748b",
                  }}
                >
                  No students enrolled in this course
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      {attendanceSession && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "#e0f2fe",
            borderRadius: "12px",
            fontSize: "14px",
            color: "#0369a1",
          }}
        >
          <p>
            📝 <strong>How to use:</strong>
          </p>
          <p>
            • Click on <strong>"Mark Present"</strong> to add a student to
            attendance manually.
          </p>
          <p>
            • Click on <strong>"Mark Absent"</strong> to remove a student from
            attendance manually.
          </p>
          <p>
            • Students can still register attendance through the mobile app
            during the active session.
          </p>
          <p>• All changes are saved immediately to the database.</p>
        </div>
      )}
    </PageLayout>
  );
};

export default Attendance;
