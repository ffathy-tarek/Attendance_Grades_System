import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseItem {
  id: string;
  name: string;
  code: string;
  instructor: string;
  totalSessions: number;
  present: number;
  absences: number;
  absPercent: number;
  activeSessionId: string | null;
  instructorLocation: { latitude: number; longitude: number } | null;
}

interface Stats {
  totalCourses: number;
  avgAbsence: string;
  perfectAttendance: number;
  needAttention: number;
}

// ──────────────────── Component ────────────────────────────────────

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    avgAbsence: "0",
    perfectAttendance: 0,
    needAttention: 0,
  });
  const [attendanceLoading, setAttendanceLoading] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ courseId: string; text: string; type: string }>({
    courseId: "",
    text: "",
    type: "",
  });

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else router.replace("/");
    });
    return () => unsub();
  }, []);

  // Data + real-time listeners
  useEffect(() => {
    if (!user) return;

    loadData(user);

    const unsubAttend = onSnapshot(
      query(collection(db, "attendance"), where("studentId", "==", user.uid)),
      () => loadData(user)
    );
    const unsubSessions = onSnapshot(
      collection(db, "lecture_sessions"),
      () => loadData(user)
    );
    return () => {
      unsubAttend();
      unsubSessions();
    };
  }, [user]);

  const loadData = async (currentUser: User) => {
    try {
      // Get user name
      const uDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (uDoc.exists()) setUserName(uDoc.data().fullName || "");

      // Get enrolled courses
      const enrollSnap = await getDocs(
        query(collection(db, "enrollments"), where("studentId", "==", currentUser.uid))
      );

      const courseList: CourseItem[] = [];
      let totalAbsPercent = 0;
      let perfect = 0;
      let attention = 0;

      for (const enr of enrollSnap.docs) {
        const cId: string = enr.data().courseId;
        const cDoc = await getDoc(doc(db, "courses", cId));
        if (!cDoc.exists()) continue;

        const cData = cDoc.data();

        // Sessions for this course
        const sessSnap = await getDocs(
          query(collection(db, "lecture_sessions"), where("courseId", "==", cId))
        );
        const totalSessions = sessSnap.size;

        // My attendance for this course
        const attendSnap = await getDocs(
          query(
            collection(db, "attendance"),
            where("studentId", "==", currentUser.uid),
            where("courseId", "==", cId)
          )
        );
        const present = attendSnap.size;
        const absences = totalSessions - present;
        const absPercent = totalSessions > 0 ? (absences / totalSessions) * 100 : 0;

        totalAbsPercent += absPercent;
        if (absPercent === 0) perfect++;
        if (absPercent >= 15) attention++;

        // Find active open session
        const activeSessDoc = sessSnap.docs.find(
          (d) => d.data().status === "active" && d.data().attendanceOpen === true
        );

        const instrLoc = activeSessDoc?.data()?.instructorLocation ?? null;

        // Get instructor name
        let instructor = cData.instructorName || "";
        if (!instructor && cData.instructorIds?.[0]) {
          const iDoc = await getDoc(doc(db, "users", cData.instructorIds[0]));
          if (iDoc.exists()) instructor = "Dr. " + iDoc.data().fullName;
        }

        courseList.push({
          id: cId,
          name: cData.name || cData.courseName || "Unknown",
          code: cData.code || "",
          instructor,
          totalSessions,
          present,
          absences,
          absPercent,
          activeSessionId: activeSessDoc?.id ?? null,
          instructorLocation: instrLoc
            ? { latitude: instrLoc.latitude, longitude: instrLoc.longitude }
            : null,
        });
      }

      setCourses(courseList);
      setStats({
        totalCourses: courseList.length,
        avgAbsence:
          courseList.length > 0
            ? (totalAbsPercent / courseList.length).toFixed(1)
            : "0",
        perfectAttendance: perfect,
        needAttention: attention,
      });
    } catch (e) {
      console.error("loadData error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Attendance ─────────────────────────────────────────────────────────────

  const handleTakeAttendance = async (course: CourseItem) => {
    if (!user) return;
    if (!course.activeSessionId) {
      setMessage({ courseId: course.id, text: "No active session open right now", type: "error" });
      setTimeout(() => setMessage({ courseId: "", text: "", type: "" }), 3000);
      return;
    }

    setAttendanceLoading((prev) => ({ ...prev, [course.id]: true }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setMessage({ courseId: course.id, text: "Location permission is required", type: "error" });
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});

      // Distance check
      if (course.instructorLocation) {
        const dist = getDistance(
          loc.coords.latitude,
          loc.coords.longitude,
          course.instructorLocation.latitude,
          course.instructorLocation.longitude
        );
        if (dist > 100) {
          setMessage({
            courseId: course.id,
            text: `📍 Too far from lecture hall (${Math.round(dist)}m away, max 100m)`,
            type: "error",
          });
          return;
        }
      }

      const attendId = `${course.activeSessionId}_${user.uid}`;
      await setDoc(doc(db, "attendance", attendId), {
        sessionId: course.activeSessionId,
        studentId: user.uid,
        courseId: course.id,
        courseName: course.name,
        timestamp: serverTimestamp(),
        method: "auto",
        status: "present",
      });

      setMessage({ courseId: course.id, text: "✅ Attendance recorded!", type: "success" });
    } catch {
      setMessage({ courseId: course.id, text: "Already recorded or session closed", type: "error" });
    } finally {
      setAttendanceLoading((prev) => ({ ...prev, [course.id]: false }));
      setTimeout(() => setMessage({ courseId: "", text: "", type: "" }), 4000);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getAbsenceColor = (p: number): string => {
    if (p <= 10) return "#22c55e";
    if (p <= 15) return "#f59e0b";
    if (p <= 25) return "#ef4444";
    return "#991b1b";
  };

  const getWarning = (p: number): string => {
    if (p > 25) return "🚫 Barred from exam";
    if (p >= 25) return "⚠️ 2nd Warning";
    if (p >= 15) return "⚠️ 1st Warning";
    return "";
  };

  const getGreeting = (): string => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1a3a8a" />
      </View>
    );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>{getGreeting()},</Text>
            <Text style={s.userName}>{userName || "Student"}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.headerBtn}
              onPress={() => router.push("/(student)/student-profile" as any)}
            >
              <Ionicons name="person-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.headerBtn, { marginLeft: 10 }]}
              onPress={() => auth.signOut().then(() => router.replace("/"))}
            >
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={s.roleTag}>Student Dashboard</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Stats Row */}
        <View style={s.statsRow}>
          <StatCard icon="book" label="Courses" value={stats.totalCourses} color="#4361ee" />
          <StatCard icon="analytics" label="Avg Absence" value={`${stats.avgAbsence}%`} color="#ef4444" />
          <StatCard icon="checkmark-circle" label="Perfect" value={stats.perfectAttendance} color="#22c55e" />
          <StatCard icon="warning" label="Attention" value={stats.needAttention} color="#f59e0b" />
        </View>

        {/* Quick Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.quickRow}>
            <QuickBtn
              icon="calendar-outline"
              label="Attendance"
              color="#4361ee"
              onPress={() => router.push("/(student)/student-attendance" as any)}
            />
            <QuickBtn
              icon="document-text-outline"
              label="Grades"
              color="#22c55e"
              onPress={() => router.push("/(student)/student-grades" as any)}
            />
            <QuickBtn
              icon="book-outline"
              label="Courses"
              color="#f59e0b"
              onPress={() => router.push("/(student)/student-courses"as any)}
            />
            <QuickBtn
              icon="person-outline"
              label="Profile"
              color="#a855f7"
              onPress={() => router.push("/(student)/student-profile" as any)}
            />
          </View>
          <View style={s.quickRow}>
            <QuickBtn
              icon="star-outline"
              label="Reviews"
              color="#0ea5e9"
              onPress={() => router.push("/(student)/student-reviews" as any)}
            />
          </View>
        </View>

        {/* Courses List */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>My Courses</Text>

          {courses.length === 0 && (
            <View style={s.emptyBox}>
              <Ionicons name="book-outline" size={50} color="#cbd5e1" />
              <Text style={s.emptyTxt}>No enrolled courses</Text>
            </View>
          )}

          {courses.map((course) => {
            const warn = getWarning(course.absPercent);
            const msg = message.courseId === course.id ? message : null;
            const isLoading = attendanceLoading[course.id] ?? false;

            return (
              <TouchableOpacity
                key={course.id}
                style={s.courseCard}
                onPress={() => router.push({
                  pathname: "/(student)/student-course-details",
                  params: { courseId: course.id }
                } as any)}
              >
                {/* Warning badge */}
                {warn ? (
                  <View style={s.warnBadge}>
                    <Text style={s.warnTxt}>{warn}</Text>
                  </View>
                ) : null}

                {/* Course top row */}
                <View style={s.courseCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.courseName}>{course.name}</Text>
                    {course.instructor ? (
                      <Text style={s.courseInstructor}>👨‍🏫 {course.instructor}</Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      s.absenceBadge,
                      { backgroundColor: getAbsenceColor(course.absPercent) },
                    ]}
                  >
                    <Text style={s.absenceTxt}>{course.absPercent.toFixed(1)}%</Text>
                  </View>
                </View>

                {/* Stats chips */}
                <View style={s.courseStatsRow}>
                  <Text style={[s.chip, { color: "#22c55e" }]}>✅ {course.present} Present</Text>
                  <Text style={[s.chip, { color: "#ef4444" }]}>❌ {course.absences} Absent</Text>
                  <Text style={s.chip}>📅 {course.totalSessions} Total</Text>
                </View>

                {/* Feedback message */}
                {msg && msg.text ? (
                  <View
                    style={[
                      s.msgBox,
                      msg.type === "success" ? s.msgSuccess : s.msgError,
                    ]}
                  >
                    <Text style={s.msgTxt}>{msg.text}</Text>
                  </View>
                ) : null}

                {/* Attendance button */}
                <TouchableOpacity
                  style={[
                    s.attendBtn,
                    !course.activeSessionId && s.attendBtnDisabled,
                  ]}
                  onPress={() => handleTakeAttendance(course)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={course.activeSessionId ? "finger-print" : "lock-closed"}
                        size={16}
                        color="#fff"
                      />
                      <Text style={s.attendBtnTxt}>
                        {course.activeSessionId ? "Take Attendance" : "No Active Session"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  color: string;
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
  <View style={[s.statCard, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
    <Text style={s.statLabel}>{label}</Text>
    <Text style={s.statNumber}>{value}</Text>
  </View>
);

interface QuickBtnProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

const QuickBtn = ({ icon, label, color, onPress }: QuickBtnProps) => (
  <TouchableOpacity style={s.quickBtn} onPress={onPress}>
    <View style={[s.quickIcon, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={s.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

// ────────────────────────────── Styles ────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    backgroundColor: "#1a3a8a",
    paddingTop: Platform.OS === "web" ? 30 : 50,
    paddingHorizontal: 25,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  greeting: { color: "#e2e8f0", fontSize: 13 },
  userName: { color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 2 },
  headerActions: { flexDirection: "row" },
  headerBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 10,
    borderRadius: 12,
  },
  roleTag: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  statCard: {
    width: "23%",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 15,
    elevation: 2,
    borderLeftWidth: 4,
  },
  statLabel: { color: "#64748b", fontSize: 10, marginTop: 2 },
  statNumber: { color: "#1e293b", fontSize: 15, fontWeight: "bold", marginTop: 2 },

  // Section
  section: { paddingHorizontal: 20, paddingTop: 5, marginBottom: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },

  // Quick actions
  quickRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  quickBtn: { alignItems: "center", width: "22%" },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickLabel: { fontSize: 11, color: "#1e293b", fontWeight: "600" },

  // Course card
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  warnBadge: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  warnTxt: { color: "#b91c1c", fontSize: 11, fontWeight: "bold" },
  courseCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  courseName: { fontSize: 15, fontWeight: "bold", color: "#1a3a8a" },
  courseInstructor: { fontSize: 12, color: "#64748b", marginTop: 3 },
  absenceBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  absenceTxt: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  courseStatsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  chip: { fontSize: 11, fontWeight: "600", color: "#64748b" },

  // Message
  msgBox: { borderRadius: 10, padding: 10, marginBottom: 10 },
  msgSuccess: { backgroundColor: "#dcfce7" },
  msgError: { backgroundColor: "#fee2e2" },
  msgTxt: { fontSize: 12, fontWeight: "600", textAlign: "center", color: "#1e293b" },

  // Attend button
  attendBtn: {
    backgroundColor: "#1a3a8a",
    borderRadius: 12,
    padding: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  attendBtnDisabled: { backgroundColor: "#94a3b8" },
  attendBtnTxt: { color: "#fff", fontWeight: "bold", fontSize: 13 },

  // Empty state
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyTxt: { color: "#94a3b8", fontSize: 15, marginTop: 12 },
});
