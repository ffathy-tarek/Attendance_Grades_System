import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

export default function AddRequest() {
    const router = useRouter();
    const [role, setRole] = useState('student'); 
    const [name, setName] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [uniCode, setUniCode] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const submitData = async () => {
      // 1. التأكد من إدخال جميع البيانات
      if (!name || !nationalId || !email || !password) {
        return Alert.alert("Input Error", "All fields are required!");
      }

      // 2. فحص طول رقم البطاقة
      if (nationalId.length !== 14) {
        return Alert.alert("Security Error", "National ID must be exactly 14 digits!");
      }

      // 3. فحص كود الجامعة إذا كان المتقدم طالباً
      if (role === 'student' && !uniCode) {
        return Alert.alert("Input Error", "Please enter your University Code!");
      }

      // 4. فحص صيغة الإيميل باستخدام Regex
      const emailRegex = /\S+@\S+\.\S+/;
      if (!emailRegex.test(email.trim())) {
        return Alert.alert("Format Error", "Please enter a valid email address!");
      }

      setLoading(true);
      try {
        await addDoc(collection(db, "requests"), {
          fullName: name,
          nationalID: nationalId,
          role: role,
          universityCode: role === 'student' ? uniCode : "N/A",
          email: email.trim().toLowerCase(),
          password: password, 
          status: "pending",
          type: "new_registration",
          createdAt: serverTimestamp()
        });
        setLoading(false);
        Alert.alert("Success", "Request sent! Wait for Admin approval.");
        router.back();
      } catch (e) {
        setLoading(false);
        Alert.alert("Firebase Error", "Failed to send request. Check your connection.");
      }
    };

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Create New Request</Text>
          
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your name" 
            placeholderTextColor="#999" 
            onChangeText={setName} 
          />
          
          <Text style={styles.label}>National ID (14 Digits)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="305xxxxxxxxxxx" 
            placeholderTextColor="#999" 
            keyboardType="numeric" 
            maxLength={14} 
            onChangeText={setNationalId} 
          />

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
              <TextInput 
                style={styles.input} 
                placeholder="Ex: 20210001" 
                placeholderTextColor="#999" 
                keyboardType="numeric" 
                onChangeText={setUniCode} 
              />
            </>
          )}

          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder={role === 'instructor' ? "name@sci.edu.eg" : "code@std.sci.edu.eg"} 
            placeholderTextColor="#999" 
            keyboardType="email-address" 
            autoCapitalize="none"
            onChangeText={setEmail} 
          />

          <Text style={styles.label}>Account Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Create a strong password" 
            placeholderTextColor="#999" 
            secureTextEntry={true} 
            onChangeText={setPassword} 
          />

          <TouchableOpacity style={styles.btn} onPress={submitData} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Join Request</Text>}
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