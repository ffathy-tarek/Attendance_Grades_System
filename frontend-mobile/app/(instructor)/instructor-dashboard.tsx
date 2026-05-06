import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"; 
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { Ionicons } from '@expo/vector-icons';

export default function InstructorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ attendanceRate: 0, lectures: 0, subjects: 0 });
  const [userName, setUserName] = useState(""); 
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        setLoading(false);
        router.replace('/');
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserName(userSnap.data().fullName);
        }

        const qSubjects = query(collection(db, "courses"), where("instructorIds", "array-contains", user.uid));
        const qLectures = query(collection(db, "lecture_sessions"), where("instructorId", "==", user.uid));

        const [subSnap, lecSnap] = await Promise.all([
          getDocs(qSubjects),
          getDocs(qLectures)
        ]);

        const courseIds = subSnap.docs.map(d => d.id);
        
        let rate = 0;
        if (courseIds.length > 0 && lecSnap.size > 0) {
          const qAttendance = query(collection(db, "attendance"), where("courseId", "in", courseIds));
          const attendSnap = await getDocs(qAttendance);

          const qEnroll = query(collection(db, "enrollments"), where("courseId", "in", courseIds));
          const enrollSnap = await getDocs(qEnroll);

          const totalExpected = enrollSnap.size * lecSnap.size;
          rate = totalExpected > 0 ? Math.round((attendSnap.size / totalExpected) * 100) : 0;
        }

        setStats({
          subjects: subSnap.size,
          attendanceRate: rate, 
          lectures: lecSnap.size
        });
      } catch (error) {
        console.error("Fetch Error: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a3a8a" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome Back,</Text>
            <Text style={styles.userName}>Dr. {userName || "Instructor"}</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/profile')}>
              <Ionicons name="person-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.headerBtn, { marginLeft: 10 }]} onPress={() => auth.signOut().then(() => router.replace('/'))}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.roleTitle}>DashBoard</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        
        <View style={styles.statsContainer}>
          <StatCard icon="book" label="Subjects" value={stats.subjects} color="#4361ee" />
          <StatCard icon="analytics" label="Attend %" value={stats.attendanceRate + "%"} color="#3f37c9" />
          <StatCard icon="videocam" label="Sessions" value={stats.lectures} color="#4895ef" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Main Activaties</Text>
          
          <TouchableOpacity style={styles.actionCardLarge} onPress={() => router.push('/lectures')}>
            <View style={styles.iconCircle}>
              <Ionicons name="qr-code" size={30} color="#1a3a8a" />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.actionTitle}>Lectures Center</Text>
              <Text style={styles.actionSub}>Generate QR and check history</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <View style={styles.actionList}>
            <ActionListItem icon="clipboard-outline" title="Manual Attendance" onPress={() => router.push('/attendance')} />
            <ActionListItem icon="document-text-outline" title="Gradebook Manager" onPress={() => router.push('/add-grades')} />
            <ActionListItem icon="list-outline" title="Student List" onPress={() => router.push('/students-list')} />
            <ActionListItem icon="star-outline" title="Student Reviews" onPress={() => router.push('/instructor-reviews')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ icon, label, value, color }: any) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Ionicons name={icon} size={22} color={color} style={styles.statIcon} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statNumber}>{value}</Text>
  </View>
);

const ActionListItem = ({ icon, title, onPress }: any) => (
  <TouchableOpacity style={styles.actionCardListItem} onPress={onPress}>
    <Ionicons name={icon} size={22} color="#1a3a8a" />
    <Text style={styles.actionTextList}>{title}</Text>
    <Ionicons name="chevron-forward" size={18} color="#ccc" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1a3a8a', paddingTop: Platform.OS === 'web' ? 30 : 50, paddingHorizontal: 25, paddingBottom: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  greeting: { color: '#e2e8f0', fontSize: 13 },
  userName: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 },
  roleTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20 },
  statCard: { width: '30%', padding: 15, backgroundColor: '#fff', borderRadius: 15, elevation: 2, borderLeftWidth: 4 },
  statIcon: { marginBottom: 8 },
  statLabel: { color: '#64748b', fontSize: 11 },
  statNumber: { color: '#1e293b', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  section: { paddingHorizontal: 20, paddingTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  actionCardLarge: { backgroundColor: '#fff', borderRadius: 15, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 15, elevation: 2 },
  iconCircle: { width: 55, height: 55, backgroundColor: '#eef6ff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a3a8a' },
  actionSub: { fontSize: 11, color: '#7f8c8d', marginTop: 2 },
  actionList: { gap: 12 },
  actionCardListItem: { backgroundColor: '#fff', borderRadius: 15, padding: 18, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  actionTextList: { color: '#1a3a8a', fontWeight: 'bold', marginLeft: 12, fontSize: 14, flex: 1 }
});