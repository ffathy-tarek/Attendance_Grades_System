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

  const handleCourseSelect = async (course: any) => {
    setLoading(true);
    setSelectedCourse(course);
    try {
      const qEnroll = query(collection(db, "enrollments"), where("courseId", "==", course.id));
      const enrollSnap = await getDocs(qEnroll);
      
      const qLectures = query(collection(db, "lecture_sessions"), where("courseId", "==", course.id));
      const lectureSnap = await getDocs(qLectures);
      const totalSessions = lectureSnap.size;

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
          absence: totalSessions - presenceCount,
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
        <Text style={styles.headerTitle}>Select Course</Text>
        <View style={{width: 40}} />
      </View>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.courseCard} onPress={() => handleCourseSelect(item)}>
            <View style={styles.courseIcon}><Ionicons name="book" size={24} color="#1a3a8a" /></View>
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
          <Text style={styles.headerTitle}>Students List</Text>
          <Text style={styles.courseSubtitle}>{selectedCourse.name || selectedCourse.courseName}</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search for student..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList 
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.studentCard}>
            <View style={styles.cardLeft}>
              <View style={styles.avatar}><Text style={styles.avatarTxt}>{item.name.charAt(0)}</Text></View>
              <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
            </View>
            <View style={styles.cardRight}>
              <View style={styles.statBox}><Text style={styles.statLabel}>P</Text><Text style={[styles.statValue, {color: '#22c55e'}]}>{item.presence}</Text></View>
              <View style={styles.statBox}><Text style={styles.statLabel}>A</Text><Text style={[styles.statValue, {color: '#ef4444'}]}>{item.absence}</Text></View>
              <View style={styles.statBox}><Text style={styles.statLabel}>Grade</Text><Text style={[styles.statValue, {color: '#1a3a8a'}]}>{item.grade}</Text></View>
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
  courseSubtitle: { fontSize: 12, color: '#64748b' },
  courseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 12, elevation: 2 },
  courseIcon: { width: 45, height: 45, backgroundColor: '#eef6ff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  courseName: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#1a3a8a' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 20, paddingHorizontal: 15, borderRadius: 15, height: 45, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  studentCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 15, marginBottom: 12, elevation: 2, alignItems: 'center' },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a3a8a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarTxt: { color: '#fff', fontWeight: 'bold' },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', maxWidth: '75%' },
  cardRight: { flexDirection: 'row', gap: 12, borderLeftWidth: 1, borderLeftColor: '#f1f5f9', paddingLeft: 12 },
  statBox: { alignItems: 'center' },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: 'bold', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: 'bold' }
});