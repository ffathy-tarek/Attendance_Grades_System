import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import PageLayout from "../../components/student/PageLayout";
import styles from "../../components/student/PageLayout.module.css";

function SeeStudents() {
  const { subjectId } = useParams();
  const [students, setStudents] = useState([]);
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // جلب المادة
        if (subjectId) {
          const subjectDoc = await getDoc(doc(db, "subjects", subjectId));
          if (subjectDoc.exists()) {
            setSubject({ id: subjectDoc.id, ...subjectDoc.data() });
          }
        }

        // جلب الطلاب
        const querySnapshot = await getDocs(collection(db, "users"));
        const studentsList = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role === "student") {
            studentsList.push({
              id: doc.id,
              ...data
            });
          }
        });

        setStudents(studentsList);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [subjectId]);

  if (loading) {
    return (
      <PageLayout title="Students" subtitle="Loading...">
        <div className={styles.loading}>Loading students...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Students List" 
      subtitle={subject ? `${subject.name} - Enrolled Students` : "All Students"}
      actions={
        <button className={styles.exportButton}>
          📥 Export List
        </button>
      }
    >
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Student Code</th>
              <th>Department</th>
              <th>Academic Year</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.fullName || student.name}</td>
                <td>{student.email}</td>
                <td>{student.uniqueCode || student.code || student.id.slice(0, 8)}</td>
                <td>{student.department || "-"}</td>
                <td>{student.academicYear || "-"}</td>
              </tr>
            ))}
            
            {students.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}

export default SeeStudents;