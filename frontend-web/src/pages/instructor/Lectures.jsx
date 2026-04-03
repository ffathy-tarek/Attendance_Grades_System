import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import PageLayout from "../../components/student/PageLayout";
import styles from "../../components/student/PageLayout.module.css";

const Lectures = () => {
  const { user } = useAuth();
  const { subjectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(2); // hours
  const [attendanceDuration, setAttendanceDuration] = useState(10);
  const [attendanceActive, setAttendanceActive] = useState(false);
  const [attendanceTimeLeft, setAttendanceTimeLeft] = useState(null);
  const [currentAttendanceId, setCurrentAttendanceId] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchCourses = async () => {
      try {
        const coursesQuery = query(
          collection(db, "courses"),
          where("instructorIds", "array-contains", user.uid),
        );
        const coursesSnap = await getDocs(coursesQuery);
        setCourses(
          coursesSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
        );
      } catch (e) {
        console.error(e);
      }
    };

    fetchCourses();

    const qHistory = query(
      collection(db, "lecture_sessions"),
      where("instructorId", "==", user.uid),
      orderBy("startTime", "desc"),
    );

    const unsubscribe = onSnapshot(qHistory, async (snapshot) => {
      const docs = await Promise.all(
        snapshot.docs.map(async (lectureDoc) => {
          const attendanceQuery = query(
            collection(db, "attendance"),
            where("lectureId", "==", lectureDoc.id),
          );
          const attendanceSnap = await getDocs(attendanceQuery);

          return {
            id: lectureDoc.id,
            ...lectureDoc.data(),
            attendanceCount: attendanceSnap.size,
          };
        }),
      );

      setHistory(docs);

      const active = docs.find((d) => d.status === "active");
      setActiveSession(active || null);

      if (active && active.currentAttendanceId) {
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("lectureId", "==", active.id),
          where("status", "==", "active"),
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        if (!attendanceSnap.empty) {
          setAttendanceActive(true);
          setCurrentAttendanceId(attendanceSnap.docs[0].id);
        }
      } else {
        setAttendanceActive(false);
        setCurrentAttendanceId(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ==================== [التعديل 1: Timer logic] ====================
  useEffect(() => {
    let timer;

    const updateTimer = () => {
      // بنحسب الوقت المتبقي بناءً على الفرق بين وقت النهاية المحفوظ والآن
      if (attendanceActive && activeSession?.endTime) {
        const end = activeSession.endTime.toDate().getTime();
        const now = new Date().getTime();
        const diff = Math.floor((end - now) / 1000);

        if (diff > 0) {
          setAttendanceTimeLeft(diff);
        } else {
          setAttendanceTimeLeft(0);
          setAttendanceActive(false);
          clearInterval(timer);
        }
      }
    };

    if (attendanceActive) {
      updateTimer(); // تشغيل فوري للحساب
      timer = setInterval(updateTimer, 1000);
    } else {
      setAttendanceTimeLeft(null);
    }

    return () => clearInterval(timer);
  }, [attendanceActive, activeSession]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Loading...";
    return timestamp.toDate().toLocaleDateString("en-GB");
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startLecture = async (course) => {
    setLoading(true);

    try {
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + selectedDuration);

      await addDoc(collection(db, "lecture_sessions"), {
        courseId: course.id,
        courseName: course.name,
        instructorId: user.uid,
        startTime: Timestamp.now(),
        endTime: Timestamp.fromDate(endTime),
        duration: selectedDuration,
        status: "active",
      });

      setShowCoursePicker(false);
    } catch (error) {
      console.error(error);
      alert("Error starting lecture session");
    }

    setLoading(false);
  };

  const endLecture = async () => {
    if (!activeSession) return;

    try {
      await updateDoc(doc(db, "lecture_sessions", activeSession.id), {
        status: "ended",
        endTime: Timestamp.now(),
      });
      setAttendanceActive(false);
      setCurrentAttendanceId(null);
      setAttendanceTimeLeft(null);
    } catch (error) {
      console.error(error);
    }
  };

  // ==================== [التعديل 2: startAttendance] ====================
  const startAttendance = async () => {
    if (!activeSession) return;

    try {
      const now = new Date();
      // حساب وقت النهاية الفعلي بناءً على الدقائق المحددة
      const endTimeDate = new Date(now.getTime() + attendanceDuration * 60000);

      const attendanceRef = await addDoc(collection(db, "attendance"), {
        lectureId: activeSession.id,
        courseId: activeSession.courseId,
        instructorId: user.uid,
        startTime: Timestamp.fromDate(now),
        endTime: Timestamp.fromDate(endTimeDate), // تخزين وقت النهاية كـ Timestamp
        duration: attendanceDuration,
        status: "active",
        attendees: [],
      });

      await updateDoc(doc(db, "lecture_sessions", activeSession.id), {
        currentAttendanceId: attendanceRef.id,
        // بنخزن وقت النهاية في جلسة المحاضرة كمان عشان الـ useEffect يلقطها فوراً
        endTime: Timestamp.fromDate(endTimeDate),
      });

      setAttendanceActive(true);
      setCurrentAttendanceId(attendanceRef.id);
      setAttendanceTimeLeft(attendanceDuration * 60);

      setTimeout(() => {
        navigate(`/instructor/attendance/${activeSession.courseId}`);
      }, 800);
    } catch (error) {
      console.error(error);
      alert("Error starting attendance session");
    }
  };

  const closeAttendance = async () => {
    if (!currentAttendanceId) return;

    try {
      await updateDoc(doc(db, "attendance", currentAttendanceId), {
        status: "closed",
        closedEarly: true,
      });

      await updateDoc(doc(db, "lecture_sessions", activeSession.id), {
        currentAttendanceId: null,
      });

      setAttendanceActive(false);
      setCurrentAttendanceId(null);
      setAttendanceTimeLeft(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <PageLayout
      title="Lectures Management"
      subtitle="Start and manage your lecture sessions"
      actions={
        !activeSession && (
          <button
            className={styles.saveButton}
            onClick={() => setShowCoursePicker(true)}
          >
            + Start New Lecture
          </button>
        )
      }
    >
      {/* Active Lecture */}
      {activeSession && (
        <div
          className={styles.card}
          style={{
            marginBottom: "24px",
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            color: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h3 style={{ fontSize: "20px", marginBottom: "8px" }}>
                🔴 Live Session
              </h3>
              <p>
                <strong>{activeSession.courseName}</strong>
              </p>
              <p>Started: {formatDate(activeSession.startTime)}</p>
              <p>Duration: {activeSession.duration} hours</p>
            </div>
            <div>
              {!attendanceActive ? (
                <button
                  onClick={startAttendance}
                  className={styles.courseButton}
                  style={{
                    background: "white",
                    color: "#16a34a",
                    marginBottom: "8px",
                  }}
                >
                  Start Attendance
                </button>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      background: "white",
                      color: "#16a34a",
                      padding: "8px 16px",
                      borderRadius: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    ⏱️ {formatTime(attendanceTimeLeft)}
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
                    Close Early
                  </button>
                </div>
              )}
              <button
                onClick={endLecture}
                className={styles.cancelButton}
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  marginTop: "8px",
                  width: "100%",
                }}
              >
                End Lecture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings for starting attendance */}
      {activeSession && !attendanceActive && (
        <div className={styles.card} style={{ marginBottom: "24px" }}>
          <h3>Attendance Settings</h3>
          <div
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "flex-end",
              flexWrap: "wrap",
              marginTop: "16px",
            }}
          >
            <div>
              <label className={styles.summaryLabel}>Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={attendanceDuration}
                onChange={(e) => setAttendanceDuration(Number(e.target.value))}
                className={styles.input}
                style={{ width: "100px" }}
              />
            </div>
            <button onClick={startAttendance} className={styles.saveButton}>
              Start Attendance Session
            </button>
          </div>
        </div>
      )}

      {/* Lecture History */}
      <div className={styles.card}>
        <h3>📅 Lecture History</h3>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : history.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: "40px" }}>
            <p>No lectures yet</p>
          </div>
        ) : (
          <div style={{ marginTop: "16px" }}>
            {history.map((session) => (
              <div
                key={session.id}
                style={{
                  padding: "16px",
                  marginBottom: "12px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <strong>{session.courseName}</strong>
                    <br />
                    <small style={{ color: "#64748b" }}>
                      Date: {formatDate(session.startTime)}
                    </small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        background:
                          session.status === "active"
                            ? "#22c55e20"
                            : "#64748b20",
                        color:
                          session.status === "active" ? "#16a34a" : "#475569",
                      }}
                    >
                      {session.status === "active" ? "Active" : "Ended"}
                    </span>
                    <br />
                    <small>
                      📊 {session.attendanceCount} attendance records
                    </small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Course Picker Modal */}
      {showCoursePicker && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "20px",
              width: "400px",
              maxWidth: "90%",
            }}
          >
            <h3 style={{ marginBottom: "16px" }}>Select Course</h3>

            <div>
              <label className={styles.summaryLabel}>
                Lecture Duration (hours)
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className={styles.input}
                style={{ marginBottom: "16px", width: "100%" }}
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={3}>3 hours</option>
              </select>
            </div>

            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => startLecture(course)}
                style={{
                  display: "block",
                  margin: "8px 0",
                  padding: "12px",
                  width: "100%",
                  cursor: "pointer",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  textAlign: "left",
                }}
              >
                <strong>{course.name}</strong>
                <br />
                <small style={{ color: "#64748b" }}>{course.code}</small>
              </button>
            ))}

            {courses.length === 0 && (
              <p
                style={{
                  color: "#64748b",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                No courses assigned
              </p>
            )}

            <button
              onClick={() => setShowCoursePicker(false)}
              style={{
                marginTop: "16px",
                padding: "10px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Lectures;
