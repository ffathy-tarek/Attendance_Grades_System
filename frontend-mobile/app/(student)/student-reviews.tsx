import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Course {
  id: string;
  name: string;
  code: string;
}

const RATING_LABELS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function StudentReviews() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewsCount, setReviewsCount] = useState(0);
  const [status, setStatus] = useState<{ type: string; msg: string }>({ type: "", msg: "" });

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchCourses = async () => {
      if (!userId) return;
      try {
        const enrollSnap = await getDocs(
          query(collection(db, "enrollments"), where("studentId", "==", userId))
        );
        const list: Course[] = [];
        for (const enrDoc of enrollSnap.docs) {
          const cId = enrDoc.data().courseId;
          const cDoc = await getDoc(doc(db, "courses", cId));
          if (cDoc.exists()) {
            list.push({
              id: cId,
              name: cDoc.data().name || cDoc.data().courseName || "Unknown",
              code: cDoc.data().code || "",
            });
          }
        }
        setCourses(list);
      } catch (err) {
        console.error("Error fetching courses:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [userId]);

  useEffect(() => {
    const checkCount = async () => {
      if (!selectedCourse || !userId) {
        setReviewsCount(0);
        return;
      }
      const snap = await getDocs(
        query(
          collection(db, "reviews"),
          where("courseId", "==", selectedCourse.id),
          where("studentId", "==", userId)
        )
      );
      setReviewsCount(snap.size);
    };
    setStatus({ type: "", msg: "" });
    setRating(0);
    setComment("");
    checkCount();
  }, [selectedCourse]);

  const handleSubmit = async () => {
    if (!rating || !selectedCourse || !userId) return;
    if (reviewsCount >= 3) {
      setStatus({ type: "error", msg: "You reached the maximum number of reviews for this subject" });
      return;
    }
    setSubmitLoading(true);
    try {
      await addDoc(collection(db, "reviews"), {
        courseId: selectedCourse.id,
        studentId: userId,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });
      setStatus({ type: "success", msg: "Review submitted successfully ✅" });
      setRating(0);
      setComment("");
      setSelectedCourse(null);
      setReviewsCount(0);
    } catch {
      setStatus({ type: "error", msg: "Failed to submit review." });
    }
    setSubmitLoading(false);
  };

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
        <Text style={s.headerTitle}>Course Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="star" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Write a Review</Text>
            <Text style={s.bannerSub}>Your feedback is anonymous and helps improve courses.</Text>
          </View>
        </View>

        {/* Step 1: Select Course */}
        <Text style={s.stepLabel}>1. Select Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {courses.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[s.courseChip, selectedCourse?.id === c.id && s.courseChipActive]}
              onPress={() => setSelectedCourse(c)}
            >
              <Text style={[s.courseChipText, selectedCourse?.id === c.id && { color: "#fff" }]}>
                {c.name}
              </Text>
              {c.code ? (
                <Text style={[s.courseChipCode, selectedCourse?.id === c.id && { color: "rgba(255,255,255,0.7)" }]}>
                  {c.code}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Attempts badge */}
        {selectedCourse && (
          <View style={[s.attemptsBadge, reviewsCount >= 3 && s.attemptsBadgeFull]}>
            <Ionicons
              name={reviewsCount >= 3 ? "close-circle" : "checkmark-circle"}
              size={16}
              color={reviewsCount >= 3 ? "#e11d48" : "#0369a1"}
            />
            <Text style={[s.attemptsText, reviewsCount >= 3 && { color: "#e11d48" }]}>
              {reviewsCount} / 3 Attempts Used
            </Text>
          </View>
        )}

        {/* Step 2: Rating */}
        <Text style={[s.stepLabel, { marginTop: 8 }]}>2. Rate This Course</Text>
        <View style={s.ratingCard}>
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => { setRating(star); setStatus({ type: "", msg: "" }); }}>
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={44}
                  color={star <= rating ? "#fbbf24" : "#e2e8f0"}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={s.ratingLabel}>{RATING_LABELS[rating - 1]}</Text>
          )}
        </View>

        {/* Step 3: Comment */}
        <Text style={[s.stepLabel, { marginTop: 8 }]}>3. Detailed Feedback (Optional)</Text>
        <TextInput
          style={s.textarea}
          placeholder="Share your experience with the instructor or course content..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={5}
          value={comment}
          onChangeText={(t) => { setComment(t); setStatus({ type: "", msg: "" }); }}
        />

        {/* Status */}
        {status.msg ? (
          <View style={[s.statusBox, status.type === "success" ? s.statusSuccess : s.statusError]}>
            <Ionicons
              name={status.type === "success" ? "checkmark-circle" : "alert-circle"}
              size={18}
              color={status.type === "success" ? "#065f46" : "#9f1239"}
            />
            <Text style={[s.statusText, status.type === "success" ? { color: "#065f46" } : { color: "#9f1239" }]}>
              {status.msg}
            </Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            s.submitBtn,
            (!rating || !selectedCourse || submitLoading || reviewsCount >= 3) && s.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!rating || !selectedCourse || submitLoading || reviewsCount >= 3}
        >
          {submitLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={s.submitBtnText}>Publish Review</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a3a8a",
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    gap: 14,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTitle: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  bannerSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  stepLabel: { fontSize: 12, fontWeight: "bold", color: "#64748b", marginBottom: 10, textTransform: "uppercase" },
  courseChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
  },
  courseChipActive: { backgroundColor: "#1a3a8a", borderColor: "#1a3a8a" },
  courseChipText: { fontSize: 13, fontWeight: "bold", color: "#1a3a8a" },
  courseChipCode: { fontSize: 10, color: "#64748b", marginTop: 2 },
  attemptsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  attemptsBadgeFull: { backgroundColor: "#fff1f2" },
  attemptsText: { fontSize: 13, fontWeight: "600", color: "#0369a1" },
  ratingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    elevation: 1,
  },
  starsRow: { flexDirection: "row", gap: 8 },
  ratingLabel: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#1a3a8a" },
  textarea: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 130,
    textAlignVertical: "top",
    marginBottom: 16,
    elevation: 1,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusSuccess: { backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0" },
  statusError: { backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3" },
  statusText: { fontSize: 13, fontWeight: "600", flex: 1 },
  submitBtn: {
    backgroundColor: "#1a3a8a",
    borderRadius: 16,
    padding: 17,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 2,
  },
  submitBtnDisabled: { backgroundColor: "#cbd5e1" },
  submitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
