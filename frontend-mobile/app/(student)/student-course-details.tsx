import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Alert } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

// 
interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  hours: string;
}

interface Lecture {
  id: string;
  date: string;
  status: string;
  attended: boolean;
}

interface Grade {
  id: string;
  assessmentName: string;
  score: number | string;
}

interface ActiveSession {
  id: string;
  instructorLocation?: {
    latitude: number;
    longitude: number;
  };
  [key: string]: any; // للسماح بالحقول الأخرى من Firebase
}

export default function CourseDetailsScreen() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams();
  
  // تحويل courseId لنص صريح لحل مشكلة Firebase doc()
  const idStr = Array.isArray(courseId) ? courseId[0] : courseId;

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [present, setPresent] = useState(0);
  const [attendLoading, setAttendLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user || !idStr) return;

      try {
        // حل مشكلة doc(db, "courses", idStr)
        const cDoc = await getDoc(doc(db, "courses", idStr));
        if (cDoc.exists()) {
          const d = cDoc.data();
          let instructorName = d.instructorName || "";
          if (!instructorName && d.instructorIds?.[0]) {
            const iDoc = await getDoc(doc(db, "users", d.instructorIds[0]));
            if (iDoc.exists()) instructorName = "Dr. " + iDoc.data().fullName;
          }
          setCourse({ 
            id: cDoc.id, 
            name: d.name || d.courseName, 
            code: d.code || "", 
            instructor: instructorName, 
            hours: d.creditHours || d.hours || "" 
          });
        }

        // sessions
        const sessSnap = await getDocs(query(collection(db, "lecture_sessions"), where("courseId", "==", idStr)));
        const activeSess = sessSnap.docs.find(d => d.data().status === "active" && d.data().attendanceOpen);
        if (activeSess) setActiveSession({ id: activeSess.id, ...activeSess.data() });

        // attendance
        const attendSnap = await getDocs(query(collection(db, "attendance"), where("studentId", "==", user.uid), where("courseId", "==", idStr)));
        const attendedIds = new Set(attendSnap.docs.map(d => d.data().sessionId));
        setPresent(attendedIds.size);

        const lecList: Lecture[] = sessSnap.docs
          .sort((a, b) => (b.data().startTime?.seconds || 0) - (a.data().startTime?.seconds || 0))
          .map(d => ({
            id: d.id,
            date: d.data().startTime?.toDate?.().toLocaleDateString() || "—",
            status: d.data().status,
            attended: attendedIds.has(d.id),
          }));
        setLectures(lecList);

        // grades
        const gradeSnap = await getDocs(query(collection(db, "grades"), where("studentId", "==", user.uid), where("courseId", "==", idStr)));
        setGrades(gradeSnap.docs.map(d => ({ id: d.id, assessmentName: d.data().assessmentName, score: d.data().score })));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [idStr]);

  const handleAttendance = async () => {
    const user = auth.currentUser;
    if (!activeSession || !user) return setMessage({ text: "No active session open", type: "error" });
    setAttendLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setMessage({ text: "Location permission required", type: "error" });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});

      if (activeSession.instructorLocation) {
        const dist = getDistance(
          loc.coords.latitude, loc.coords.longitude,
          activeSession.instructorLocation.latitude, activeSession.instructorLocation.longitude
        );
        if (dist > 100) {
          setMessage({ text: `You are ${Math.round(dist)}m away (max 100m)`, type: "error" });
          return;
        }
      }

      await setDoc(doc(db, "attendance", `${activeSession.id}_${user.uid}`), {
        sessionId: activeSession.id, studentId: user.uid, courseId: idStr,
        timestamp: serverTimestamp(), method: "auto", status: "present",
      });
      setMessage({ text: "✅ Attendance recorded!", type: "success" });
    } catch {
      setMessage({ text: "Error recording attendance", type: "error" });
    } finally {
      setAttendLoading(false);
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    }
  };

  // إضافة أنواع (Types) لبارامترات المسافة
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const totalSessions = lectures.length;
  const absences = totalSessions - present;
  const absPercent = totalSessions > 0 ? ((absences / totalSessions) * 100).toFixed(1) : "0";

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#1a3a8a" /></View>;
  if (!course) return <View style={s.center}><Text>Course not found</Text></View>;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Ionicons name="arrow-back" size={24} color="#1a3a8a" /></TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={s.headerTitle}>Course Details</Text>
          {course.code ? <Text style={s.subtitle}>{course.code}</Text> : null}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={s.heroCard}>
          <Text style={s.heroName}>{course.name}</Text>
          {course.instructor ? <Text style={s.heroInstructor}>👨‍🏫 {course.instructor}</Text> : null}
          {course.hours ? <Text style={s.heroHours}>{course.hours} Credit Hours</Text> : null}
        </View>

        <View style={s.statsRow}>
          <StatBox label="Present" value={present} icon="checkmark-circle" color="#22c55e" />
          <StatBox label="Absent" value={absences} icon="close-circle" color="#ef4444" />
          <StatBox label="Total" value={totalSessions} icon="calendar" color="#1a3a8a" />
          <StatBox label="Absence %" value={`${absPercent}%`} icon="analytics" color="#f59e0b" />
        </View>

        <View style={s.attendSection}>
          <Text style={s.sectionTitle}>📝 Take Attendance</Text>
          {message.text ? (
            <View style={[s.msgBox, message.type === "success" ? s.msgSuccess : s.msgError]}>
              <Text style={s.msgTxt}>{message.text}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[s.attendBtn, !activeSession && s.attendBtnOff]}
            onPress={handleAttendance} disabled={attendLoading}
          >
            {attendLoading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name={activeSession ? "finger-print" : "lock-closed"} size={20} color="#fff" />
                  <Text style={s.attendBtnTxt}>{activeSession ? "Record My Attendance" : "No Open Session"}</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {grades.length > 0 && (
          <View style={s.gradesSection}>
            <Text style={s.sectionTitle}>📊 My Grades</Text>
            {grades.map(g => (
              <View key={g.id} style={s.gradeRow}>
                <Text style={s.gradeName}>{g.assessmentName}</Text>
                <Text style={s.gradeScore}>{g.score} pts</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[s.sectionTitle, { marginTop: 20 }]}>📅 Lecture History</Text>
        {lectures.map((l, i) => (
          <View key={l.id} style={[s.lectureRow, l.attended && s.lecturePresent]}>
            <View>
              <Text style={s.lectureDate}>Session {lectures.length - i}</Text>
              <Text style={s.lectureSubDate}>{l.date}</Text>
            </View>
            <View style={[s.lectureBadge, l.attended ? s.badgePresent : s.badgeAbsent]}>
              <Ionicons name={l.attended ? "checkmark" : "close"} size={14} color="#fff" />
              <Text style={s.badgeTxt}>{l.attended ? "Present" : "Absent"}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// إضافة Types للـ Props الخاصة بـ StatBox
const StatBox = ({ label, value, icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
  <View style={[s.statBox, { borderTopColor: color, borderTopWidth: 3 }]}>
    <Ionicons name={icon} size={18} color={color} />
    <Text style={s.statVal}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff", elevation: 1 },
  backBtn: { padding: 8, backgroundColor: "#f1f5f9", borderRadius: 12 },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#1e293b" },
  subtitle: { fontSize: 11, color: "#1a3a8a", fontWeight: "700" },
  heroCard: { backgroundColor: "#1a3a8a", borderRadius: 20, padding: 24, marginBottom: 20 },
  heroName: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 6 },
  heroInstructor: { color: "#e2e8f0", fontSize: 13, marginBottom: 4 },
  heroHours: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statBox: { width: "23%", backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", elevation: 1 },
  statVal: { fontSize: 16, fontWeight: "bold", color: "#1e293b", marginTop: 4 },
  statLabel: { fontSize: 9, color: "#64748b", marginTop: 2 },
  attendSection: { backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 20, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", color: "#1e293b", marginBottom: 12 },
  msgBox: { borderRadius: 10, padding: 10, marginBottom: 10 },
  msgSuccess: { backgroundColor: "#dcfce7" },
  msgError: { backgroundColor: "#fee2e2" },
  msgTxt: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  attendBtn: { backgroundColor: "#1a3a8a", borderRadius: 14, padding: 15, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  attendBtnOff: { backgroundColor: "#94a3b8" },
  attendBtnTxt: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  gradesSection: { backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 20, elevation: 1 },
  gradeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  gradeName: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  gradeScore: { fontSize: 14, fontWeight: "bold", color: "#22c55e" },
  lectureRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  lecturePresent: { borderLeftWidth: 4, borderLeftColor: "#22c55e" },
  lectureDate: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  lectureSubDate: { fontSize: 11, color: "#64748b", marginTop: 2 },
  lectureBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgePresent: { backgroundColor: "#22c55e" },
  badgeAbsent: { backgroundColor: "#ef4444" },
  badgeTxt: { color: "#fff", fontWeight: "bold", fontSize: 11 },
});