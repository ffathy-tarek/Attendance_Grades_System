import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, ActivityIndicator, StatusBar, Platform } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function StudentList() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchInstructorCourses = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(collection(db, "courses"), where("instructorIds", "array-contains", user.uid));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCourses(list);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchInstructorCourses();
  }, []);

  const getWarningStatus = (absenceRate: number) => {
    if (absenceRate >= 25) return { label: "⛔ DENIED (25%)", color: "#ef4444" }; 
    if (absenceRate >= 20) return { label: "⚠️ WARNING (20%)", color: "#f97316" }; 
    if (absenceRate >= 10) return { label: "📢 NOTICE (10%)", color: "#eab308" }; 
    return null;
  };

  const handleCourseSelect = async (course: any) => {
    setLoading(true);
    setSelectedCourse(course);
    try {
      const qEnroll = query(collection(db, "enrollments"), where("courseId", "==", course.id));
      const enrollSnap = await getDocs(qEnroll);
      
      const qLectures = query(collection(db, "lecture_sessions"), where("courseId", "==", course.id));
      const lectureSnap = await getDocs(qLectures);
      const totalSessionsOccurred = lectureSnap.size;

      // الثابت الجديد: إجمالي محاضرات الترم
      const totalSemesterLectures = 24; 

      const studentDataList = [];
      for (const enrDoc of enrollSnap.docs) {
        const sId = enrDoc.data().studentId;
        const uDoc = await getDoc(doc(db, "users", sId));
        const fullName = uDoc.exists() ? uDoc.data().fullName : "Unknown";

        const qAttend = query(collection(db, "attendance"), 
          where("studentId", "==", sId), 
          where("courseId", "==", course.id)
        );
        const attendSnap = await getDocs(qAttend);
        const presenceCount = attendSnap.size;
        
        // عدد الغيابات من اللي فات فعلياً
        const absenceCount = totalSessionsOccurred - presenceCount;

        // الحسبة الجديدة: القسمة على 24 دايماً
        const absencePercentage = (absenceCount / totalSemesterLectures) * 100;

        const qGrade = query(collection(db, "grades"), 
          where("studentId", "==", sId), 
          where("courseId", "==", course.id)
        );
        const gradeSnap = await getDocs(qGrade);
        const grade = gradeSnap.empty ? "N/A" : gradeSnap.docs[0].data().score;

        studentDataList.push({
          id: sId,
          name: fullName,
          presence: presenceCount,
          absence: absenceCount,
          absenceRate: absencePercentage.toFixed(1),
          warning: getWarningStatus(absencePercentage),
          grade: grade
        });
      }
      setStudents(studentDataList);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a3a8a" /></View>;

  if (!selectedCourse) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#1a3a8a" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Absence Analytics</Text>
        <View style={{width: 40}} />
      </View>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.courseCard} onPress={() => handleCourseSelect(item)}>
            <View style={styles.courseIcon}><Ionicons name="analytics" size={24} color="#1a3a8a" /></View>
            <Text style={styles.courseName}>{item.name || item.courseName}</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedCourse(null)} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#1a3a8a" /></TouchableOpacity>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.headerTitle}>Student Tracking</Text>
          <Text style={styles.courseSubtitle}>{selectedCourse.name || selectedCourse.courseName}</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput style={styles.searchInput} placeholder="Search by name..." value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <FlatList 
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={[styles.studentCard, item.warning && { borderColor: item.warning.color, borderLeftWidth: 5 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{item.name}</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Absence Rate: </Text>
                <Text style={[styles.infoVal, parseFloat(item.absenceRate) >= 10 && {color: '#ef4444'}]}>{item.absenceRate}%</Text>
              </View>
              {item.warning && (
                <View style={[styles.warningBadge, {backgroundColor: item.warning.color}]}>
                  <Text style={styles.warningText}>{item.warning.label}</Text>
                </View>
              )}
            </View>

            <View style={styles.statsColumn}>
              <View style={styles.statBox}><Text style={styles.statLabel}>P</Text><Text style={[styles.statValue, {color: '#22c55e'}]}>{item.presence}</Text></View>
              <View style={styles.statBox}><Text style={styles.statLabel}>A</Text><Text style={[styles.statValue, {color: '#ef4444'}]}>{item.absence}</Text></View>
              <View style={styles.statBox}><Text style={styles.statLabel}>G</Text><Text style={[styles.statValue, {color: '#1a3a8a'}]}>{item.grade}</Text></View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  courseSubtitle: { fontSize: 11, color: '#64748b', fontWeight: 'bold' },
  courseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 12, elevation: 2 },
  courseIcon: { width: 45, height: 45, backgroundColor: '#eef6ff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  courseName: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#1a3a8a' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 20, paddingHorizontal: 15, borderRadius: 15, height: 45, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  studentCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 15, marginBottom: 12, elevation: 2 },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#64748b' },
  infoVal: { fontSize: 12, fontWeight: 'bold' },
  warningBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  warningText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  statsColumn: { justifyContent: 'space-around', gap: 5, borderLeftWidth: 1, borderLeftColor: '#f1f5f9', paddingLeft: 15 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: 'bold' },
  statValue: { fontSize: 13, fontWeight: 'bold' }
});