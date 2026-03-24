import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, query, where} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';

const InstructorSubjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!user?.uid) return;

      try {
        // استخدام courses بدلاً من subjects
        const q = query(
          collection(db, "courses"),
          where("instructorIds", "array-contains", user.uid)
        );

        const querySnapshot = await getDocs(q);

        const data = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const courseData = { id: doc.id, ...doc.data() };
            
            // جلب عدد الطلاب من enrollments collection
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

  const handleStartLecture = (subjectId) => {
    navigate(`/instructor/lectures/start/${subjectId}`);
  };

  const handleViewAttendance = (subjectId) => {
    navigate(`/instructor/attendance/${subjectId}`);
  };

  const handleViewGrades = (subjectId) => {
    navigate(`/instructor/grades/${subjectId}`);
  };

  const handleViewDetails = (subject) => {
    setSelectedSubject(subject);
    setShowDetails(true);
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
                <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                  <button 
                    className={styles.courseButton}
                    onClick={() => handleStartLecture(subject.id)}
                  >
                    🎬 Start Lecture
                  </button>
                  <button 
                    className={styles.changePhotoButton}
                    onClick={() => handleViewDetails(subject)}
                    style={{ width: "auto" }}
                  >
                    👁️ Details
                  </button>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
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

      {/* Modal for subject details */}
      {showDetails && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{selectedSubject.name}</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Course Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><span className="text-gray-600">Code:</span> {selectedSubject.code}</p>
                    <p><span className="text-gray-600">Level:</span> {selectedSubject.level || "Not specified"}</p>
                    <p><span className="text-gray-600">Credit Hours:</span> {selectedSubject.creditHours || 3}</p>
                    <p><span className="text-gray-600">Total Students:</span> {selectedSubject.studentsCount}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Instructors</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p>You are assigned to teach this course</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default InstructorSubjects;