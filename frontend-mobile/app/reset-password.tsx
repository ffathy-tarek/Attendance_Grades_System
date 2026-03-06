import { useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function ResetPassword() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return Alert.alert("Required", "Please fill all fields.");
    }

    if (newPassword !== confirmPassword) {
      return Alert.alert("Match Error", "New passwords do not match!");
    }

    const user = auth.currentUser;
    if (!user || !user.email) return Alert.alert("Error", "No active user found!");

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { password: newPassword });

      setLoading(false);
      Alert.alert("Success ✅", "Password has been updated successfully!");
      router.back();

    } catch (error: any) {
      setLoading(false);
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert("Security Alert", "The old password you entered is incorrect.");
      } else if (error.code === 'auth/network-request-failed') {
        Alert.alert("Connection Error", "Please check your internet connection.");
      } else {
        Alert.alert("Update Failed", "We couldn't update your password. Please try again later.");
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Secure Reset</Text>
        
        <Text style={styles.label}>Old Password</Text>
        <TextInput 
          style={styles.input} 
          secureTextEntry 
          placeholder="Type old password" 
          onChangeText={setOldPassword} 
          autoCapitalize="none"
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput 
          style={styles.input} 
          secureTextEntry 
          placeholder="New password" 
          onChangeText={setNewPassword} 
          autoCapitalize="none"
        />

        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput 
          style={styles.input} 
          secureTextEntry 
          placeholder="Repeat new password" 
          onChangeText={setConfirmPassword} 
          autoCapitalize="none"
        />


        <TouchableOpacity style={styles.btn} onPress={handleUpdate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Apply Change</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#1a3a8a', textAlign: 'center', fontWeight: 'bold' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 25, elevation: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a3a8a', marginBottom: 25, textAlign: 'center' },
  label: { color: '#333', fontWeight: '600', marginBottom: 5, fontSize: 13 },
  input: { height: 48, borderWidth: 1.2, borderColor: '#ddd', borderRadius: 8, paddingLeft: 12, marginBottom: 18, backgroundColor: '#fff' },
  btn: { height: 50, backgroundColor: '#1a3a8a', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});