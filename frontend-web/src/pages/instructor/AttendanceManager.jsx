import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import PageLayout from "../../components/student/PageLayout";
import styles from "../../components/student/PageLayout.module.css";

const AttendanceManager = () => {
  const { subjectId } = useParams();

  const [course, setCourse] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState(null);

  // ====================== 1. جلب المادة والطلاب ======================
  useEffect(() => {
    if (!subjectId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", subjectId));
        if (isMounted && courseDoc.exists()) {
          setCourse(courseDoc.data());
        }

        const enrollQuery = query(
          collection(db, "enrollments"),
          where("courseId", "==", subjectId),
        );

        const unsubscribeEnroll = onSnapshot(enrollQuery, async (snapshot) => {
          if (!isMounted) return;

          if (snapshot.empty) {
            if (isMounted) {
              setAllStudents([]);
              setLoading(false);
            }
            return;
          }

          const studentPromises = snapshot.docs.map(async (enrollDoc) => {
            const studentId = enrollDoc.data().studentId;
            if (!studentId) return null;

            const userDoc = await getDoc(doc(db, "users", studentId));
            return userDoc.exists()
              ? { id: userDoc.id, ...userDoc.data() }
              : null;
          });

          const studentsList = (await Promise.all(studentPromises)).filter(
            Boolean,
          );

          if (isMounted) {
            setAllStudents(studentsList);
            setLoading(false);
          }
        });

        return () => unsubscribeEnroll();
      } catch (error) {
        console.error("Error loading data:", error);
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  // ====================== 2. الجلسة النشطة ======================
  useEffect(() => {
    if (!subjectId) return;

    const q = query(
      collection(db, "attendance"),
      where("courseId", "==", subjectId),
      where("status", "==", "active"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveSession({
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        });
      } else {
        setActiveSession(null);
      }
    });

    return () => unsubscribe();
  }, [subjectId]);

  // ====================== الدوال ======================
  const toggleAttendance = async (studentId) => {
    if (!activeSession) return alert("No active attendance session found!");

    const sessionRef = doc(db, "attendance", activeSession.id);
    const currentAttendees = activeSession.attendees || [];
    const isCurrentlyPresent = currentAttendees.some(
      (a) => a.studentId === studentId,
    );

    try {
      let updatedAttendees = [...currentAttendees];
      if (isCurrentlyPresent) {
        updatedAttendees = updatedAttendees.filter(
          (a) => a.studentId !== studentId,
        );
      } else {
        updatedAttendees.push({
          studentId,
          timestamp: new Date().toISOString(),
        });
      }
      await updateDoc(sessionRef, { attendees: updatedAttendees });
    } catch (error) {
      console.error(error);
      alert("Failed to update attendance");
    }
  };

  const addStudentManually = async (studentId) => {
    if (!activeSession) return;

    const sessionRef = doc(db, "attendance", activeSession.id);
    const currentAttendees = activeSession.attendees || [];

    if (currentAttendees.some((a) => a.studentId === studentId)) {
      alert("Student is already marked present");
      return;
    }

    try {
      await updateDoc(sessionRef, {
        attendees: arrayUnion({
          studentId,
          timestamp: new Date().toISOString(),
          addedManually: true,
        }),
      });
      setShowAddModal(false);
      setSelectedStudentToAdd(null);
      alert("Student added successfully ✅");
    } catch (error) {
      console.error(error);
      alert("Failed to add student");
    }
  };

  const removeStudent = async (studentId) => {
    if (!activeSession) return;
    if (!window.confirm("Are you sure you want to remove this student?"))
      return;

    const sessionRef = doc(db, "attendance", activeSession.id);
    const currentAttendees = activeSession.attendees || [];
    const attendeeToRemove = currentAttendees.find(
      (a) => a.studentId === studentId,
    );

    if (attendeeToRemove) {
      try {
        await updateDoc(sessionRef, {
          attendees: arrayRemove(attendeeToRemove),
        });
      } catch (error) {
        console.error(error);
        alert("Failed to remove student");
      }
    }
  };

  // ====================== فلترة وترتيب (الجزء المُصحح) ======================
  const displayedStudents = useMemo(() => {
    let filtered = allStudents.filter((student) => {
      const name = (student.fullName || student.name || "").toLowerCase();
      const code = String(student.code || student.id || "").toLowerCase(); // ← هنا التصليح
      return (
        name.includes(searchTerm.toLowerCase()) ||
        code.includes(searchTerm.toLowerCase())
      );
    });

    filtered.sort((a, b) => {
      const aPresent = activeSession?.attendees?.some(
        (att) => att.studentId === a.id,
      );
      const bPresent = activeSession?.attendees?.some(
        (att) => att.studentId === b.id,
      );

      if (aPresent && !bPresent) return -1;
      if (!aPresent && bPresent) return 1;

      const aTime = activeSession?.attendees?.find(
        (att) => att.studentId === a.id,
      )?.timestamp;
      const bTime = activeSession?.attendees?.find(
        (att) => att.studentId === b.id,
      )?.timestamp;

      if (aTime && bTime) return new Date(aTime) - new Date(bTime);
      if (aTime) return -1;
      if (bTime) return 1;

      return (a.fullName || a.name || "").localeCompare(
        b.fullName || b.name || "",
      );
    });

    return filtered;
  }, [allStudents, activeSession, searchTerm]);

  const attendanceCount = activeSession?.attendees?.length || 0;
  const absentCount = allStudents.length - attendanceCount;
  const attendanceRate =
    allStudents.length > 0
      ? ((attendanceCount / allStudents.length) * 100).toFixed(1)
      : 0;

  return (
    <PageLayout
      title="Attendance Management"
      subtitle={course ? `Course: ${course.name}` : "Loading..."}
      actions={
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className={styles.exportButton}
            onClick={() => window.print()}
          >
            📥 Export PDF Report
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!activeSession || loading}
            style={{
              padding: "8px 16px",
              background: activeSession ? "#3b82f6" : "#94a3b8",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: activeSession && !loading ? "pointer" : "not-allowed",
            }}
          >
            ➕ Add Student Manually
          </button>
        </div>
      }
    >
      {/* Statistics Cards */}
      <div className={styles.summaryCards} style={{ marginBottom: "24px" }}>
        <div className={styles.summaryCard}>
          <div
            className={styles.summaryIcon}
            style={{ backgroundColor: "#3b82f620" }}
          >
            👥
          </div>
          <div>
            <span className={styles.summaryLabel}>Total Enrolled</span>
            <span className={styles.summaryValue}>{allStudents.length}</span>
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
            <span className={styles.summaryLabel}>Present Now</span>
            <span className={styles.summaryValue} style={{ color: "#10b981" }}>
              {attendanceCount}
            </span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div
            className={styles.summaryIcon}
            style={{ backgroundColor: "#ef444420" }}
          >
            ❌
          </div>
          <div>
            <span className={styles.summaryLabel}>Absent</span>
            <span className={styles.summaryValue} style={{ color: "#ef4444" }}>
              {absentCount}
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
            <span className={styles.summaryValue}>{attendanceRate}%</span>
          </div>
        </div>
      </div>

      {/* Warning */}
      {!activeSession && !loading && (
        <div
          className={styles.card}
          style={{
            marginBottom: "24px",
            background: "#fff1f2",
            border: "1px solid #fecaca",
            padding: "16px",
            borderRadius: "12px",
          }}
        >
          <p style={{ color: "#be123c", fontWeight: "600", margin: 0 }}>
            ⚠️ No active attendance session. Manual control is disabled until
            you start a session from the Lectures Dashboard.
          </p>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search by name or academic ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
          }}
        />
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Academic ID</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center" }}>Registration Time</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="5"
                  style={{ textAlign: "center", padding: "80px" }}
                >
                  Loading students...
                </td>
              </tr>
            ) : allStudents.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: "80px",
                    color: "#64748b",
                  }}
                >
                  No students enrolled in this course
                </td>
              </tr>
            ) : displayedStudents.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  style={{ textAlign: "center", padding: "60px" }}
                >
                  No matching results
                </td>
              </tr>
            ) : (
              displayedStudents.map((student) => {
                const attendee = activeSession?.attendees?.find(
                  (a) => a.studentId === student.id,
                );
                const isPresent = !!attendee;
                const timestamp = attendee?.timestamp
                  ? new Date(attendee.timestamp).toLocaleString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "-";

                return (
                  <tr key={student.id}>
                    <td style={{ fontWeight: "600" }}>
                      {student.fullName || student.name}
                    </td>
                    <td>
                      <span
                        style={{
                          background: "#f1f5f9",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontFamily: "monospace",
                        }}
                      >
                        {student.code || student.id?.slice(0, 8) || "N/A"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className={`${styles.statusBadge} ${isPresent ? styles.present : styles.absent}`}
                      >
                        {isPresent ? "✅ Present" : "❌ Absent"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>{timestamp}</td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          onClick={() => toggleAttendance(student.id)}
                          disabled={!activeSession}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "6px",
                            border: "none",
                            background: isPresent ? "#fee2e2" : "#dcfce7",
                            color: isPresent ? "#ef4444" : "#15803d",
                            cursor: activeSession ? "pointer" : "not-allowed",
                          }}
                        >
                          {isPresent ? "Mark Absent" : "Mark Present"}
                        </button>
                        {isPresent && (
                          <button
                            onClick={() => removeStudent(student.id)}
                            style={{
                              padding: "6px 12px",
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
            }}
          >
            <h3>➕ Add Student Manually</h3>
            <input
              type="text"
              placeholder="Search by name or academic ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                margin: "15px 0",
                borderRadius: "8px",
              }}
            />

            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                marginTop: "10px",
              }}
            >
              {allStudents
                .filter(
                  (s) =>
                    !activeSession?.attendees?.some(
                      (a) => a.studentId === s.id,
                    ),
                )
                .filter(
                  (s) =>
                    (s.fullName || s.name || "")
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    String(s.code || s.id || "")
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()),
                )
                .map((student) => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudentToAdd(student)}
                    style={{
                      padding: "12px",
                      border: "1px solid #e2e8f0",
                      marginBottom: "8px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background:
                        selectedStudentToAdd?.id === student.id
                          ? "#dbeafe"
                          : "white",
                    }}
                  >
                    {student.fullName || student.name} —{" "}
                    {student.code || student.id?.slice(0, 8) || "N/A"}
                  </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedStudentToAdd(null);
                }}
                style={{ flex: 1, padding: "10px", borderRadius: "8px" }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedStudentToAdd &&
                  addStudentManually(selectedStudentToAdd.id)
                }
                disabled={!selectedStudentToAdd}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                }}
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default AttendanceManager;
