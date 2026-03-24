import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  query,
  where,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';

const Grades = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [coursesList, setCoursesList] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // جلب المواد الخاصة بالمدرب لو مفيش subjectId
  useEffect(() => {
    const fetchCourses = async () => {
      if (subjectId) {
        setLoadingCourses(false);
        return;
      }
      
      try {
        const q = query(
          collection(db, "courses"),
          where("instructorIds", "array-contains", user?.uid)
        );
        const coursesSnap = await getDocs(q);
        const courses = await Promise.all(
          coursesSnap.docs.map(async (doc) => {
            const enrollmentsQuery = query(
              collection(db, "enrollments"),
              where("courseId", "==", doc.id)
            );
            const enrollmentsSnap = await getDocs(enrollmentsQuery);
            
            return {
              id: doc.id,
              ...doc.data(),
              studentsCount: enrollmentsSnap.size
            };
          })
        );
        setCoursesList(courses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };
    
    fetchCourses();
  }, [subjectId, user?.uid]);

  // جلب بيانات المادة والطلاب والدرجات
  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId) return;
      setLoading(true);
      
      try {
        const courseDoc = await getDoc(doc(db, 'courses', subjectId));
        if (courseDoc.exists()) {
          setCourse({ id: courseDoc.id, ...courseDoc.data() });
        } else {
          console.log("Course not found");
          setLoading(false);
          return;
        }
        
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('courseId', '==', subjectId)
        );
        const enrollmentsSnap = await getDocs(enrollmentsQuery);
        
        if (enrollmentsSnap.size > 0) {
          const studentsList = [];
          for (const enrollment of enrollmentsSnap.docs) {
            const enrollmentData = enrollment.data();
            const studentDoc = await getDoc(doc(db, 'users', enrollmentData.studentId));
            if (studentDoc.exists()) {
              studentsList.push({ 
                id: studentDoc.id, 
                ...studentDoc.data(),
                enrollmentId: enrollment.id
              });
            }
          }
          setStudents(studentsList);
          
          const gradesQuery = query(
            collection(db, 'grades'),
            where('courseId', '==', subjectId)
          );
          const gradesSnap = await getDocs(gradesQuery);
          
          const gradesMap = {};
          gradesSnap.forEach(doc => {
            const data = doc.data();
            gradesMap[data.studentId] = {
              midterm: data.midterm || 0,
              final: data.final || 0,
              practical: data.practical || 0,
              attendanceMark: data.attendanceMark || 0
            };
          });
          setGrades(gradesMap);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [subjectId]);

  const handleGradeChange = (studentId, field, value) => {
    const numValue = value === '' ? 0 : Math.min(100, Math.max(0, Number(value)));
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue
      }
    }));
    setSaved(false);
  };

  const calculateTotal = (studentGrades) => {
    if (!studentGrades) return 0;
    const midterm = (studentGrades.midterm || 0) * 0.3;
    const final = (studentGrades.final || 0) * 0.4;
    const practical = (studentGrades.practical || 0) * 0.2;
    const attendance = (studentGrades.attendanceMark || 0) * 0.1;
    return (midterm + final + practical + attendance).toFixed(1);
  };

  const saveAllGrades = async () => {
    setSaving(true);
    setSaved(false);
    
    try {
      const batch = writeBatch(db);
      
      for (const student of students) {
        const studentGrades = grades[student.id];
        if (studentGrades) {
          const gradeRef = doc(db, 'grades', `${subjectId}_${student.id}`);
          batch.set(gradeRef, {
            courseId: subjectId,
            studentId: student.id,
            studentName: student.fullName || student.name,
            studentCode: student.code || student.uniqueCode,
            midterm: studentGrades.midterm || 0,
            final: studentGrades.final || 0,
            practical: studentGrades.practical || 0,
            attendanceMark: studentGrades.attendanceMark || 0,
            total: calculateTotal(studentGrades),
            updatedAt: new Date(),
            updatedBy: user.uid
          }, { merge: true });
        }
      }
      
      await batch.commit();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving grades:', error);
      alert('Failed to save grades. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // عرض قائمة المواد لو مفيش subjectId
  if (!subjectId) {
    if (loadingCourses) {
      return (
        <PageLayout title="Grades Management" subtitle="Loading...">
          <div className={styles.loading}>Loading courses...</div>
        </PageLayout>
      );
    }

    return (
      <PageLayout 
        title="Grades Management" 
        subtitle="Select a course to manage grades"
        actions={
          <button className={styles.exportButton}>
            📊 Export Report
          </button>
        }
      >
        <div className={styles.coursesGrid}>
          {coursesList.map(course => (
            <div key={course.id} className={styles.courseCard}>
              <div className={styles.courseHeader}>
                <span className={styles.courseCode}>{course.code}</span>
                <span className={styles.courseHours}>{course.creditHours || 3} Credits</span>
              </div>
              <div className={styles.courseBody}>
                <h3 className={styles.courseName}>{course.name}</h3>
                <div className={styles.courseInstructor}>
                  👥 {course.studentsCount} Students
                </div>
                {course.level && (
                  <div className={styles.courseInstructor}>
                    📚 Level {course.level}
                  </div>
                )}
                <button 
                  className={styles.courseButton}
                  onClick={() => navigate(`/instructor/grades/${course.id}`)}
                >
                  🎯 Manage Grades
                </button>
              </div>
            </div>
          ))}
          
          {coursesList.length === 0 && (
            <div className={styles.emptyState}>
              <h3>No Courses Found</h3>
              <p>You haven't been assigned to any courses yet</p>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  // عرض حالة التحميل
  if (loading) {
    return (
      <PageLayout title="Grades Management" subtitle="Loading...">
        <div className={styles.loading}>Loading students and grades...</div>
      </PageLayout>
    );
  }

  // عرض رسالة لو مفيش طلاب
  if (students.length === 0) {
    return (
      <PageLayout 
        title="Grades Management" 
        subtitle={course ? `${course.name} - No students enrolled` : 'Manage student grades'}
        actions={
          <button 
            className={styles.courseButton}
            onClick={() => navigate('/instructor/grades')}
            style={{ width: 'auto' }}
          >
            ← Back to Courses
          </button>
        }
      >
        <div className={styles.emptyState}>
          <h3>No Students Enrolled</h3>
          <p>There are no students enrolled in this course yet</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Grades Management" 
      subtitle={course ? `${course.name} - Enter and manage student grades` : 'Manage student grades'}
      actions={
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={styles.exportButton}
            onClick={() => alert('Export feature coming soon')}
          >
            📥 Export CSV
          </button>
          <button 
            className={styles.saveButton}
            onClick={saveAllGrades}
            disabled={saving}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : '💾 Save All Grades'}
          </button>
        </div>
      }
    >
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student Code</th>
              <th>Midterm (10%)</th>
              <th>Final (60%)</th>
              <th>Practical (25%)</th>
              <th>Attendance (5%)</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const studentGrades = grades[student.id] || { midterm: 0, final: 0, practical: 0, attendanceMark: 0 };
              const total = calculateTotal(studentGrades);
              
              return (
                <tr key={student.id}>
                  <td style={{ fontWeight: '500' }}>{student.fullName || student.name}</td>
                  <td>{student.code || student.uniqueCode || student.id.slice(0, 8)}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={studentGrades.midterm || 0}
                      onChange={(e) => handleGradeChange(student.id, 'midterm', e.target.value)}
                      className={styles.input}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={studentGrades.final || 0}
                      onChange={(e) => handleGradeChange(student.id, 'final', e.target.value)}
                      className={styles.input}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={studentGrades.practical || 0}
                      onChange={(e) => handleGradeChange(student.id, 'practical', e.target.value)}
                      className={styles.input}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={studentGrades.attendanceMark || 0}
                      onChange={(e) => handleGradeChange(student.id, 'attendanceMark', e.target.value)}
                      className={styles.input}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <strong style={{ 
                      color: total >= 60 ? '#10b981' : total >= 50 ? '#f59e0b' : '#ef4444'
                    }}>
                      {total}%
                    </strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: "16px", padding: "12px", background: "#f8fafc", borderRadius: "12px", fontSize: "14px", color: "#64748b" }}>
        <p>💡 Note: Midterm (10%), Final (60%), Practical (25%), Attendance (5%)</p>
        <p>📌 Total score = (Midterm × 0.1) + (Final × 0.6) + (Practical × 0.25) + (Attendance × 0.05)</p>
      </div>
    </PageLayout>
  );
};

export default Grades;