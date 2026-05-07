import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, StatusBar, Platform, Image, Alert } from "react-native";
import { auth, db } from "../../firebaseConfig"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); 
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      router.replace('/');
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'web') {
      const choice = window.confirm("Press OK to choose a new photo, or Cancel to remove the current one.");
      if (choice) {
        pickImage();
      } else {
        const confirmRemove = window.confirm("Are you sure you want to remove your photo?");
        if (confirmRemove) removeImage();
      }
    } else {
      Alert.alert(
        "Profile Picture",
        "Select an option",
        [
          { text: "Choose from Library", onPress: pickImage },
          { text: "Remove Photo", onPress: removeImage, style: "destructive" },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      updateProfileImage(result.assets[0].uri);
    }
  };

  const removeImage = async () => {
    updateProfileImage(null);
  };

  const updateProfileImage = async (uri: string | null) => {
    setUploading(true);
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: uri
      });
      setUserData({ ...userData, photoURL: uri });
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

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
          <TouchableOpacity onPress={handleAvatarPress} disabled={uploading} style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : userData?.photoURL ? (
                <Image source={{ uri: userData.photoURL }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLetter}>
                  {userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : "I"}
                </Text>
              )}
            </View>
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>Dr. {userData?.fullName || "Instructor"}</Text>
          <Text style={styles.userEmail}>{userData?.email}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color="#64748b" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{userData?.department || "CS"}</Text>
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
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/reset-password' as any)}>
            <Ionicons name="lock-closed-outline" size={20} color="#1a3a8a" />
            <Text style={styles.actionBtnText}>Change Password 🔐</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} onPress={() => auth.signOut().then(() => router.replace('/'))}>
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
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a3a8a' },
  content: { padding: 25 },
  avatarSection: { alignItems: 'center', marginBottom: 35 },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  avatarCircle: { 
    width: 100, 
    height: 100, 
    backgroundColor: '#1a3a8a', 
    borderRadius: 50, 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 0,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarLetter: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1a3a8a',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#f8fafc',
  },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  userEmail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  infoSection: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 30 },
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
  logoutBtn: { borderColor: '#fee2e2' }
});