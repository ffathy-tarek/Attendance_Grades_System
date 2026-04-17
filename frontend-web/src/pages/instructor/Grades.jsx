import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  query,
  where,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';

const Grades = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [gradesData, setGradesData] = useState({});
  const [originalGrades, setOriginalGrades] = useState({});
  const [saved, setSaved] = useState(false);

  // 1. جلب المواد الخاصة بالمدرب
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "courses"),
          where("instructorIds", "array-contains", user.uid)
        );
        const snap = await getDocs(q);
        const coursesData = await Promise.all(
          snap.docs.map(async (doc) => {
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
        setCourses(coursesData);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  // 2. عند اختيار مادة، جلب الطلاب والدرجات
  const handleCourseSelect = async (course) => {
    setSelectedCourse(course);
    setLoading(true);
    
    try {
      // جلب الطلاب المسجلين
      const qEnroll = query(
        collection(db, "enrollments"),
        where("courseId", "==", course.id)
      );
      const enrollSnap = await getDocs(qEnroll);
      
      const studentsList = [];
      for (const enr of enrollSnap.docs) {
        const uDoc = await getDoc(doc(db, "users", enr.data().studentId));
        if (uDoc.exists()) {
          studentsList.push({ 
            id: uDoc.id, 
            name: uDoc.data().fullName || uDoc.data().name,
            code: uDoc.data().code || uDoc.data().uniqueCode || uDoc.id.slice(0, 8)
          });
        }
      }
      setStudents(studentsList);
      
      // جلب الدرجات من Firebase
      const gradesMap = {};
      for (const student of studentsList) {
        const gradesQuery = query(
          collection(db, "grades"),
          where("courseId", "==", course.id),
          where("studentId", "==", student.id)
        );
        const gradesSnap = await getDocs(gradesQuery);
        
        let midterm = 0;
        let final = 0;
        let practical = 0;
        
        gradesSnap.forEach(doc => {
          const data = doc.data();
          const assessmentName = data.assessmentName?.toLowerCase() || '';
          const score = data.score || 0;
          
          if (assessmentName.includes('midterm')) {
            midterm = score;
          } else if (assessmentName.includes('final')) {
            final = score;
          } else if (assessmentName.includes('practical')) {
            practical = score;
          }
        });
        
        gradesMap[student.id] = { midterm, final, practical };
      }
      setGradesData(gradesMap);
      setOriginalGrades(JSON.parse(JSON.stringify(gradesMap))); // نسخة أصلية للمقارنة
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. تحديل درجة معينة
  const handleGradeChange = (studentId, field, value) => {
    const maxValue = field === 'midterm' ? 10 : field === 'final' ? 60 : 30;
    const numValue = value === '' ? 0 : Math.min(maxValue, Math.max(0, Number(value)));
    
    setGradesData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue
      }
    }));
    setSaved(false);
  };

  // 4. حساب النسبة المئوية
  const calculateTotal = (grades) => {
    if (!grades) return 0;
    return (grades.midterm || 0) + (grades.final || 0) + (grades.practical || 0);
  };

  // 5. تحديد الحالة حسب النسبة
  const getStatus = (percentage) => {
    if (percentage >= 85) return { text: 'Excellent', color: '#10b981', bg: '#dcfce7' };
    if (percentage >= 75) return { text: 'Very Good', color: '#3b82f6', bg: '#dbeafe' };
    if (percentage >= 65) return { text: 'Good', color: '#8b5cf6', bg: '#ede9fe' };
    if (percentage >= 60) return { text: 'Pass', color: '#f59e0b', bg: '#fef3c7' };
    return { text: 'Fail', color: '#ef4444', bg: '#fee2e2' };
  };

  // 6. حفظ التغييرات فقط (اللي اتغيرت عن النسخة الأصلية)
  const saveChangesOnly = async () => {
    setSaving(true);
    setSaved(false);
    
    const changes = [];
    
    // مقارنة الدرجات الحالية مع النسخة الأصلية
    for (const student of students) {
      const current = gradesData[student.id];
      const original = originalGrades[student.id];
      
      if (!current) continue;
      
      // التحقق من التغييرات لكل حقل
      if (current.midterm !== original?.midterm) {
        changes.push({
          studentId: student.id,
          studentName: student.name,
          field: 'midterm',
          value: current.midterm,
          assessmentName: 'Midterm'
        });
      }
      
      if (current.final !== original?.final) {
        changes.push({
          studentId: student.id,
          studentName: student.name,
          field: 'final',
          value: current.final,
          assessmentName: 'Final'
        });
      }
      
      if (current.practical !== original?.practical) {
        changes.push({
          studentId: student.id,
          studentName: student.name,
          field: 'practical',
          value: current.practical,
          assessmentName: 'Practical'
        });
      }
    }
    
    if (changes.length === 0) {
      alert("No changes to save!");
      setSaving(false);
      return;
    }
    
    try {
      // حفظ التغييرات فقط
      for (const change of changes) {
        const gradeId = `${selectedCourse.id}_${change.studentId}_${change.field}`;
        await setDoc(doc(db, "grades", gradeId), {
          courseId: selectedCourse.id,
          studentId: change.studentId,
          assessmentName: change.assessmentName,
          score: change.value,
          instructorId: user?.uid,
          updatedAt: new Date()
        }, { merge: true });
      }
      
      // تحديث النسخة الأصلية
      setOriginalGrades(JSON.parse(JSON.stringify(gradesData)));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      alert(`✅ Saved ${changes.length} change(s) successfully!`);
      
    } catch (error) {
      console.error("Error saving grades:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <PageLayout title="Grades Management" subtitle="Loading your courses...">
        <div className={styles.loading}>Loading...</div>
      </PageLayout>
    );
  }

  // عرض المواد أولاً
  if (!selectedCourse) {
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
          {courses.map(course => (
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
                <button 
                  className={styles.courseButton}
                  onClick={() => handleCourseSelect(course)}
                >
                  🎯 Manage Grades
                </button>
              </div>
            </div>
          ))}
          
          {courses.length === 0 && (
            <div className={styles.emptyState}>
              <h3>No Courses Found</h3>
              <p>You haven't been assigned to any courses yet</p>
            </div>
          )}
        </div>
      </PageLayout>
    );
  }

  // حساب عدد التغييرات
  const getChangesCount = () => {
    let count = 0;
    for (const student of students) {
      const current = gradesData[student.id];
      const original = originalGrades[student.id];
      if (!current) continue;
      if (current.midterm !== original?.midterm) count++;
      if (current.final !== original?.final) count++;
      if (current.practical !== original?.practical) count++;
    }
    return count;
  };

  const changesCount = getChangesCount();

  // عرض جدول الطلاب والدرجات
  return (
    <PageLayout 
      title="Grades Management" 
      subtitle={`${selectedCourse.name} - Enter student grades`}
      actions={
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={styles.cancelButton}
            onClick={() => setSelectedCourse(null)}
          >
            ← Back to Courses
          </button>
          <button 
            className={styles.saveButton}
            onClick={saveChangesOnly}
            disabled={saving || changesCount === 0}
            style={{
              opacity: (saving || changesCount === 0) ? 0.6 : 1,
              cursor: (saving || changesCount === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : `💾 Save Changes (${changesCount})`}
          </button>
        </div>
      }
    >
      {/* تحذير إذا لم يتم حفظ التغييرات */}
      {changesCount > 0 && !saved && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '12px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>⚠️</span>
          <span style={{ color: '#92400e', fontSize: '13px' }}>
            You have {changesCount} unsaved change(s). Click "Save Changes" to update the database.
          </span>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student Code</th>
              <th>Midterm (max 10)</th>
              <th>Final (max 60)</th>
              <th>Practical (max 30)</th>
              <th>Total (max 100)</th>
              <th>Percentage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const grades = gradesData[student.id] || { midterm: 0, final: 0, practical: 0 };
              const total = calculateTotal(grades);
              const status = getStatus(total);
              
              // التحقق إذا كان هذا الطالب عنده تغييرات
              const original = originalGrades[student.id];
              const hasChanges = original && (
                grades.midterm !== original.midterm ||
                grades.final !== original.final ||
                grades.practical !== original.practical
              );
              
              return (
                <tr key={student.id} style={{
                  background: hasChanges ? '#fffbeb' : 'white'
                }}>
                  <td style={{ fontWeight: '500' }}>{student.name} {hasChanges && <span style={{ color: '#f59e0b', fontSize: '11px' }}> (edited)</span>}</td>
                  <td>{student.code}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={grades.midterm || 0}
                      onChange={(e) => handleGradeChange(student.id, 'midterm', e.target.value)}
                      className={styles.input}
                      style={{ width: '70px', textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={grades.final || 0}
                      onChange={(e) => handleGradeChange(student.id, 'final', e.target.value)}
                      className={styles.input}
                      style={{ width: '70px', textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={grades.practical || 0}
                      onChange={(e) => handleGradeChange(student.id, 'practical', e.target.value)}
                      className={styles.input}
                      style={{ width: '70px', textAlign: 'center' }}
                    />
                  </td>
                  <td>
                    <strong>{total} / 100</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={styles.progressBar} style={{ width: '60px' }}>
                        <div 
                          className={styles.progressFill} 
                          style={{ 
                            width: `${total}%`,
                            backgroundColor: total >= 75 ? '#10b981' : total >= 60 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                      <span>{total}%</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: status.bg,
                      color: status.color
                    }}>
                      {status.text}
                    </span>
                  </td>
                </tr>
              );
            })}
            
            {students.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  No students enrolled in this course
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        fontSize: '13px',
        color: '#475569',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <p style={{ fontWeight: '600', marginBottom: '8px' }}>📊 Grade Scale:</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ color: '#10b981' }}>● Excellent (85%+)</span>
            <span style={{ color: '#3b82f6' }}>● Very Good (75-84%)</span>
            <span style={{ color: '#8b5cf6' }}>● Good (65-74%)</span>
            <span style={{ color: '#f59e0b' }}>● Pass (60-64%)</span>
            <span style={{ color: '#ef4444' }}>● Fail (below 60%)</span>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          Max scores: Midterm (10) + Final (60) + Practical (30) = 100
        </div>
      </div>
    </PageLayout>
  );
};

export default Grades;