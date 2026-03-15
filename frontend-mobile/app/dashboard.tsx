import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [studentCount, setStudentCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);

  useEffect(() => {
    const qStudents = query(collection(db, "users"), where("role", "==", "student"));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudentCount(snap.size);
    });

    const unsubCourses = onSnapshot(collection(db, "courses"), (snap) => {
      setCourseCount(snap.size);
    });

    return () => {
      unsubStudents();
      unsubCourses();
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)}>
          <Text style={styles.hamburger}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard Overview</Text>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {menuOpen && (
          <View style={styles.sideMenu}>
            <View>
              <Text style={styles.menuItem}>🏠 Home</Text>
              <Text style={styles.menuItem}>👥 Students</Text>
              <Text style={styles.menuItem}>📅 Attendance</Text>
            </View>

            <View>
             <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/')}>
                <Text style={styles.logoutText}> Logout</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resetBtn} 
                onPress={() => router.push('/reset-password')}
              >
                <Text style={styles.resetBtnText}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView style={styles.content}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{studentCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>
          
          <View style={[styles.statCard, { borderLeftColor: '#2e7d32' }]}>
            {/* الرقم بقى ديناميكي */}
            <Text style={styles.statNum}>{courseCount}</Text>
            <Text style={styles.statLabel}>Total Courses</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' }, // تحديث بسيط للون الخلفية ليطابق الويب
  header: { height: 60, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, elevation: 2, marginTop: 40 },
  hamburger: { fontSize: 28, color: '#1a3a8a', marginRight: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sideMenu: { width: 160, backgroundColor: '#1a3a8a', padding: 20, justifyContent: 'space-between' },
  menuItem: { color: '#fff', fontSize: 15, marginBottom: 25 },
  logoutBtn: { borderTopWidth: 1, borderTopColor: '#3d5afe', paddingTop: 20, marginBottom: 10 },
  logoutText: { color: '#ff5252', fontWeight: 'bold' },
  resetBtn: { backgroundColor: '#4a90e2', padding: 10, borderRadius: 8, marginTop: 10 },
  resetBtnText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 12 },
  content: { flex: 1, padding: 20 },
  statCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#1a3a8a' },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 13, color: '#666' }
});