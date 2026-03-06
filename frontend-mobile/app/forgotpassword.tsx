import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function ForgotPass() {
  const router = useRouter();
  const [natId, setNatId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!natId || !email || !phone) {
      return Alert.alert("Missing Info", "Please fill all fields first.");
    }

    if (natId.length !== 14) {
      return Alert.alert("Input Error", "National ID must be exactly 14 digits!");
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email.trim())) {
      return Alert.alert("Format Error", "Please enter a valid email address!");
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());

      await addDoc(collection(db, "requests"), {
        nationalID: natId,
        mobileNumber: phone,
        email: email.trim().toLowerCase(),
        type: "password_reset",
        status: "pending",
        createdAt: serverTimestamp()
      });

      setLoading(false);
      Alert.alert("Success", "A reset link has been sent to your email!");
      router.back();
    } catch (e: any) {
      setLoading(false);
      let errorMessage = "Check your data and connection.";
      if (e.code === 'auth/user-not-found') {
        errorMessage = "This email is not registered in our system.";
      } else if (e.code === 'auth/invalid-email') {
        errorMessage = "The email address is badly formatted.";
      }
      Alert.alert("Reset Failed", errorMessage);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Recovery Account</Text>
        
        <Text style={styles.label}>National ID (14 digits)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="305xxxxxxxxxxx" 
          placeholderTextColor="#999" 
          keyboardType="numeric" 
          maxLength={14} 
          onChangeText={setNatId} 
        />
        
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput 
          style={styles.input} 
          placeholder="01xxxxxxxxx" 
          placeholderTextColor="#999" 
          keyboardType="phone-pad" 
          onChangeText={setPhone} 
        />
        
        <Text style={styles.label}>Email Address</Text>
        <TextInput 
          style={styles.input} 
          placeholder="name or code@std.sci.edu.eg" 
          placeholderTextColor="#999" 
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setEmail} 
        />
        
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