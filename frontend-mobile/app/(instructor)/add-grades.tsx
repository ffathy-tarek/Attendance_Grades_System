import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, Platform } from "react-native";
import { auth, db } from "../../firebaseConfig"; 
import { collection, query, where, getDocs, doc, setDoc, getDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function GradeManager() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentGrades, setStudentGrades] = useState<any[]>([]); 
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [assessmentName, setAssessmentName] = useState(""); 
  const [score, setScore] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, "courses"), where("instructorIds", "array-contains", user.uid));
      const snap = await getDocs(q);
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const handleCourseSelect = async (course: any) => {
    setSelectedCourse(course);
    setSelectedStudent(null);
    setStudentGrades([]);
    setLoading(true);
    const qEnroll = query(collection(db, "enrollments"), where("courseId", "==", course.id));
    const enrollSnap = await getDocs(qEnroll);
    const list = [];
    for (const enr of enrollSnap.docs) {
      const uDoc = await getDoc(doc(db, "users", enr.data().studentId));
      if (uDoc.exists()) list.push({ id: uDoc.id, name: uDoc.data().fullName });
    }
    setStudents(list);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedStudent && selectedCourse) {
      const q = query(collection(db, "grades"), where("studentId", "==", selectedStudent.id), where("courseId", "==", selectedCourse.id));
      const unsub = onSnapshot(q, (snap) => {
        setStudentGrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [selectedStudent, selectedCourse]);

const handleSaveGrade = async () => {
  if (!assessmentName || !score || !selectedStudent) {
    const msg = "Fill all fields";
    Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
    return;
  }

  const numScore = Number(score);
  let errorMsg = "";

  // الـ Logic اللي إنت طالبه (Mid: 10, Final: 60, Pract: 30)
  if (assessmentName === "Midterm" && numScore > 10) errorMsg = "Midterm maximum degree is 10";
  if (assessmentName === "Final" && numScore > 60) errorMsg = "Final maximum degree is 60";
  if (assessmentName === "Practical" && numScore > 30) errorMsg = "Practical maximum degree is 30";

  if (errorMsg) {
    // التعديل هنا: لو ويب هيطلع alert المتصفح العادي
    Platform.OS === 'web' ? alert(errorMsg) : Alert.alert("Error", errorMsg);
    return;
  }

  setSubmitting(true);
  try {
    const safeName = assessmentName.toLowerCase();
    const gradeId = `${selectedCourse.id}_${selectedStudent.id}_${safeName}`;
    await setDoc(doc(db, "grades", gradeId), {
      courseId: selectedCourse.id, 
      studentId: selectedStudent.id,
      assessmentName: assessmentName, 
      score: numScore,
      instructorId: auth.currentUser?.uid, 
      timestamp: new Date()
    });
    setScore("");
    Platform.OS === 'web' ? alert("Grade Saved Successfully!") : Alert.alert("Success", "Grade Saved!");
  } catch (e) { 
    Platform.OS === 'web' ? alert("Save failed") : Alert.alert("Error", "Save failed"); 
  }
  setSubmitting(false);
};

  const performDelete = async (gradeId: string) => {
    try {
      await deleteDoc(doc(db, "grades", gradeId));
    } catch (error) {
      Alert.alert("Error", "Could not delete");
    }
  };

  const handleDeleteGrade = (gradeId: string) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm("Are you sure you want to delete this grade?");
      if (confirmDelete) performDelete(gradeId);
    } else {
      Alert.alert("Delete", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => performDelete(gradeId) }
      ]);
    }
  };

  if (loading && courses.length === 0) return <View style={styles.center}><ActivityIndicator color="#1a3a8a" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#1a3a8a" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Gradebook</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.label}>1. Select Course</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ alignItems: 'flex-start' }} // الحل لعدم تمدد المربعات
          style={{marginBottom: 20}}
        >
          {courses.map(c => (
            <TouchableOpacity key={c.id} style={[styles.chip, selectedCourse?.id === c.id && styles.chipActive]} onPress={() => handleCourseSelect(c)}>
              <Text style={[styles.chipText, selectedCourse?.id === c.id && {color:'#fff'}]}>{c.name || c.courseName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedCourse && (
          <View>
            <View style={styles.persistentBox}>
              <Text style={styles.label}>Select Assessment Category:</Text>
              <View style={styles.categoryRow}>
                {["Midterm", "Practical", "Final"].map(cat => (
                  <TouchableOpacity key={cat} style={[styles.catBtn, assessmentName === cat && styles.catBtnActive]} onPress={() => setAssessmentName(cat)}>
                    <Text style={[styles.catText, assessmentName === cat && {color: '#fff'}]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={[styles.label, {marginTop: 20}]}>2. Select Student</Text>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput placeholder="Search..." style={{flex:1, marginLeft: 10}} value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            
            <View style={styles.studentListContainer}>
              <ScrollView nestedScrollEnabled={true}>
                {students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                  <TouchableOpacity key={s.id} style={[styles.studentRow, selectedStudent?.id === s.id && styles.studentRowActive]} onPress={() => setSelectedStudent(s)}>
                    <Text style={[styles.studentRowText, selectedStudent?.id === s.id && {color:'#fff'}]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {selectedStudent && (
              <View style={styles.gradeSection}>
                <Text style={styles.studentTitle}>{selectedStudent.name}'s Grades</Text>
                <View style={styles.gradesCard}>
                  {studentGrades.map((item) => (
                    <View key={item.id} style={styles.gradeLine}>
                      <TouchableOpacity style={{flex:1}} onPress={() => { setAssessmentName(item.assessmentName); setScore(item.score.toString()); }}>
                        <Text style={styles.gradeName}>{item.assessmentName}</Text>
                        <Text style={styles.gradeVal}>{item.score} Pts</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteGrade(item.id)} style={styles.deleteBtn}>
                        <Ionicons name="trash" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {studentGrades.length === 0 && <Text style={styles.empty}>No grades found.</Text>}
                </View>

                <View style={styles.entryRow}>
                  <TextInput style={[styles.input, {flex: 2}]} placeholder="Score" keyboardType="numeric" value={score} onChangeText={setScore} />
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGrade} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{color:'#fff', fontWeight:'bold'}}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 1 },
  backBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a3a8a' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 8 },
  chip: { padding: 12, borderRadius: 12, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#1a3a8a', borderColor: '#1a3a8a' },
  chipText: { fontSize: 13, color: '#1a3a8a', fontWeight: 'bold' },
  persistentBox: { backgroundColor: '#eef2ff', padding: 15, borderRadius: 15 },
  categoryRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  catBtn: { flex: 1, padding: 10, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  catBtnActive: { backgroundColor: '#1a3a8a', borderColor: '#1a3a8a' },
  catText: { fontSize: 12, fontWeight: 'bold', color: '#1a3a8a' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 15, elevation: 1 },
  studentListContainer: { 
    height: 180, // تثبيت الطول لمنع التداخل مع خانة السكور
    marginTop: 10, 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  studentRow: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  studentRowActive: { backgroundColor: '#1a3a8a' },
  studentRowText: { fontSize: 14, color: '#1e293b' },
  gradeSection: { marginTop: 20, paddingBottom: 20 },
  studentTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a3a8a', marginBottom: 10 },
  gradesCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, elevation: 1 },
  gradeLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  gradeName: { fontSize: 14, fontWeight: '600' },
  gradeVal: { fontSize: 13, color: '#22c55e', fontWeight: 'bold' },
  deleteBtn: { padding: 10 },
  entryRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  saveBtn: { flex: 1, backgroundColor: '#22c55e', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#cbd5e1', padding: 10 }
});