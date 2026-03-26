import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ManualAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<any>({});
  const [attendanceDetails, setAttendanceDetails] = useState<any>({}); // ميزة المطور 5: لتخزين تفاصيل السجل (الوقت، الطريقة)
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
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
  }, []);

  const fetchEnrolledStudents = async (session: any) => {
    try {
      const qEnroll = query(
        collection(db, "enrollments"),
        where("courseId", "==", session.courseId),
      );
      const enrollSnap = await getDocs(qEnroll);

      const studentList: any[] = [];
      const studentIds = enrollSnap.docs.map((doc) => doc.data().studentId);

      for (const sId of studentIds) {
        const uDoc = await getDoc(doc(db, "users", sId));
        if (uDoc.exists()) {
          studentList.push({
            id: sId,
            fullName: uDoc.data().fullName,
            universityId: uDoc.data().universityId || "N/A",
          });
        }
      }
      setStudents(studentList);

      const qAttend = query(
        collection(db, "attendance"),
        where("sessionId", "==", session.id),
      );

      onSnapshot(qAttend, (aSnap) => {
        const map: any = {};
        const details: any = {};
        aSnap.docs.forEach((d) => {
          const data = d.data();
          map[data.studentId] = d.id;
          // المطور 5: تخزين تفاصيل السجل للعرض (وقت التسجيل ونوع العملية)
          details[data.studentId] = {
            time: data.timestamp?.toDate
              ? data.timestamp.toDate().toLocaleTimeString()
              : "Pending...",
            method: data.method || "auto",
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

  // --- لوجيك المطور رقم 5 (التحكم الكامل واليدوي) ---
  const toggleAttendance = async (studentId: string, studentName: string) => {
    if (!activeSession) return;

    try {
      if (attendanceMap[studentId]) {
        // حذف طالب (حذف السجل من Firestore)
        await deleteDoc(doc(db, "attendance", attendanceMap[studentId]));
      } else {
        // إضافة يدوية (Manual Add) - لمنع التلاعب وضمان دقة البيانات
        const attendId = `${activeSession.id}_${studentId}`;
        await setDoc(doc(db, "attendance", attendId), {
          sessionId: activeSession.id,
          studentId: studentId,
          studentName: studentName,
          courseId: activeSession.courseId,
          courseName: activeSession.courseName || "Unknown Course",
          timestamp: serverTimestamp(),
          method: "manual", // بصمة المطور 5 لتمييز التعديل اليدوي
          status: "present",
          instructorId: auth.currentUser?.uid, // لتوثيق من قام بالتحضير اليدوي
        });
      }
    } catch (error) {
      Alert.alert("Error", "Manual update failed. Please check permissions.");
    }
  };

  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a8a" />
      </View>
    );

  if (!activeSession)
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1a3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance Management</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="people-outline" size={80} color="#cbd5e1" />
          <Text style={styles.noSessionTxt}>No Active Lecture</Text>
          <Text style={styles.noSessionSub}>
            Start a session from the dashboard to manage attendance records.
          </Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a3a8a" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Instructor Control Panel</Text>
          <Text style={styles.courseSubtitle}>{activeSession.courseName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by student name or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => {
          const isPresent = !!attendanceMap[item.id];
          const details = attendanceDetails[item.id];
          return (
            <View style={[styles.studentCard, isPresent && styles.cardPresent]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{item.fullName}</Text>
                <Text style={styles.universityId}>ID: {item.universityId}</Text>
                {/* المطور 5: عرض تفاصيل الوقت ونوع التحضير */}
                {isPresent && (
                  <Text style={styles.attendanceTime}>
                    {details?.method === "manual" ? "🛡️ Manual" : "📱 Auto"} at{" "}
                    {details?.time}
                  </Text>
                )}
              </View>

              <View style={styles.toggleGroup}>
                <TouchableOpacity
                  onPress={() => toggleAttendance(item.id, item.fullName)}
                  style={[
                    styles.statusBtn,
                    isPresent ? styles.presentActive : styles.absentActive,
                  ]}
                >
                  <Ionicons
                    name={isPresent ? "checkmark-circle" : "close-circle"}
                    size={16}
                    color="#fff"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.statusBtnTxt}>
                    {isPresent ? "Present" : "Absent"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingTop: Platform.OS === "android" ? 40 : 20,
  },
  backBtn: { padding: 8, backgroundColor: "#f1f5f9", borderRadius: 12 },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#1e293b" },
  courseSubtitle: {
    fontSize: 12,
    color: "#1a3a8a",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 15,
    borderRadius: 15,
    height: 50,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: "#1e293b" },
  studentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 1,
  },
  cardPresent: { borderLeftWidth: 6, borderLeftColor: "#22c55e" },
  studentName: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  universityId: { fontSize: 12, color: "#64748b", marginTop: 2 },
  attendanceTime: {
    fontSize: 11,
    color: "#22c55e",
    marginTop: 4,
    fontWeight: "600",
  },
  toggleGroup: { flexDirection: "row", alignItems: "center" },
  statusBtn: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 95,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBtnTxt: { fontWeight: "bold", fontSize: 12, color: "#fff" },
  presentActive: { backgroundColor: "#22c55e" },
  absentActive: { backgroundColor: "#ef4444" },
  noSessionTxt: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 20,
  },
  noSessionSub: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 30,
  },
});
