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
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot, getDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ManualAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<any>({}); 
  const [attendanceDetails, setAttendanceDetails] = useState<any>({}); 
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
        aSnap.docs.forEach(d => {
          const data = d.data();
          map[data.studentId] = d.id;
          details[data.studentId] = {
            time: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "...",
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

  const toggleAttendance = async (studentId: string, studentName: string) => {
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
          instructorId: auth.currentUser?.uid, 
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
          const detail = attendanceDetails[item.id];
          return (
            <View style={[styles.studentCard, isPresent ? styles.cardPresent : styles.cardAbsent]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{item.fullName}</Text>
                <Text style={styles.universityId}>ID: {item.universityId}</Text>
                {isPresent && (
                  <Text style={styles.attendanceTime}>
                    {detail?.method === "manual" ? "🛡️ Manual" : "📱 Auto"} at {detail?.time}
                  </Text>
                )}
              </View>
              <View style={styles.toggleGroup}>
                <TouchableOpacity 
                  onPress={() => !isPresent && toggleAttendance(item.id, item.fullName)}
                  style={[styles.statusBtn, isPresent && styles.presentActive]}
                >
                  <Text style={[styles.statusBtnTxt, isPresent && {color: '#fff'}]}>P</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => isPresent && toggleAttendance(item.id, item.fullName)}
                  style={[styles.statusBtn, !isPresent && styles.absentActive]}
                >
                  <Text style={[styles.statusBtnTxt, !isPresent && {color: '#fff'}]}>A</Text>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  courseSubtitle: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 20, paddingHorizontal: 15, borderRadius: 15, height: 50, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b' },
  studentCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
  
  cardPresent: { borderLeftWidth: 6, borderLeftColor: "#22c55e" }, 
  cardAbsent: { borderLeftWidth: 6, borderLeftColor: "#ef4444" },
  
  studentName: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1 },
  universityId: { fontSize: 12, color: '#64748b', marginTop: 2 },
  attendanceTime: { fontSize: 11, color: '#22c55e', marginTop: 4, fontWeight: 'bold' },
  
  toggleGroup: { flexDirection: 'row', gap: 10 },
  statusBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  statusBtnTxt: { fontWeight: 'bold', fontSize: 14, color: '#94a3b8' },
  presentActive: { backgroundColor: '#22c55e' }, 
  absentActive: { backgroundColor: '#ef4444' }, 
  noSessionTxt: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 20 },
  noSessionSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 }
});
