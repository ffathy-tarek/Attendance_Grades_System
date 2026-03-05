import { useState } from "react";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

const Students = () => {
  const [students, setStudents] = useState([
    { id: 1, name: "Fathy Tarek", code: "2327415", level: 3, department: "CS" },
    { id: 2, name: "Leo Messi", code: "2223002", level: 4, department: "MAICRO" },
    { id: 3, name: "Ahmed Mohamed", code: "2523003", level: 1, department: "MATHIMATICS" },
    { id: 4, name: "Aly Elsawy", code: "2423004", level: 2, department: "CHEMISTRY" },
    { id: 5, name: "Ibrahim Mohamed", code: "2523004", level: 1, department: "CHEMISTRY" },
    { id: 6, name: "Malek Mohamed", code: "2224444", level: 4, department: "CS" },
    { id: 7, name: "Mai Adel", code: "2423004", level: 1, department: "MATH" },
    { id: 8, name: "Omar Ahmed", code: "2023815", level: 3, department: "CS" },
  ]);

  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ✅ NEW: Subjects
  const [subjects] = useState([
    { id: "sub1", name: "Math 1" },
    { id: "sub2", name: "Physics" },
    { id: "sub3", name: "Programming" },
  ]);

  const [assignModal, setAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");

  const [newStudent, setNewStudent] = useState({
    name: "",
    code: "",
    level: 1,
    department: "CS"
  });

  // 🔎 Filtering
  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesLevel = selectedLevel
      ? student.level === Number(selectedLevel)
      : true;

    return matchesSearch && matchesLevel;
  });

  const totalStudents = filteredStudents.length;
  const totalDepartments = [
    ...new Set(filteredStudents.map((s) => s.department)),
  ].length;

  // ➕ Add / ✏️ Edit
  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.code) return;

    if (editingStudent) {
      setStudents(
        students.map((s) =>
          s.id === editingStudent.id
            ? { ...newStudent, id: s.id, level: Number(newStudent.level) }
            : s
        )
      );
      setEditingStudent(null);
    } else {
      const student = {
        id: students.length + 1,
        ...newStudent,
        level: Number(newStudent.level)
      };
      setStudents([...students, student]);
    }

    setShowModal(false);

    setNewStudent({
      name: "",
      code: "",
      level: 1,
      department: "CS"
    });
  };

  // ✅ NEW: Assign Functions
  const handleAssign = (student) => {
    setSelectedStudent(student);
    setAssignModal(true);
  };

  const handleAssignConfirm = async () => {
    if (!selectedSubject) return;

    try {
      // نمنع التكرار
      const q = query(
        collection(db, "enrollments"),
        where("studentId", "==", selectedStudent.id),
        where("courseId", "==", selectedSubject)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert("Student already assigned to this subject ⚠");
        return;
      }

      // نضيف enrollment جديد
      await addDoc(collection(db, "enrollments"), {
        studentId: selectedStudent.id,
        courseId: selectedSubject,
        createdAt: new Date(),
      });

      alert("Student assigned successfully ✅");

      setAssignModal(false);
      setSelectedSubject("");

    } catch (error) {
      console.error("Error assigning student:", error);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
            <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Students</h2>
          <p style={{ color: "#64748B", marginTop: "5px" }}>
            Manage university students
          </p>
        </div>

        <button
          style={addBtn}
          onClick={() => {
            setEditingStudent(null);
            setShowModal(true);
          }}
        >
          + Add Student
        </button>
      </div>

      <div style={statsContainer}>
        <div style={statCard}>
          <h3 style={statNumber}>{totalStudents}</h3>
          <p style={statLabel}>Total Students</p>
        </div>

        <div style={statCard}>
          <h3 style={statNumber}>{totalDepartments}</h3>
          <p style={statLabel}>Departments</p>
        </div>
      </div>

      <div style={filterContainer}>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />

        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          style={inputStyle}
        >
          <option value="">All Levels</option>
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
          <option value="3">Level 3</option>
          <option value="4">Level 4</option>
        </select>
      </div>

      <div style={cardStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Level</th>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td style={tdStyle}>{student.name}</td>
                  <td style={tdStyle}>{student.code}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle}>
                      {student.level}
                    </span>
                  </td>
                  <td style={tdStyle}>{student.department}</td>

                  <td style={tdStyle}>
                    <button
                      style={editBtn}
                      onClick={() => {
                        setEditingStudent(student);
                        setNewStudent(student);
                        setShowModal(true);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      style={deleteBtn}
                      onClick={() => setConfirmDelete(student)}
                    >
                      Delete
                    </button>

                    {/* ✅ NEW Assign Button */}
                    <button
                      style={{
                        backgroundColor: "#10B981",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        marginLeft: "8px"
                      }}
                      onClick={() => handleAssign(student)}
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ padding: "20px", textAlign: "center" }}>
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>{editingStudent ? "Edit Student" : "Add New Student"}</h3>

            <input
              style={modalInput}
              placeholder="Student Name"
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent({ ...newStudent, name: e.target.value })
              }
            />

            <input
              style={modalInput}
              placeholder="Student Code"
              value={newStudent.code}
              onChange={(e) =>
                setNewStudent({ ...newStudent, code: e.target.value })
              }
            />

            <select
              style={modalInput}
              value={newStudent.level}
              onChange={(e) =>
                setNewStudent({ ...newStudent, level: e.target.value })
              }
            >
              <option value={1}>Level 1</option>
              <option value={2}>Level 2</option>
              <option value={3}>Level 3</option>
              <option value={4}>Level 4</option>
            </select>

            <select
              style={modalInput}
              value={newStudent.department}
              onChange={(e) =>
                setNewStudent({ ...newStudent, department: e.target.value })
              }
            >
              <option value="CS">CS</option>
              <option value="IS">IS</option>
              <option value="CHEMISTRY">CHEMISTRY</option>
              <option value="MATHIMATICS">MATHIMATICS</option>
            </select>

            <div style={{ textAlign: "right", marginTop: "15px" }}>
              <button
                style={cancelBtn}
                onClick={() => {
                  setShowModal(false);
                  setEditingStudent(null);
                }}
              >
                Cancel
              </button>
              <button style={saveBtn} onClick={handleAddStudent}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {confirmDelete && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Confirm Delete</h3>
            <p>
              Are you sure you want to delete{" "}
              <strong>{confirmDelete.name}</strong>?
            </p>

            <div style={{ textAlign: "right", marginTop: "20px" }}>
              <button
                style={cancelBtn}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>

              <button
                style={deleteBtn}
                onClick={() => {
                  setStudents(
                    students.filter((s) => s.id !== confirmDelete.id)
                  );
                  setConfirmDelete(null);
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW Assign Modal */}
      {assignModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Assign Subject</h3>

            <select
              style={modalInput}
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Select Subject</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>

            <div style={{ textAlign: "right", marginTop: "15px" }}>
              <button
                style={cancelBtn}
                onClick={() => setAssignModal(false)}
              >
                Cancel
              </button>

              <button style={saveBtn} onClick={handleAssignConfirm}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


/* ======= الستايلز زي ما هي ======= */

const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" };
const addBtn = { backgroundColor: "#1E3A8A", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" };
const statsContainer = { display: "flex", gap: "20px", marginBottom: "30px" };
const statCard = { flex: 1, backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", textAlign: "center" };
const statNumber = { margin: 0, fontSize: "28px", color: "#1E3A8A" };
const statLabel = { marginTop: "8px", color: "#64748B", fontSize: "14px" };
const filterContainer = { display: "flex", gap: "15px", marginBottom: "20px" };
const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", width: "200px" };
const cardStyle = { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.08)", overflow: "hidden" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { padding: "15px", backgroundColor: "#F1F5F9", color: "#1E3A8A", textAlign: "left" };
const tdStyle = { padding: "15px", borderTop: "1px solid #E2E8F0", textAlign: "left", maxWidth: "180px", wordWrap: "break-word", overflowWrap: "break-word", lineHeight: "1.4" };
const badgeStyle = { backgroundColor: "#E0F2FE", color: "#0EA5E9", padding: "5px 12px", borderRadius: "20px" };
const editBtn = { backgroundColor: "#3B82F6", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", marginRight: "8px" };
const deleteBtn = { backgroundColor: "#DC2626", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px" };
const overlayStyle = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" };
const modalStyle = { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "400px" };
const modalInput = { width: "100%", padding: "10px", marginTop: "10px", borderRadius: "8px", border: "1px solid #CBD5E1" };
const cancelBtn = { backgroundColor: "#94A3B8", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", marginRight: "10px" };
const saveBtn = { backgroundColor: "#1E3A8A", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px" };

export default Students;