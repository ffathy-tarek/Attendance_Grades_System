import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

const SubjectStudents = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const q = query(collection(db, "enrollments"), where("courseId", "==", id));

    const snapshot = await getDocs(q);

    const list = [];

    for (const enroll of snapshot.docs) {
      const studentRef = doc(db, "users", enroll.data().studentId);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        list.push({
          id: studentSnap.id,
          ...studentSnap.data(),
        });
      }
    }

    setStudents(list);
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={headerStyle}>
        <h2>Subject Students</h2>

        <button style={backBtn} onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div style={cardStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Level</th>
              <th style={thStyle}>Department</th>
            </tr>
          </thead>

          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td style={tdStyle}>{s.fullName}</td>

                <td style={tdStyle}>{s.code}</td>

                <td style={tdStyle}>
                  <span style={badgeStyle}>{s.academicYear}</span>
                </td>

                <td style={tdStyle}>{s.department}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <p style={emptyStyle}>No students enrolled yet</p>
        )}
      </div>
    </div>
  );
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "25px",
};

const cardStyle = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  overflow: "hidden",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  textAlign: "left",
};

const thStyle = {
  padding: "14px",
  backgroundColor: "#F1F5F9",
  fontWeight: "600",
};

const tdStyle = {
  padding: "14px",
  borderTop: "1px solid #E2E8F0",
};

const badgeStyle = {
  backgroundColor: "#E0F2FE",
  color: "#0EA5E9",
  padding: "5px 12px",
  borderRadius: "20px",
  fontSize: "13px",
};

const backBtn = {
  background: "#1E3A8A",
  color: "white",
  border: "none",
  padding: "8px 15px",
  borderRadius: "8px",
  cursor: "pointer",
};

const emptyStyle = {
  padding: "25px",
  textAlign: "center",
  color: "#64748B",
};

export default SubjectStudents;
