import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Platform, TextInput, Alert } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// 
interface UserProfileData {
  fullName?: string;
  email?: string;
  code?: string;
  department?: string;
  academicYear?: string | number;
  role?: string;
  phone?: string;
}

export default function StudentProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // 
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassSection, setShowPassSection] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return router.replace("/");
      
      try {
        const uDoc = await getDoc(doc(db, "users", user.uid));
        if (uDoc.exists()) {
          const d = uDoc.data() as UserProfileData;
          setUserData(d);
          setPhone(d.phone || "");
        }
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]); // 

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { 
        phone, 
        updatedAt: new Date().toISOString() 
      });
      Alert.alert("Success", "Profile updated ✅");
    } catch { 
      Alert.alert("Error", "Could not save changes"); 
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPass !== confirmPass) return Alert.alert("Error", "Passwords don't match");
    if (newPass.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");
    
    const user = auth.currentUser;
    if (!user?.email) return;

    try {
      const cred = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);
      Alert.alert("Success", "Password changed ✅");
      setShowPassSection(false);
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
    } catch (e: any) { 
      Alert.alert("Error", e.message); 
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#1a3a8a" /></View>;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a3a8a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{userData?.fullName?.charAt(0)?.toUpperCase() || "S"}</Text>
          </View>
          <Text style={s.name}>{userData?.fullName || "Student"}</Text>
          <Text style={s.email}>{userData?.email || auth.currentUser?.email}</Text>
          {userData?.code ? (
            <View style={s.idBadge}>
              <Text style={s.idTxt}>ID: {userData.code}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.infoCard}>
          <InfoRow icon="business-outline" label="Department" value={userData?.department || "Not specified"} />
          <InfoRow icon="school-outline" label="Academic Year" value={userData?.academicYear ? `Year ${userData.academicYear}` : "Not specified"} />
          
          <InfoRow 
            icon="call-outline" 
            label="Phone Number" 
            editable 
          >
            <TextInput
              style={s.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </InfoRow>
          
          <InfoRow icon="shield-checkmark-outline" label="Role" value={userData?.role || "Student"} last />
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.passwordToggle} onPress={() => setShowPassSection(!showPassSection)}>
          <Ionicons name="lock-closed-outline" size={20} color="#1a3a8a" />
          <Text style={s.passwordToggleTxt}>Change Password 🔐</Text>
          <Ionicons name={showPassSection ? "chevron-up" : "chevron-down"} size={18} color="#1a3a8a" />
        </TouchableOpacity>

        {showPassSection && (
          <View style={s.passCard}>
            <PassInput label="Current Password" value={currentPass} onChange={setCurrentPass} />
            <PassInput label="New Password" value={newPass} onChange={setNewPass} />
            <PassInput label="Confirm New Password" value={confirmPass} onChange={setConfirmPass} />
            <TouchableOpacity style={s.saveBtn} onPress={handleChangePassword}>
              <Text style={s.saveBtnTxt}>Update Password</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.logoutBtn} onPress={() => auth.signOut().then(() => router.replace("/"))}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={s.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

//
interface InfoRowProps {
  icon: any;
  label: string;
  value?: string | null;
  editable?: boolean;
  children?: React.ReactNode;
  last?: boolean;
}

const InfoRow = ({ icon, label, value, editable, children, last }: InfoRowProps) => (
  <View style={[s.infoRow, !last && s.infoRowBorder]}>
    <Ionicons name={icon} size={20} color="#64748b" style={{ marginRight: 12 }} />
    <View style={{ flex: 1 }}>
      <Text style={s.infoLabel}>{label}</Text>
      {editable ? children : <Text style={s.infoValue}>{value}</Text>}
    </View>
  </View>
);

const PassInput = ({ label, value, onChange }: { label: string, value: string, onChange: (t: string) => void }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={s.infoLabel}>{label}</Text>
    <TextInput style={s.passInput} secureTextEntry value={value} onChangeText={onChange} placeholder="••••••••" />
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff", elevation: 1, paddingTop: Platform.OS === "ios" ? 50 : 20 },
  backBtn: { padding: 8, backgroundColor: "#f1f5f9", borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#1a3a8a", justifyContent: "center", alignItems: "center", elevation: 4, marginBottom: 12 },
  avatarLetter: { color: "#fff", fontSize: 36, fontWeight: "bold" },
  name: { fontSize: 20, fontWeight: "bold", color: "#1e293b" },
  email: { fontSize: 13, color: "#64748b", marginTop: 3 },
  idBadge: { marginTop: 8, backgroundColor: "#eef6ff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  idTxt: { color: "#1a3a8a", fontWeight: "700", fontSize: 12 },
  infoCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 16, elevation: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  infoLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 3 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  phoneInput: { fontSize: 14, color: "#1e293b", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 8, marginTop: 4 },
  saveBtn: { backgroundColor: "#1a3a8a", borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 12 },
  saveBtnTxt: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  passwordToggle: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: "#e2e8f0" },
  passwordToggleTxt: { flex: 1, marginLeft: 10, fontWeight: "bold", color: "#1a3a8a" },
  passCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 12, elevation: 1 },
  passInput: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 10, padding: 12, fontSize: 14 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#fee2e2", gap: 8 },
  logoutTxt: { color: "#ef4444", fontWeight: "bold", fontSize: 15 },
});