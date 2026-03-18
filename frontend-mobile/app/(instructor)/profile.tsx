import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Platform } from "react-native";
import { auth, db } from "../../firebaseConfig"; 
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        router.replace('/');
      }
    };
    fetchUserData();
  }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a3a8a" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a3a8a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instructor Profile</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : "I"}
            </Text>
          </View>
          <Text style={styles.userName}>Dr. {userData?.fullName || "Instructor"}</Text>
          <Text style={styles.userEmail}>{userData?.email}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color="#64748b" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{userData?.department || "Not Specified"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#64748b" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{userData?.role || "Instructor"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => router.push('/reset-password' as any)} 
          >
            <Ionicons name="lock-closed-outline" size={20} color="#1a3a8a" />
            <Text style={styles.actionBtnText}>Change Password 🔐</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.logoutBtn]} 
            onPress={() => auth.signOut().then(() => router.replace('/'))}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: Platform.OS === 'web' ? 20 : 10,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  content: { padding: 25 },
  avatarSection: { alignItems: 'center', marginBottom: 35 },
  avatarCircle: { 
    width: 100, 
    height: 100, 
    backgroundColor: '#1a3a8a', 
    borderRadius: 50, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1
  },
  avatarLetter: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  userEmail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  infoSection: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 30, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  infoTextContainer: { marginLeft: 15 },
  infoLabel: { fontSize: 12, color: '#94a3b8' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  buttonSection: { gap: 15 },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  actionBtnText: { marginLeft: 10, fontWeight: 'bold', color: '#1a3a8a', fontSize: 15 },
  logoutBtn: { borderColor: '#fee2e2', backgroundColor: '#fff' }
});