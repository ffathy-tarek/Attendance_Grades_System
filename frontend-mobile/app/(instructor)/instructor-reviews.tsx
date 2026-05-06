import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Course {
  id: string;
  name: string;
  code: string;
}

interface Review {
  id: string;
  courseId: string;
  studentId: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export default function InstructorReviews() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const instructorId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchData = async () => {
      if (!instructorId) return;
      try {
        const coursesSnap = await getDocs(
          query(collection(db, "courses"), where("instructorIds", "array-contains", instructorId))
        );
        const myCourses: Course[] = coursesSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().courseName || "Unknown",
          code: d.data().code || "",
        }));
        setCourses(myCourses);

        const reviewsSnap = await getDocs(
          query(collection(db, "reviews"), orderBy("createdAt", "desc"))
        );
        setReviews(reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Review)));
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [instructorId]);

  const handleToggle = (courseId: string) => {
    if (activeCourse === courseId) {
      setActiveCourse(null);
    } else {
      setActiveCourse(courseId);
      const courseReviews = reviews.filter((r) => r.courseId === courseId);
      setSeenIds((prev) => {
        const next = new Set(prev);
        courseReviews.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const handleDelete = (reviewId: string) => {
    Alert.alert("Delete Review", "Are you sure you want to delete this feedback?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "reviews", reviewId));
            setReviews((prev) => prev.filter((r) => r.id !== reviewId));
          } catch {
            Alert.alert("Error", "Could not delete review.");
          }
        },
      },
    ]);
  };

  const getAverage = (courseId: string) => {
    const cr = reviews.filter((r) => r.courseId === courseId);
    if (!cr.length) return "0.0";
    return (cr.reduce((a, b) => a + b.rating, 0) / cr.length).toFixed(1);
  };

  const formatDate = (ts: any) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= rating ? "star" : "star-outline"} size={size} color={i <= rating ? "#fbbf24" : "#e2e8f0"} />
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1a3a8a" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a3a8a" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={s.headerTitle}>Instructor Insights</Text>
          <Text style={s.headerSub}>Student Feedback & Ratings</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {courses.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="book-outline" size={70} color="#cbd5e1" />
          <Text style={s.emptyTitle}>No Courses Assigned</Text>
          <Text style={s.emptySub}>You have no courses to display reviews for.</Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const courseReviews = reviews.filter((r) => r.courseId === item.id);
            const avg = getAverage(item.id);
            const isOpen = activeCourse === item.id;
            const unread = courseReviews.filter((r) => !seenIds.has(r.id)).length;

            return (
              <View style={[s.accordionCard, isOpen && s.accordionCardOpen]}>
                {/* Course Header Row */}
                <TouchableOpacity style={s.courseRow} onPress={() => handleToggle(item.id)} activeOpacity={0.7}>
                  <View style={[s.courseIcon, isOpen && s.courseIconActive]}>
                    <Ionicons name="chatbubble-ellipses" size={20} color={isOpen ? "#fff" : "#1a3a8a"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.courseName} numberOfLines={1}>{item.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                      {item.code ? <Text style={s.courseCode}>{item.code}</Text> : null}
                      {unread > 0 && !isOpen && (
                        <View style={s.unreadBadge}>
                          <Text style={s.unreadText}>{unread} NEW</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View style={s.avgBox}>
                      <Ionicons name="star" size={12} color="#fbbf24" />
                      <Text style={s.avgText}>{avg}</Text>
                      <Text style={s.reviewCount}>({courseReviews.length})</Text>
                    </View>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={isOpen ? "#1a3a8a" : "#94a3b8"}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Reviews */}
                {isOpen && (
                  <View style={s.expandedSection}>
                    {courseReviews.length === 0 ? (
                      <View style={s.noReviews}>
                        <Ionicons name="chatbubble-outline" size={36} color="#cbd5e1" />
                        <Text style={s.noReviewsTxt}>No feedback available yet.</Text>
                      </View>
                    ) : (
                      courseReviews.map((review) => (
                        <View key={review.id} style={s.reviewCard}>
                          <View style={s.reviewTopRow}>
                            <View style={{ gap: 4 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Stars rating={review.rating} />
                                {!seenIds.has(review.id) && (
                                  <View style={s.newBadge}>
                                    <Text style={s.newBadgeText}>NEW</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={s.reviewDate}>{formatDate(review.createdAt)}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(review.id)} style={s.deleteBtn}>
                              <Ionicons name="trash-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                          {review.comment ? (
                            <View style={s.commentBox}>
                                <Text style={s.commentText}>&quot;{review.comment}&quot;</Text>
                            </View>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    elevation: 1,
  },
  backBtn: { padding: 8, backgroundColor: "#f1f5f9", borderRadius: 12 },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#1e293b" },
  headerSub: { fontSize: 11, color: "#64748b", marginTop: 1 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginTop: 16 },
  emptySub: { fontSize: 13, color: "#94a3b8", marginTop: 6, textAlign: "center" },
  accordionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 14,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  accordionCardOpen: { borderColor: "#1a3a8a", elevation: 3 },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  courseIcon: {
    width: 46,
    height: 46,
    backgroundColor: "#eef6ff",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  courseIconActive: { backgroundColor: "#1a3a8a" },
  courseName: { fontSize: 14, fontWeight: "bold", color: "#1e293b", flex: 1 },
  courseCode: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  unreadBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadText: { fontSize: 10, fontWeight: "800", color: "#2563eb" },
  avgBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  avgText: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  reviewCount: { fontSize: 10, color: "#94a3b8" },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    padding: 14,
    gap: 10,
  },
  noReviews: { alignItems: "center", paddingVertical: 20, gap: 8 },
  noReviewsTxt: { color: "#94a3b8", fontSize: 13 },
  reviewCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  newBadge: {
    backgroundColor: "#10b981",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  reviewDate: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  deleteBtn: { padding: 6 },
  commentBox: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#e2e8f0",
  },
  commentText: { fontSize: 13, color: "#475569", fontStyle: "italic", lineHeight: 19 },
});
