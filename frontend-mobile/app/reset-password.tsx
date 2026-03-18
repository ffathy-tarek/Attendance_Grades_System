import { useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function ResetPassword() {
  const router = useRouter(); 
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      const msg = "Please fill all fields.";
      return Platform.OS === 'web' ? alert(msg) : Alert.alert("Required", msg);
    }

    if (newPassword !== confirmPassword) {
      const msg = "New passwords do not match!";
      return Platform.OS === 'web' ? alert(msg) : Alert.alert("Match Error", msg);
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      const msg = "Session expired. Please login again.";
      return Platform.OS === 'web' ? alert(msg) : Alert.alert("Error", msg);
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { password: newPassword }, { merge: true });
      } catch (dbError) {
        console.log("Database update ignored:", dbError);
      }

      setLoading(false);
      const successMsg = "Password updated successfully! ✅";
      
      if (Platform.OS === 'web') {
        alert(successMsg);
        router.back(); 
      } else {
        Alert.alert("Success", successMsg, [{ text: "OK", onPress: () => router.back() }]); // يرجعك بعد الضغط على OK
      }

    } catch (error) {
      setLoading(false);
      let failMsg = "Update failed. Check your connection.";
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          failMsg = "The old password you entered is incorrect.";
        }
      }
      Platform.OS === 'web' ? alert(failMsg) : Alert.alert("Error", failMsg);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Secure Reset</Text>
        
        <Text style={styles.label}>Old Password</Text>
        <TextInput style={styles.input} secureTextEntry placeholder="Type old password" onChangeText={setOldPassword} autoCapitalize="none" />

        <Text style={styles.label}>New Password</Text>
        <TextInput style={styles.input} secureTextEntry placeholder="New password" onChangeText={setNewPassword} autoCapitalize="none" />

        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput style={styles.input} secureTextEntry placeholder="Repeat new password" onChangeText={setConfirmPassword} autoCapitalize="none" />

        <TouchableOpacity style={styles.btn} onPress={handleUpdate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Apply Change</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ marginTop: 25, padding: 10 }}
        >
          <Text style={{ color: '#1a3a8a', textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>Cancel & Go Back</Text>
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
  input: { height: 48, borderWidth: 1.2, borderColor: '#ddd', borderRadius: 8, paddingLeft: 12, marginBottom: 18, backgroundColor: '#fff', color: '#000' },
  btn: { height: 50, backgroundColor: '#1a3a8a', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});