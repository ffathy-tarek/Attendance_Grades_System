import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  getDoc,
  GeoPoint, // ✅ إضافة GeoPoint
} from "firebase/firestore";
import PageLayout from "../../components/student/PageLayout";
import styles from "../../components/student/PageLayout.module.css";

const Lectures = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [isQRVisible, setIsQRVisible] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState("1 hour");
  const [startingSession, setStartingSession] = useState(false);

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [attendedStudents, setAttendedStudents] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // 🔍 دالة لجلب الموقع كـ GeoPoint
  const getCurrentLocationAsGeoPoint = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // ✅ إنشاء GeoPoint من الإحداثيات
          const geoPoint = new GeoPoint(lat, lng);
          
          console.log("📍 GeoPoint created:", geoPoint);
          console.log(`📍 Latitude: ${lat}, Longitude: ${lng}`);
          resolve(geoPoint);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  useEffect(() => {
    if (!user) return;

    // جلب المواد
    const fetchCourses = async () => {
      try {
        const qC = query(
          collection(db, "courses"),
          where("instructorIds", "array-contains", user.uid)
        );
        const cSnap = await getDocs(qC);
        setCourses(cSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchCourses();

    // متابعة جلسات المحاضرات
    const qHistory = query(
      collection(db, "lecture_sessions"),
      where("instructorId", "==", user.uid),
      orderBy("startTime", "desc")
    );

    const unsubscribe = onSnapshot(qHistory, async (snapshot) => {
      const docs = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const qAttend = query(
            collection(db, "attendance"),
            where("sessionId", "==", docSnap.id)
          );
          const attendSnap = await getDocs(qAttend);
          return {
            id: docSnap.id,
            ...docSnap.data(),
            attendanceCount: attendSnap.size,
          };
        })
      );

      const sortedDocs = docs.sort(
        (a, b) => (b.startTime?.seconds || 0) - (a.startTime?.seconds || 0)
      );
      setHistory(sortedDocs);

      const active = sortedDocs.find((d) => d.status === "active");
      setActiveSession(active || null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const startSession = async (course) => {
    setStartingSession(true);
    try {
      // 📍 جلب موقع المعلم كـ GeoPoint
      let instructorLocation = null;
      try {
        instructorLocation = await getCurrentLocationAsGeoPoint();
        console.log("📍 GeoPoint to save:", instructorLocation);
      } catch (locationError) {
        console.warn("Could not get location:", locationError);
        // نستمر بدون موقع
      }

      // ✅ إنشاء بيانات الجلسة مع الموقع كـ GeoPoint
      const sessionData = {
        courseId: course.id,
        courseName: course.name || course.courseName,
        instructorId: user.uid,
        startTime: Timestamp.now(),
        status: "active",
        attendanceOpen: false,
        durationMinutes: selectedDuration,
      };

      // ✅ إضافة الموقع فقط إذا تم الحصول عليه (كـ GeoPoint)
      if (instructorLocation) {
        sessionData.instructorLocation = instructorLocation;
      }

      const docRef = await addDoc(collection(db, "lecture_sessions"), sessionData);
      console.log("✅ Session created with ID:", docRef.id);
      
      setShowCoursePicker(false);
      setIsQRVisible(true);
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Error starting session. Check connection.");
    }
    setStartingSession(false);
  };

  const toggleAttendance = async (isOpen) => {
    if (!activeSession?.id) return;
    try {
      await updateDoc(doc(db, "lecture_sessions", activeSession.id), {
        attendanceOpen: isOpen,
      });
    } catch (error) {
      console.error("Error toggling attendance:", error);
      alert("Failed to update attendance status");
    }
  };

  const endSession = async () => {
    if (activeSession?.id) {
      try {
        await updateDoc(doc(db, "lecture_sessions", activeSession.id), {
          status: "ended",
          attendanceOpen: false,
          endTime: Timestamp.now(),
        });
        setIsQRVisible(false);
      } catch (error) {
        console.error("Error ending session:", error);
        alert("Could not end session");
      }
    }
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const diff = end.seconds - start.seconds;
    const mins = Math.floor(diff / 60);
    return mins < 60 ? `${mins} mins` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const showAttendanceDetails = async (session) => {
    if (session.status === "active") {
      setIsQRVisible(true);
      return;
    }
    setDetailsLoading(true);
    setDetailsModalVisible(true);
    try {
      const q = query(
        collection(db, "attendance"),
        where("sessionId", "==", session.id)
      );
      const snap = await getDocs(q);
      const list = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const uDoc = await getDoc(doc(db, "users", data.studentId));
        if (uDoc.exists()) {
          list.push({
            id: uDoc.id,
            name: uDoc.data().fullName,
            time: data.timestamp?.toDate
              ? data.timestamp.toDate().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
          });
        }
      }
      setAttendedStudents(list);
    } catch (error) {
      console.error(error);
    }
    setDetailsLoading(false);
  };

  // دالة لعرض إحداثيات GeoPoint كنص مقروء
  const formatGeoPoint = (geoPoint) => {
    if (!geoPoint) return null;
    const lat = geoPoint.latitude;
    const lng = geoPoint.longitude;
    const latDirection = lat >= 0 ? "N" : "S";
    const lngDirection = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(6)}° ${latDirection}, ${Math.abs(lng).toFixed(6)}° ${lngDirection}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Loading...";
    return timestamp.toDate().toLocaleDateString("en-GB");
  };

  if (loading && history.length === 0) {
    return (
      <PageLayout title="Lectures Center" subtitle="Loading...">
        <div className={styles.loading}>Loading lectures...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Lectures Center"
      subtitle="Manage your lecture sessions"
      actions={
        <button className={styles.saveButton} onClick={() => setShowCoursePicker(true)}>
          + New Session
        </button>
      }
    >
      {/* Live Session Bar */}
      {activeSession && (
        <div
          className={styles.card}
          style={{
            marginBottom: "24px",
            background: activeSession.attendanceOpen
              ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
              : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "white",
            cursor: "pointer",
          }}
          onClick={() => setIsQRVisible(true)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "18px" }}>🔴</span>
            <span style={{ fontWeight: "bold" }}>
              Live: {activeSession.courseName} (Tap to Manage)
            </span>
          </div>
        </div>
      )}

      {/* Lectures List */}
      <div className={styles.card}>
        <h3>📅 Lecture History</h3>
        {history.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: "40px" }}>
            <p>No lectures yet</p>
          </div>
        ) : (
          <div style={{ marginTop: "16px" }}>
            {history.map((session) => (
              <div
                key={session.id}
                className={styles.courseCard}
                style={{
                  padding: "16px",
                  marginBottom: "12px",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                }}
                onClick={() => showAttendanceDetails(session)}
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
                    <strong style={{ color: "#1a3a8a", fontSize: "16px" }}>
                      {session.courseName}
                    </strong>
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
                          session.status === "active" ? "#22c55e20" : "#64748b20",
                        color: session.status === "active" ? "#16a34a" : "#475569",
                      }}
                    >
                      {session.status === "active" ? "Active" : "Ended"}
                    </span>
                    <br />
                    <small style={{ color: "#22c55e", fontWeight: "bold" }}>
                      📊 {session.attendanceCount} Attended
                    </small>
                    {session.status === "ended" && (
                      <small style={{ color: "#64748b", display: "block" }}>
                        ⏱ {calculateDuration(session.startTime, session.endTime)}
                      </small>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Modal (Management Panel) */}
      {isQRVisible && activeSession && (
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
          onClick={() => setIsQRVisible(false)}
        >
          <div
            style={{
              background: "white",
              padding: "32px",
              borderRadius: "24px",
              width: "90%",
              maxWidth: "500px",
              textAlign: "center",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsQRVisible(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#cbd5e1",
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a3a8a", marginBottom: "20px" }}>
              {activeSession.courseName}
            </h3>

            {/* عرض موقع المعلم إذا كان موجوداً (كـ GeoPoint) */}
            {activeSession.instructorLocation && (
              <div style={{ marginBottom: "15px", fontSize: "12px", color: "#64748b", wordBreak: "break-all" }}>
                📍 {formatGeoPoint(activeSession.instructorLocation)}
              </div>
            )}

            <div style={{ width: "100%", padding: "20px", background: "#f8fafc", borderRadius: "20px", marginBottom: "20px" }}>
              <p style={{ fontWeight: "bold", marginBottom: "10px", color: "#64748b" }}>
                Attendance Broadcast:
              </p>
              {!activeSession.attendanceOpen ? (
                <button
                  onClick={() => toggleAttendance(true)}
                  style={{
                    width: "100%",
                    padding: "15px",
                    background: "#22c55e",
                    color: "white",
                    border: "none",
                    borderRadius: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  🎯 Open For Students
                </button>
              ) : (
                <button
                  onClick={() => toggleAttendance(false)}
                  style={{
                    width: "100%",
                    padding: "15px",
                    background: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  🔒 Close For Students
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
              <span>📍</span>
              <span style={{ color: "#22c55e", fontWeight: "bold" }}>GPS Shield Active (100m)</span>
            </div>

            <button
              onClick={() => {
                setIsQRVisible(false);
                navigate(`/instructor/attendance/${activeSession.courseId}`);
              }}
              style={{
                width: "100%",
                padding: "18px",
                background: "white",
                border: "2px solid #1a3a8a",
                borderRadius: "15px",
                color: "#1a3a8a",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
                marginBottom: "15px",
              }}
            >
              👥 Current Attendance List
            </button>

            <button
              onClick={endSession}
              style={{
                width: "100%",
                padding: "20px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "15px",
                fontWeight: "bold",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Finish & Close Session
            </button>
          </div>
        </div>
      )}

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
          onClick={() => setShowCoursePicker(false)}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "400px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ textAlign: "center", marginBottom: "20px", color: "#1a3a8a" }}>
              Lecture Setup
            </h3>

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              {["1 hour", "2 hours", "3 hours"].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "12px",
                    border: "none",
                    background: selectedDuration === d ? "#1a3a8a" : "#f1f5f9",
                    color: selectedDuration === d ? "white" : "#1a3a8a",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => startSession(course)}
                disabled={startingSession}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "16px",
                  marginBottom: "10px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  textAlign: "left",
                  cursor: startingSession ? "wait" : "pointer",
                  opacity: startingSession ? 0.6 : 1,
                }}
              >
                <strong style={{ color: "#1a3a8a" }}>
                  {course.name || course.courseName}
                </strong>
                <br />
                <small style={{ color: "#64748b" }}>{course.code}</small>
              </button>
            ))}

            {courses.length === 0 && (
              <p style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                No courses assigned
              </p>
            )}

            <button
              onClick={() => setShowCoursePicker(false)}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "10px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Attendance Details Modal */}
      {detailsModalVisible && (
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
          onClick={() => setDetailsModalVisible(false)}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "80%",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ color: "#1a3a8a" }}>Attendance List</h3>
              <button
                onClick={() => setDetailsModalVisible(false)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : attendedStudents.length === 0 ? (
              <p style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>
                No attendance records
              </p>
            ) : (
              <div>
                {attendedStudents.map((student) => (
                  <div
                    key={student.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: "600", color: "#1e293b" }}>{student.name}</span>
                      <br />
                      <span style={{ fontSize: "10px", color: "#22c55e", fontWeight: "bold" }}>
                        PRESENT
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>{student.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Lectures;