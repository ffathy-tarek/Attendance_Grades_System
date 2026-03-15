import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function ForgotPass() {
  const router = useRouter();
  const [natId, setNatId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!natId || !email || !phone) {
      const msg = "Please fill all fields first.";
      return Platform.OS === 'web' ? alert(msg) : Alert.alert("Missing Info", msg);
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      
      await addDoc(collection(db, "passwordRequests"), {
        nationalId: natId,     
        mobileNumber: phone,
        email: email.trim().toLowerCase(),
        type: "password_reset",
        status: "pending",
        createdAt: serverTimestamp()
      });

      setLoading(false);
      const successMsg = "A reset link has been sent to your email!";
      if (Platform.OS === 'web') {
          alert(successMsg);
      } else {
          Alert.alert("Success", successMsg);
      }
      router.back();
    } catch (e) {
      setLoading(false);
      const failMsg = "Check your data and connection.";
      if (Platform.OS === 'web') {
          alert(failMsg);
      } else {
          Alert.alert("Reset Failed", failMsg);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Recovery Account</Text>
        <Text style={styles.label}>National ID (14 digits)</Text>
        <TextInput style={styles.input} placeholder="305xxxxxxxxxxx" placeholderTextColor="#999" keyboardType="numeric" maxLength={14} onChangeText={setNatId} />
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput style={styles.input} placeholder="01xxxxxxxxx" placeholderTextColor="#999" keyboardType="phone-pad" onChangeText={setPhone} />
        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} placeholder="name or code@std.sci.edu.eg" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" onChangeText={setEmail} />
        <TouchableOpacity style={styles.btn} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#1a3a8a', textAlign: 'center', fontWeight: 'bold' }}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a3a8a', marginBottom: 25, textAlign: 'center' },
  label: { color: '#444', fontWeight: 'bold', marginBottom: 8, fontSize: 13 },
  input: { height: 50, borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, paddingLeft: 15, marginBottom: 20, color: '#000', backgroundColor: '#fafafa' },
  btn: { height: 55, backgroundColor: '#1a3a8a', justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});