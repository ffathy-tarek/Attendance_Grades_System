import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';

const InstructorSubjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!user?.uid) return;

      try {
        const q = query(
          collection(db, "courses"),
          where("instructorIds", "array-contains", user.uid)
        );

        const querySnapshot = await getDocs(q);

        const data = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const courseData = { id: doc.id, ...doc.data() };
            
            const enrollmentsQuery = query(
              collection(db, "enrollments"),
              where("courseId", "==", doc.id)
            );
            const enrollmentsSnap = await getDocs(enrollmentsQuery);
            
            return { 
              ...courseData, 
              studentsCount: enrollmentsSnap.size,
              code: courseData.code,
              name: courseData.name,
              creditHours: courseData.creditHours
            };
          })
        );

        setSubjects(data);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [user]);

  // ✅ تعديل: التوجيه إلى صفحة Lectures مباشرة
  const handleStartLecture = (subjectId) => {
    navigate(`/instructor/lectures`);
  };

  const handleViewAttendance = (subjectId) => {
    navigate(`/instructor/attendance/${subjectId}`);
  };

  const handleViewGrades = (subjectId) => {
    navigate(`/instructor/grades/${subjectId}`);
  };

  if (loading) {
    return (
      <PageLayout title="My Subjects" subtitle="Loading your subjects...">
        <div className={styles.loading}>Loading subjects...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="My Subjects" 
      subtitle="Manage your courses and lectures"
      actions={
        <button className={styles.exportButton}>
          📊 Export Report
        </button>
      }
    >
      {subjects.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No Subjects Found</h3>
          <p>You haven't been assigned to any subjects yet</p>
        </div>
      ) : (
        <div className={styles.coursesGrid}>
          {subjects.map((subject) => (
            <div key={subject.id} className={styles.courseCard}>
              <div className={styles.courseHeader}>
                <span className={styles.courseCode}>{subject.code}</span>
                <span className={styles.courseHours}>{subject.creditHours || 3} Credits</span>
              </div>
              <div className={styles.courseBody}>
                <h3 className={styles.courseName}>{subject.name}</h3>
                <div className={styles.courseInstructor}>
                  👥 {subject.studentsCount} Students
                </div>
                {subject.level && (
                  <div className={styles.courseInstructor}>
                    📚 Level {subject.level}
                  </div>
                )}
                
                {/* ✅ زر Start Lecture بس بدون Details */}
                <button 
                  className={styles.courseButton}
                  onClick={() => handleStartLecture(subject.id)}
                  style={{ marginTop: "16px" }}
                >
                  🎬 Start Lecture
                </button>
                
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button 
                    className={styles.changePhotoButton}
                    onClick={() => handleViewAttendance(subject.id)}
                    style={{ flex: 1 }}
                  >
                    📝 Attendance
                  </button>
                  <button 
                    className={styles.changePhotoButton}
                    onClick={() => handleViewGrades(subject.id)}
                    style={{ flex: 1 }}
                  >
                    🎯 Grades
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default InstructorSubjects;