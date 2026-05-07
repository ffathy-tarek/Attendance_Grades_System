import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { auth, db } from "../firebaseConfig"; 
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { askAI } from '../services/ChatBot'; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AIChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState([{ id: '1', text: 'Hello! I am your AI Academic Assistant. How can I help you today?', sender: 'ai' }]);
  const [input, setInput] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [personalData, setPersonalData] = useState<any[]>([]);
  const [personalStats, setPersonalStats] = useState<any>({});

  useEffect(() => {
    const fetchComprehensiveData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.data()?.role;

        if (role === "instructor") {
          const qC = query(collection(db, "courses"), where("instructorIds", "array-contains", user.uid));
          const coursesSnap = await getDocs(qC);

          const report = await Promise.all(coursesSnap.docs.map(async (cDoc) => {
            const courseId = cDoc.id;
            const enrollSnap = await getDocs(query(collection(db, "enrollments"), where("courseId", "==", courseId)));
            
            const studentDetails = await Promise.all(enrollSnap.docs.map(async (enr) => {
              const sId = enr.data().studentId;
              const [sDoc, gSnap, aSnap] = await Promise.all([
                getDoc(doc(db, "users", sId)),
                getDocs(query(collection(db, "grades"), where("studentId", "==", sId), where("courseId", "==", courseId))),
                getDocs(query(collection(db, "attendance"), where("studentId", "==", sId), where("courseId", "==", courseId)))
              ]);
              return {
                name: sDoc.data()?.fullName || "Unknown",
                grades: gSnap.docs.map(g => ({ type: g.data().assessmentName, score: g.data().score })),
                attendanceCount: aSnap.size
              };
            }));
            return { courseName: cDoc.data().name, students: studentDetails };
          }));
          setPersonalData(report);
          setPersonalStats({ role: 'instructor', totalCourses: coursesSnap.size });

        } else {
          const enrollSnap = await getDocs(query(collection(db, "enrollments"), where("studentId", "==", user.uid)));
          const report = await Promise.all(enrollSnap.docs.map(async (enr) => {
            const cId = enr.data().courseId;
            const [cDoc, gSnap, aSnap, sSnap] = await Promise.all([
              getDoc(doc(db, "courses", cId)),
              getDocs(query(collection(db, "grades"), where("studentId", "==", user.uid), where("courseId", "==", cId))),
              getDocs(query(collection(db, "attendance"), where("studentId", "==", user.uid), where("courseId", "==", cId))),
              getDocs(query(collection(db, "lecture_sessions"), where("courseId", "==", cId)))
            ]);
            
            // --- التعديل الجديد هنا ---
            const totalSessionsOccurred = sSnap.size;
            const present = aSnap.size;
            const absent = totalSessionsOccurred - present;
            const totalSemesterLectures = 24; 

            return {
              courseName: cDoc.data()?.name || "Unknown",
              grades: gSnap.docs.map(g => ({ type: g.data().assessmentName, score: g.data().score })),
              attendance: {
                present,
                absent,
                totalOccurred: totalSessionsOccurred,
                totalSemester: totalSemesterLectures,
                percent: Math.round((present / totalSemesterLectures) * 100)
              }
            };
            // ------------------------
          }));
          setPersonalData(report);
          setPersonalStats({ role: 'student' });
        }
      } catch (error) {
        console.error("Data Sync Error:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchComprehensiveData();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loadingAI) return;
    const userMsg = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoadingAI(true);
    const response = await askAI(input, personalData, personalStats);
    const aiMsg = { id: (Date.now() + 1).toString(), text: response, sender: 'ai' };
    setMessages(prev => [...prev, aiMsg]);
    setLoadingAI(false);
  };

  if (loadingData) return <View style={styles.center}><ActivityIndicator size="large" color="#1a3a8a" /></View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackActionButton}>
            <Ionicons name="arrow-back" size={24} color="#1a3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Academic Assistant</Text>
          <View style={{ width: 42 }} />
        </View>

        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={item.sender === 'user' ? styles.userText : styles.aiText}>{item.text}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 20 }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
          />
          <TouchableOpacity onPress={handleSend} disabled={loadingAI}>
            {loadingAI ? <ActivityIndicator size="small" color="#1a3a8a" /> : <Ionicons name="send" size={24} color="#1a3a8a" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 500,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#e2e8f0'
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: Platform.OS === 'ios' ? 10 : 15, 
  },
  headerBackActionButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f1f5f9', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a3a8a',
    textAlign: 'center',
    flex: 1,
  },
  bubble: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1a3a8a', borderBottomRightRadius: 2 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0', borderBottomLeftRadius: 2 },
  userText: { color: 'white', fontSize: 15 },
  aiText: { color: '#1e293b', fontSize: 15 },
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: 'white', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, marginRight: 10, fontSize: 16 }
});