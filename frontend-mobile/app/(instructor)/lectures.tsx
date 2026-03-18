import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, ScrollView } from "react-native";
import { auth, db } from "../../firebaseConfig"; 
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, doc, updateDoc, GeoPoint, getDoc } from "firebase/firestore";
import * as Location from 'expo-location'; 
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

interface LectureSession {
  id: string;
  courseId: string;
  courseName: string;
  status: 'active' | 'ended';
  durationMinutes: string;
  startTime: any;
  endTime?: any;
  instructorLocation?: any;
  attendanceCount?: number;
}

export default function LecturesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<LectureSession[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [activeSession, setActiveSession] = useState<LectureSession | null>(null);
  const [isQRVisible, setIsQRVisible] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState("1 hour");

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [attendedStudents, setAttendedStudents] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qHistory = query(collection(db, "lecture_sessions"), where("instructorId", "==", user.uid));
    const unsub = onSnapshot(qHistory, async (snap) => {
      const docs = await Promise.all(snap.docs.map(async (d) => {
        const qAttend = query(collection(db, "attendance"), where("sessionId", "==", d.id));
        const attendSnap = await getDocs(qAttend);
        return { id: d.id, ...d.data(), attendanceCount: attendSnap.size } as LectureSession;
      }));

      const sortedDocs = docs.sort((a, b) => (b.startTime?.seconds || 0) - (a.startTime?.seconds || 0));
      setHistory(sortedDocs);
      
      const active = sortedDocs.find(d => d.status === 'active');
      setActiveSession(active || null);
      setLoading(false);
    });

    const fetchCourses = async () => {
      const qC = query(collection(db, "courses"), where("instructorIds", "array-contains", user.uid));
      const cSnap = await getDocs(qC);
      setCourses(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchCourses();
    return () => unsub();
  }, []);

  const calculateDuration = (start: any, end: any) => {
    if (!start || !end) return "N/A";
    const diff = end.seconds - start.seconds;
    const mins = Math.floor(diff / 60);
    return mins < 60 ? `${mins} mins` : `${Math.floor(mins/60)}h ${mins%60}m`;
  };

  const showAttendanceDetails = async (session: LectureSession) => {
    if (session.status === 'active') { setIsQRVisible(true); return; }
    setDetailsLoading(true);
    setDetailsModalVisible(true);
    try {
      const q = query(collection(db, "attendance"), where("sessionId", "==", session.id));
      const snap = await getDocs(q);
      const list = [];
      for (const d of snap.docs) {
        const uDoc = await getDoc(doc(db, "users", d.data().studentId));
        if (uDoc.exists()) {
          list.push({ 
            id: uDoc.id, 
            name: uDoc.data().fullName, 
            time: d.data().timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
          });
        }
      }
      setAttendedStudents(list);
    } catch (e) { console.error(e); }
    setDetailsLoading(false);
  };

  const startSession = async (course: any) => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert("Error", "Location Required"); setLoading(false); return; }
      let loc = await Location.getCurrentPositionAsync({});

      await addDoc(collection(db, "lecture_sessions"), {
        courseId: course.id,
        courseName: course.name || course.courseName,
        instructorId: auth.currentUser?.uid,
        startTime: serverTimestamp(),
        status: "active",
        durationMinutes: selectedDuration, 
        instructorLocation: new GeoPoint(loc.coords.latitude, loc.coords.longitude) // GeoPoint
      });
      setShowCoursePicker(false);
      setIsQRVisible(true);
    } catch (e) { Alert.alert("Error", "Check Connection"); }
    setLoading(false);
  };

  const endSession = async () => {
    if (activeSession) {
      await updateDoc(doc(db, "lecture_sessions", activeSession.id), { status: "ended", endTime: serverTimestamp() });
      setIsQRVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#1a3a8a" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Lectures Center</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCoursePicker(true)}><Text style={styles.newBtnTxt}>+ New</Text></TouchableOpacity>
      </View>

      {activeSession && (
        <TouchableOpacity style={styles.liveBar} onPress={() => setIsQRVisible(true)}>
          <Ionicons name="radio-button-on" size={18} color="#fff" />
          <Text style={styles.liveBarTxt}>Live: {activeSession.courseName} (Tap for QR)</Text>
        </TouchableOpacity>
      )}

      <FlatList data={history} keyExtractor={(item)=>item.id} contentContainerStyle={{padding:20}} renderItem={({item}) => {
          const dateStr = item.startTime?.toDate().toLocaleDateString() || "Date Loading...";
          return (
            <TouchableOpacity style={styles.card} onPress={() => showAttendanceDetails(item)}>
              <View style={{flex: 1}}>
                <Text style={styles.cardTitle}>{item.courseName}</Text>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailTxt}>{dateStr}</Text>
                  <Text style={[styles.detailTxt, {color: '#22c55e', fontWeight: 'bold'}]}>{item.attendanceCount} Attended</Text>
                  {item.status === 'ended' && <Text style={styles.detailTxt}>⏱ {calculateDuration(item.startTime, item.endTime)}</Text>}
                </View>
              </View>
              <Ionicons name={item.status === 'active' ? "qr-code" : "chevron-forward"} size={22} color={item.status === 'active' ? "#22c55e" : "#cbd5e1"} />
            </TouchableOpacity>
          );
      }} />

      <Modal visible={showCoursePicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Lecture Setup</Text>
          <Text style={styles.label}>Select Duration:</Text>
          <View style={styles.durationRow}>
            {["1 hour", "2 hours", "3 hours"].map(d => (
              <TouchableOpacity key={d} style={[styles.dChip, selectedDuration === d && styles.dChipActive]} onPress={() => setSelectedDuration(d)}>
                <Text style={{color: selectedDuration === d ? '#fff' : '#1a3a8a', fontWeight:'bold'}}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Select Subject:</Text>
          {courses.map(c=>(<TouchableOpacity key={c.id} style={styles.item} onPress={()=>startSession(c)}><Text style={{fontWeight:'bold', color:'#1a3a8a'}}>{c.name || c.courseName}</Text></TouchableOpacity>))}
          <TouchableOpacity onPress={()=>setShowCoursePicker(false)}><Text style={{color:'red', textAlign:'center', marginTop:15, fontWeight:'bold'}}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={detailsModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}><View style={styles.detailsContent}>
          <View style={styles.detailsHeader}>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1a3a8a'}}>Attendance List</Text>
            <TouchableOpacity onPress={() => setDetailsModalVisible(false)}><Ionicons name="close-circle" size={28} color="#94a3b8" /></TouchableOpacity>
          </View>
          {detailsLoading ? <ActivityIndicator color="#1a3a8a" /> : (
            <FlatList data={attendedStudents} keyExtractor={(s)=>s.id} renderItem={({item}) => (
              <View style={styles.studentItem}><Text style={{fontWeight: '600', color:'#1e293b'}}>{item.name}</Text><Text style={{fontSize: 12, color: '#94a3b8'}}>{item.time}</Text></View>
            )} />
          )}
        </View></View>
      </Modal>

      {activeSession && (
        <Modal visible={isQRVisible} animationType="fade">
          <View style={styles.qrContainer}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setIsQRVisible(false)}>
              <Ionicons name="close-circle" size={40} color="#cbd5e1" />
            </TouchableOpacity>

            <Text style={styles.qrTitle}>{activeSession.courseName}</Text>
            <View style={styles.qrBox}><QRCode value={activeSession.id} size={250} color="#1a3a8a" /></View>
            
            <View style={styles.gpsTag}>
              <Ionicons name="location" size={18} color="#22c55e" />
              <Text style={{color: '#22c55e', fontWeight: 'bold'}}>GPS Protection Enabled</Text>
            </View>

            <TouchableOpacity style={styles.manualBtn} onPress={() => { setIsQRVisible(false); router.push('/attendance'); }}>
              <Ionicons name="people-outline" size={22} color="#1a3a8a" />
              <Text style={styles.manualBtnTxt}>Go to Manual Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.endBtn} onPress={endSession}><Text style={{color:'#fff', fontWeight:'bold', fontSize: 16}}>Finish & Close Session</Text></TouchableOpacity>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 3 },
  backBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  newBtn: { backgroundColor: '#1a3a8a', padding: 10, borderRadius: 10 },
  newBtnTxt: { color: '#fff', fontWeight: 'bold' },
  liveBar: { backgroundColor: '#22c55e', padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  liveBarTxt: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 20, marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  cardTitle: { fontWeight: 'bold', color: '#1a3a8a', fontSize: 16 },
  detailsRow: { flexDirection: 'row', gap: 12, marginTop: 5 },
  detailTxt: { fontSize: 11, color: '#64748b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: '#fff', borderRadius: 25, padding: 25 },
  modalTitle: { fontWeight: 'bold', marginBottom: 20, textAlign: 'center', fontSize: 18, color: '#1a3a8a' },
  label: { fontSize: 12, color: '#64748b', fontWeight: 'bold', marginBottom: 8 },
  durationRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  dChip: { flex:1, padding: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  dChipActive: { backgroundColor: '#1a3a8a' },
  item: { padding: 18, backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  detailsContent: { backgroundColor: '#fff', borderRadius: 30, maxHeight: '80%', padding: 25 },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  studentItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  qrContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 30 },
  closeBtn: { position: 'absolute', top: 50, right: 30 },
  qrTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a3a8a', marginBottom: 40 },
  qrBox: { padding: 25, backgroundColor: '#fff', elevation: 20, borderRadius: 30 },
  gpsTag: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 5 },
  manualBtn: { marginTop: 40, padding: 18, borderRadius: 15, borderWidth: 1.5, borderColor: '#1a3a8a', width: '100%', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, backgroundColor: '#f0f7ff' },
  manualBtnTxt: { color: '#1a3a8a', fontWeight: 'bold' },
  endBtn: { marginTop: 15, backgroundColor: '#ef4444', padding: 20, borderRadius: 15, width: '100%', alignItems: 'center', elevation: 5 }
});