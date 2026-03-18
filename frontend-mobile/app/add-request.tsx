import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { db } from '../firebaseConfig';

export default function AddRequest() {
    const router = useRouter();
    const [role, setRole] = useState('student'); 
    const [name, setName] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [uniCode, setUniCode] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const submitData = async () => {
      // 1. فحص البيانات الأساسية
      if (!name || !nationalId || !email) {
        const msg = "All fields are required!";
        if (Platform.OS === 'web') { alert(msg); } else { Alert.alert("Input Error", msg); }
        return;
      }

      if (nationalId.length !== 14) {
        const msg = "National ID must be exactly 14 digits!";
        if (Platform.OS === 'web') { alert(msg); } else { Alert.alert("Security Error", msg); }
        return;
      }

      const emailLower = email.trim().toLowerCase();
      const studentDomain = "@std.sci.cu.edu.eg";
      const instructorDomain = "@sci.cu.edu.eg";

      if (role === 'student') {
          if (!emailLower.endsWith(studentDomain)) {
              const msg = `Students must use an email ending with ${studentDomain}`;
              if (Platform.OS === 'web') { alert(msg); } else { Alert.alert("Email Error", msg); }
              return;
          }
      } else if (role === 'instructor') {
          if (!emailLower.endsWith(instructorDomain) || emailLower.includes("@std.")) {
              const msg = `Instructors must use an email ending with ${instructorDomain} (without 'std')`;
              if (Platform.OS === 'web') { alert(msg); } else { Alert.alert("Email Error", msg); }
              return;
          }
      }

      setLoading(true);
      try {
        await addDoc(collection(db, "emailRequests"), {
          name: name,             
          nationalId: nationalId, 
          role: role,
          code: role === 'student' ? uniCode : "N/A", 
          email: emailLower,
          status: "pending",
          type: "new_registration",
          createdAt: serverTimestamp()
        });

        setLoading(false);
        const successMsg = "Request sent! Wait for Admin approval.";
        
        if (Platform.OS === 'web') {
            alert(successMsg);
            router.back();
        } else {
            Alert.alert("Success", successMsg, [{ text: "OK", onPress: () => router.back() }]);
        }

      } catch (e) {
        setLoading(false);
        const errorMsg = "Failed to send request. Check your connection.";
        if (Platform.OS === 'web') { alert(errorMsg); } else { Alert.alert("Error", errorMsg); }
      }
    };

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Create New Request</Text>
          
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} placeholder="Enter your name" placeholderTextColor="#999" onChangeText={setName} />
          
          <Text style={styles.label}>National ID (14 Digits)</Text>
          <TextInput style={styles.input} placeholder="305xxxxxxxxxxx" placeholderTextColor="#999" keyboardType="numeric" maxLength={14} onChangeText={setNationalId} />

          <Text style={styles.label}>Role Selection</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity style={[styles.roleBtn, role === 'student' && styles.activeRole]} onPress={() => setRole('student')}>
              <Text style={[styles.roleText, role === 'student' && styles.activeText]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleBtn, role === 'instructor' && styles.activeRole]} onPress={() => setRole('instructor')}>
              <Text style={[styles.roleText, role === 'instructor' && styles.activeText]}>Instructor</Text>
            </TouchableOpacity>
          </View>

          {role === 'student' && (
            <>
              <Text style={styles.label}>University ID Code</Text>
              <TextInput style={styles.input} placeholder="Ex: 20210001" placeholderTextColor="#999" keyboardType="numeric" onChangeText={setUniCode} />
            </>
          )}

          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder={role === 'instructor' ? "name@sci.cu.edu.eg" : "code@std.sci.cu.edu.eg"} 
            placeholderTextColor="#999" 
            keyboardType="email-address" 
            autoCapitalize="none"
            onChangeText={setEmail} 
          />

          <TouchableOpacity style={styles.btn} onPress={submitData} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Join Request</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: '#1a3a8a', textAlign: 'center', fontWeight: 'bold' }}>Cancel & Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#f0f2f5', justifyContent: 'center', padding: 20 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1a3a8a', marginBottom: 25, textAlign: 'center' },
    label: { color: '#444', fontWeight: 'bold', marginBottom: 8, fontSize: 13, marginLeft: 2 },
    input: { height: 50, borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, paddingLeft: 15, marginBottom: 20, color: '#000', backgroundColor: '#fafafa' },
    roleRow: { flexDirection: 'row', marginBottom: 25, gap: 10 },
    roleBtn: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#eee', borderRadius: 12 },
    activeRole: { backgroundColor: '#1a3a8a', borderColor: '#1a3a8a' },
    roleText: { color: '#888', fontWeight: 'bold' },
    activeText: { color: '#fff' },
    btn: { height: 55, backgroundColor: '#1a3a8a', justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginTop: 10 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});