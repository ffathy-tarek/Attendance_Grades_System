import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Assessment {
  assessmentName: string;
  score: number;
  courseId: string;
  studentId: string;
}

interface CourseGrade {
  id: string;
  subject: string;
  final: number;
  midterm: number;
  practical: number;
  total: number;
  status: string;
}

interface Stats {
  avg: string;
  highest: number;
  lowest: number;
  passed: number;
  total: number;
}

export default function StudentGrades() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<CourseGrade[]>([]);
  const [stats, setStats] = useState<Stats>({ avg: "0", highest: 0, lowest: 0, passed: 0, total: 0 });

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const enrollSnap = await getDocs(query(collection(db, "enrollments"), where("studentId", "==", user.uid)));
        const list: CourseGrade[] = [];

        for (const enr of enrollSnap.docs) {
          const cId = enr.data().courseId;
          const cDoc = await getDoc(doc(db, "courses", cId));
          if (!cDoc.exists()) continue;

          const gradeSnap = await getDocs(
            query(collection(db, "grades"), where("studentId", "==", user.uid), where("courseId", "==", cId))
          );

          const assessments = gradeSnap.docs.map(d => d.data() as Assessment);

          // Match exact assessmentName values used by instructor: "Midterm", "Final", "Practical"
          const getScore = (name: string) =>
            assessments.find(a => a.assessmentName === name)?.score || 0;

          const midterm = getScore("Midterm");
          const finalG = getScore("Final");
          const practical = getScore("Practical");

          // Total = Midterm (10) + Final (60) + Practical (30) = 100
          const total = midterm + finalG + practical;

          const status =
            total >= 85 ? "Excellent" :
            total >= 75 ? "Very Good" :
            total >= 65 ? "Good" :
            total >= 60 ? "Pass" : "Fail";

          list.push({
            id: cId,
            subject: cDoc.data().name || cDoc.data().courseName || "Unknown Subject",
            midterm,
            final: finalG,
            practical,
            total,
            status,
          });
        }

        setGrades(list);
        if (list.length > 0) {
          const totals = list.map(g => g.total);
          setStats({
            avg: (totals.reduce((a, b) => a + b, 0) / list.length).toFixed(1),
            highest: Math.max(...totals),
            lowest: Math.min(...totals),
            passed: list.filter(g => g.total >= 60).length,
            total: list.length,
          });
        }
      } catch (err) {
        console.error("Grades load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getStatusColor = (s: string) =>
    ({ Excellent: "#22c55e", "Very Good": "#3b82f6", Good: "#f59e0b", Pass: "#64748b", Fail: "#ef4444" }[s] || "#94a3b8");

  const getStatusBg = (s: string) =>
    ({ Excellent: "#dcfce7", "Very Good": "#dbeafe", Good: "#fef9c3", Pass: "#f1f5f9", Fail: "#fee2e2" }[s] || "#f1f5f9");

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#1a3a8a" /></View>;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a3a8a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Grades</Text>
        <View style={s.avgBadge}><Text style={s.avgTxt}>Avg: {stats.avg}%</Text></View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={s.statsRow}>
          <GradeStat label="Highest" value={`${stats.highest}%`} icon="📊" bg="#e0f2fe" />
          <GradeStat label="Lowest" value={`${stats.lowest}%`} icon="📉" bg="#fef3c7" />
          <GradeStat label="Passed" value={`${stats.passed}/${stats.total}`} icon="🎯" bg="#dcfce7" />
        </View>

        {/* Grading System Legend - updated to match instructor schema */}
        <View style={s.legendBox}>
          <Text style={s.legendTitle}>📝 Grading System</Text>
          <View style={s.legendRow}>
            {[["Final", "60"], ["Midterm", "10"], ["Practical", "30"], ["Total", "100"]].map(([l, v]) => (
              <View key={l} style={s.legendItem}>
                <Text style={s.legendVal}>{v}</Text>
                <Text style={s.legendLabel}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {grades.map(g => (
          <View key={g.id} style={s.gradeCard}>
            <View style={s.gradeCardTop}>
              <Text style={s.subjectName} numberOfLines={2}>{g.subject}</Text>
              <View style={[s.statusBadge, { backgroundColor: getStatusBg(g.status) }]}>
                <Text style={[s.statusTxt, { color: getStatusColor(g.status) }]}>{g.status}</Text>
              </View>
            </View>

            <View style={s.gradeBreakdown}>
              {[
                { lbl: "Final", score: g.final, max: 60 },
                { lbl: "Midterm", score: g.midterm, max: 10 },
                { lbl: "Practical", score: g.practical, max: 30 },
              ].map((item) => (
                <View key={item.lbl} style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>{item.lbl}</Text>
                  <View style={s.progressBar}>
                    <View style={[s.progressFill, {
                      width: item.max > 0 ? `${(item.score / item.max) * 100}%` : "0%",
                      backgroundColor: getStatusColor(g.status)
                    }]} />
                  </View>
                  <Text style={s.breakdownScore}>{item.score}/{item.max}</Text>
                </View>
              ))}
            </View>

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Score</Text>
              <Text style={[s.totalValue, { color: getStatusColor(g.status) }]}>{g.total}/100</Text>
            </View>
          </View>
        ))}

        {grades.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="document-outline" size={60} color="#cbd5e1" />
            <Text style={s.emptyTxt}>No grades available yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const GradeStat = ({ label, value, icon, bg }: { label: string, value: string, icon: string, bg: string }) => (
  <View style={[s.statCard, { backgroundColor: bg }]}>
    <Text style={s.statIcon}>{icon}</Text>
    <Text style={s.statVal}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff", elevation: 1 },
  backBtn: { padding: 8, backgroundColor: "#f1f5f9", borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  avgBadge: { backgroundColor: "#eef6ff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  avgTxt: { color: "#1a3a8a", fontWeight: "bold", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: "center", elevation: 1 },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statVal: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  statLabel: { fontSize: 11, color: "#64748b", marginTop: 2 },
  legendBox: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1 },
  legendTitle: { fontSize: 13, fontWeight: "bold", color: "#64748b", marginBottom: 12 },
  legendRow: { flexDirection: "row", justifyContent: "space-between" },
  legendItem: { alignItems: "center" },
  legendVal: { fontSize: 16, fontWeight: "bold", color: "#1a3a8a" },
  legendLabel: { fontSize: 10, color: "#64748b", marginTop: 2 },
  gradeCard: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 16, elevation: 2 },
  gradeCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  subjectName: { flex: 1, fontSize: 15, fontWeight: "bold", color: "#1e293b", marginRight: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusTxt: { fontSize: 12, fontWeight: "bold" },
  gradeBreakdown: { gap: 8, marginBottom: 14 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  breakdownLabel: { width: 65, fontSize: 12, color: "#64748b" },
  progressBar: { flex: 1, height: 6, backgroundColor: "#f1f5f9", borderRadius: 10, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 10 },
  breakdownScore: { width: 45, fontSize: 12, fontWeight: "600", color: "#1e293b", textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12 },
  totalLabel: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
  totalValue: { fontSize: 22, fontWeight: "bold" },
  empty: { alignItems: "center", paddingTop: 50 },
  emptyTxt: { color: "#94a3b8", fontSize: 16, marginTop: 12 },
});
