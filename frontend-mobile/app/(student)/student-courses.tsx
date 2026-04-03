import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StatusBar } from "react-native";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

//
interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  hours: string;
}

export default function CoursesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  //
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      
      try {
        const enrollSnap = await getDocs(query(collection(db, "enrollments"), where("studentId", "==", user.uid)));
        const list: Course[] = []; //

        for (const enr of enrollSnap.docs) {
          const cDoc = await getDoc(doc(db, "courses", enr.data().courseId));
          if (cDoc.exists()) {
            const d = cDoc.data();
            
            // جلب اسم الدكتور
            let instructorName = d.instructorName || "";
            if (!instructorName && d.instructorIds?.[0]) {
              const iDoc = await getDoc(doc(db, "users", d.instructorIds[0]));
              if (iDoc.exists()) instructorName = "Dr. " + iDoc.data().fullName;
            }

            list.push({ 
              id: cDoc.id, 
              name: String(d.name || d.courseName || ""), 
              code: String(d.code || ""), 
              instructor: String(instructorName), 
              hours: String(d.creditHours || d.hours || "") 
            });
          }
        }
        setCourses(list);
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 
  const filtered = courses.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#1a3a8a" /></View>;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a3a8a" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Courses</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.searchBar}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput 
          style={s.searchInput} 
          placeholder="Search courses..." 
          value={search} 
          onChangeText={setSearch} 
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          //
          <TouchableOpacity 
            style={s.card} 
            onPress={() => router.push( {
              pathname: "/(student)/student-course-details",
              params: { courseId: item.id }
            } as any ) }
          >
            <View style={s.iconBox}><Ionicons name="book" size={26} color="#1a3a8a" /></View>
            <View style={{ flex: 1 }}>
              {item.code ? <Text style={s.code}>{item.code}</Text> : null}
              <Text style={s.name}>{item.name}</Text>
              {item.instructor ? <Text style={s.instructor}>👨‍🏫 {item.instructor}</Text> : null}
              {item.hours ? <Text style={s.hours}>{item.hours} Credit Hours</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>No courses found</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#fff", elevation: 1 },
  backBtn: { padding: 8, backgroundColor: "#f1f5f9", borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 20, marginTop: 16, paddingHorizontal: 15, borderRadius: 15, height: 48, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 14, elevation: 2 },
  iconBox: { width: 52, height: 52, backgroundColor: "#eef6ff", borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 14 },
  code: { fontSize: 11, color: "#1a3a8a", fontWeight: "700", textTransform: "uppercase", marginBottom: 2 },
  name: { fontSize: 15, fontWeight: "bold", color: "#1e293b" },
  instructor: { fontSize: 12, color: "#64748b", marginTop: 3 },
  hours: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 40, fontSize: 15 },
});