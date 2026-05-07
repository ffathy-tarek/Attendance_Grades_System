import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// 
interface AttendanceRecord {
  id: string;
  subject: string;
  present: number;
  absences: number;
  total: number;
  absPercent: string;
  status: "Perfect" | "1st Warning" | "2nd Warning" | "Barred";
}

interface Stats {
  total: number;
  present: number;
  absent: number;
  absPercent: string;
}

export default function StudentAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0, absPercent: "0" });
  const [filter, setFilter] = useState<"all" | "good" | "warn">("all");

  // 2. 
  const loadData = async (userId: string) => {
    try {
      const enrollSnap = await getDocs(query(collection(db, "enrollments"), where("studentId", "==", userId)));
      const list: AttendanceRecord[] = [];
      let totalAll = 0, presentAll = 0;

      // الثابت الجديد: إجمالي محاضرات الترم
      const totalSemesterLectures = 24;

      for (const enr of enrollSnap.docs) {
        const cId = enr.data().courseId;
        const cDoc = await getDoc(doc(db, "courses", cId));
        if (!cDoc.exists()) continue;

        const sessSnap = await getDocs(query(collection(db, "lecture_sessions"), where("courseId", "==", cId)));
        const totalSessionsOccurred = sessSnap.size;

        const attendSnap = await getDocs(
          query(collection(db, "attendance"), where("studentId", "==", userId), where("courseId", "==", cId))
        );
        
        const presentCount = attendSnap.size;
        const absences = totalSessionsOccurred - presentCount;
        
        // الحسبة الجديدة: القسمة على 24 دايماً
        const absPercentNum = (absences / totalSemesterLectures) * 100;

        // تحديث منطق الحالات ليتوافق مع الـ 24 محاضرة والـ Instructor side
        let status: AttendanceRecord["status"] = "Perfect";
        if (absPercentNum >= 25) status = "Barred"; // 6 غيابات فأكثر
        else if (absPercentNum >= 20) status = "2nd Warning"; // 5 غيابات
        else if (absPercentNum >= 10) status = "1st Warning"; // 3 غيابات فأكثر
       

        list.push({
          id: cId,
          subject: cDoc.data().name || cDoc.data().courseName || "Unknown",
          present: presentCount,
          absences,
          total: totalSessionsOccurred, // عدد المحاضرات التي تمت فعلياً للعرض فقط
          absPercent: absPercentNum.toFixed(1),
          status,
        });
        
        totalAll += totalSemesterLectures;
        presentAll += presentCount;
      }

      setAttendance(list);
      const absTot = totalAll - presentAll;
      setStats({
        total: totalAll,
        present: presentAll,
        absent: absTot,
        absPercent: totalAll > 0 ? ((absTot / totalAll) * 100).toFixed(1) : "0"
      });
    } catch (error) {
      console.error("Attendance load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/");
      return;
    }

    // 
    const q = query(collection(db, "attendance"), where("studentId", "==", user.uid));
    const unsub = onSnapshot(q, () => {
      loadData(user.uid);
    });

    return () => unsub();
  }, []);

  const getStatusColor = (s: string) => ({ 
    "Perfect": "#22c55e", "1st Warning": "#f59e0b", "2nd Warning": "#ef4444", "Barred": "#991b1b" 
  }[s] || "#94a3b8");

  const getStatusBg = (s: string) => ({ 
    "Perfect": "#dcfce7", "1st Warning": "#fef9c3", "2nd Warning": "#fee2e2", "Barred": "#fecaca" 
  }[s] || "#f1f5f9");

  const filtered = attendance.filter(a => {
    if (filter === "all") return true;
    if (filter === "good") return a.status === "Perfect";
    return a.status !== "Perfect";
  });

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#1a3a8a" /></View>;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a3a8a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Attendance Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.summaryRow}>
        <SumBox label="Total Target" value={stats.total} color="#1a3a8a" />
        <SumBox label="My Present" value={stats.present} color="#22c55e" />
        <SumBox label="Abs Count" value={stats.absent} color="#ef4444" />
        <SumBox label="Abs Rate" value={`${stats.absPercent}%`} color="#f59e0b" />
      </View>

      <View style={s.filterRow}>
        {(["all", "good", "warn"] as const).map((k) => (
          <TouchableOpacity 
            key={k} 
            style={[s.filterChip, filter === k && s.filterChipActive]} 
            onPress={() => setFilter(k)}
          >
            <Text style={[s.filterTxt, filter === k && { color: "#fff" }]}>
              {k === "all" ? "All" : k === "good" ? "✅ Perfect" : "⚠️ At Risk"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.subject}>{item.subject}</Text>
              <View style={s.statsChips}>
                <Text style={[s.chip, { color: "#22c55e" }]}>✅ {item.present}</Text>
                <Text style={[s.chip, { color: "#ef4444" }]}>❌ {item.absences}</Text>
                <Text style={s.chip}>📅 {item.total} sessions occurred</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <Text style={[s.absPercent, { color: getStatusColor(item.status) }]}>
                {item.absPercent}%
              </Text>
              <View style={[s.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
                <Text style={[s.statusTxt, { color: getStatusColor(item.status) }]}>{item.status}</Text>
              </View>
            </View>
          </View>
        )}
      />

      <View style={s.legend}>
        {[
          { bg: "#dcfce7", l: "Perfect (0-2 Absences)" },
          { bg: "#fef9c3", l: "1st Warn (3+ Absences)" },
          { bg: "#fee2e2", l: "2nd Warn (5 Absences)" },
          { bg: "#fecaca", l: "Barred (6+ Absences)" }
        ].map((item) => (
          <View key={item.l} style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: item.bg }]} />
            <Text style={s.legendTxt}>{item.l}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const SumBox = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
  <View style={[s.sumBox, { borderTopColor: color }]}>
    <Text style={[s.sumVal, { color }]}>{value}</Text>
    <Text style={s.sumLabel}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff", elevation: 1 },
  backBtn: { padding: 8, backgroundColor: "#f1f5f9", borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 },
  sumBox: { width: "23%", backgroundColor: "#fff", borderRadius: 14, padding: 12, alignItems: "center", elevation: 1, borderTopWidth: 3 },
  sumVal: { fontSize: 18, fontWeight: "bold" },
  sumLabel: { fontSize: 10, color: "#64748b", marginTop: 3 },
  filterRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  filterChipActive: { backgroundColor: "#1a3a8a", borderColor: "#1a3a8a" },
  filterTxt: { fontSize: 12, fontWeight: "600", color: "#1a3a8a" },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 12, elevation: 1 },
  subject: { fontSize: 14, fontWeight: "bold", color: "#1e293b", marginBottom: 6 },
  statsChips: { flexDirection: "row", gap: 10 },
  chip: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  absPercent: { fontSize: 18, fontWeight: "bold" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusTxt: { fontSize: 11, fontWeight: "bold" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 12, height: 12, borderRadius: 4 },
  legendTxt: { fontSize: 10, color: "#64748b" },
});