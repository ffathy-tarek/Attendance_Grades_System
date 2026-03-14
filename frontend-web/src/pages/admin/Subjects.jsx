import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy, // تم إضافة orderBy هنا
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedInstructors, setSelectedInstructors] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [instructorSearch, setInstructorSearch] = useState("");
  const [enrollCounts, setEnrollCounts] = useState({});
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showInstructorModal, setShowInstructorModal] = useState(false);
  const [showAssignInsModal, setShowAssignInsModal] = useState(false);

  const [currentSubjectId, setCurrentSubjectId] = useState(null);
  const [currentInstructors, setCurrentInstructors] = useState([]);
  const [editingSubject, setEditingSubject] = useState(null);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const emptySubject = {
    name: "",
    code: "",
    level: "",
    creditHours: "",
    instructorIds: [],
  };

  const [newSubject, setNewSubject] = useState(emptySubject);

  const toggleSelectAllStudents = (filteredStudents) => {
    const filteredIds = filteredStudents.map((s) => s.id);
    const allSelected = filteredIds.every((id) =>
      selectedStudents.includes(id),
    );

    if (allSelected) {
      setSelectedStudents((prev) =>
        prev.filter((id) => !filteredIds.includes(id)),
      );
    } else {
      setSelectedStudents((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  // --- الدالة المحدثة للترتيب الأبجدي ---
  const loadSubjects = async () => {
    try {
      // تعديل الاستعلام ليقوم بالترتيب حسب الاسم تصاعدياً (أبجدياً)
      const q = query(collection(db, "courses"), orderBy("name", "asc"));
      const snapshot = await getDocs(q);

      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubjects(list);

      const enrollSnap = await getDocs(collection(db, "enrollments"));
      const counts = {};
      enrollSnap.docs.forEach((d) => {
        const data = d.data();
        counts[data.courseId] = (counts[data.courseId] || 0) + 1;
      });
      setEnrollCounts(counts);
    } catch (e) {
      console.error("Error loading subjects:", e);
    }
  };

  const loadUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const allUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setStudents(allUsers.filter((u) => u.role === "student"));
    setInstructors(allUsers.filter((u) => u.role === "instructor"));
  };

  useEffect(() => {
    loadSubjects();
    loadUsers();
  }, []);

  const syncInstructors = async () => {
    setSaving(true);
    try {
      const subjectRef = doc(db, "courses", currentSubjectId);
      await updateDoc(subjectRef, { instructorIds: selectedInstructors });
      alert("Instructor list updated successfully!");
      setShowAssignInsModal(false);
      loadSubjects();
    } catch (e) {
      alert("Error updating instructors");
    } finally {
      setSaving(false);
    }
  };

  const syncStudents = async () => {
    setSaving(true);
    try {
      const q = query(
        collection(db, "enrollments"),
        where("courseId", "==", currentSubjectId),
      );
      const existingEnrollSnap = await getDocs(q);
      const existingEnrollments = existingEnrollSnap.docs.map((d) => ({
        id: d.id,
        studentId: d.data().studentId,
      }));

      for (const enroll of existingEnrollments) {
        if (!selectedStudents.includes(enroll.studentId)) {
          await deleteDoc(doc(db, "enrollments", enroll.id));
        }
      }

      const existingStudentIds = existingEnrollments.map((e) => e.studentId);
      for (const sId of selectedStudents) {
        if (!existingStudentIds.includes(sId)) {
          await addDoc(collection(db, "enrollments"), {
            courseId: currentSubjectId,
            studentId: sId,
          });
        }
      }

      alert("Student enrollments updated successfully!");
      setShowEnrollModal(false);
      loadSubjects();
    } catch (e) {
      alert("Error updating students");
    } finally {
      setSaving(false);
    }
  };

  const openEnrollModal = async (subjectId) => {
    setCurrentSubjectId(subjectId);
    setSaving(true);
    const q = query(
      collection(db, "enrollments"),
      where("courseId", "==", subjectId),
    );
    const snap = await getDocs(q);
    const enrolledIds = snap.docs.map((d) => d.data().studentId);
    setSelectedStudents(enrolledIds);
    setSaving(false);
    setShowEnrollModal(true);
  };

  const deleteSubject = async (id, subjectName) => {
    if (!window.confirm(`Confirm deleting ${subjectName || "this subject"}?`))
      return;
    try {
      await deleteDoc(doc(db, "courses", id));
      const enrollSnap = await getDocs(
        query(collection(db, "enrollments"), where("courseId", "==", id)),
      );
      for (const e of enrollSnap.docs) {
        await deleteDoc(doc(db, "enrollments", e.id));
      }
      alert("Subject deleted successfully!");
    } finally {
      loadSubjects();
    }
  };

  const handleSave = async () => {
    if (!newSubject.name || !newSubject.code)
      return alert("Fill Name and Code");
    setSaving(true);
    try {
      if (editingSubject) {
        await updateDoc(doc(db, "courses", editingSubject.id), newSubject);
        alert("Subject updated successfully!");
      } else {
        await addDoc(collection(db, "courses"), newSubject);
        alert("Subject added successfully!");
      }
      setShowModal(false);
      loadSubjects();
    } catch (e) {
      alert("Error saving");
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>Subjects Management</h2>
        <button
          style={addBtn}
          onClick={() => {
            setEditingSubject(null);
            setNewSubject(emptySubject);
            setShowModal(true);
          }}
        >
          + Add Subject
        </button>
      </div>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <input
          style={inputStyle}
          placeholder="Search subject"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={inputStyle}
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="all">All Levels</option>
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
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects
              .filter(
                (sub) =>
                  (sub.name || "")
                    .toLowerCase()
                    .includes(search.toLowerCase()) &&
                  (levelFilter === "all" ||
                    (sub.level || "").toString() === levelFilter),
              )
              .map((subject) => (
                <tr key={subject.id}>
                  <td style={tdStyle}>
                    <strong>{subject.name}</strong>{" "}
                    <span style={studentCountBadge}>
                      👥 {enrollCounts[subject.id] || 0}
                    </span>
                  </td>
                  <td style={tdStyle}>{subject.code}</td>
                  <td style={tdStyle}>
                    <button
                      style={assignInsBtn}
                      onClick={() => {
                        setCurrentSubjectId(subject.id);
                        setSelectedInstructors(subject.instructorIds || []);
                        setShowAssignInsModal(true);
                      }}
                    >
                      Instructors
                    </button>
                    <button
                      style={instructorBtn}
                      onClick={() => {
                        setCurrentInstructors(
                          instructors.filter((i) =>
                            subject.instructorIds?.includes(i.id),
                          ),
                        );
                        setShowInstructorModal(true);
                      }}
                    >
                      View Instructors
                    </button>
                    <button
                      style={viewBtn}
                      onClick={() => openEnrollModal(subject.id)}
                    >
                      Students
                    </button>
                    <button
                      style={instructorBtn}
                      onClick={() =>
                        navigate(`/admin/subject-students/${subject.id}`)
                      }
                    >
                      View Students
                    </button>
                    <button
                      style={editBtn}
                      onClick={() => {
                        setEditingSubject(subject);
                        setNewSubject(subject);
                        setShowModal(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      style={deleteBtn}
                      onClick={() => deleteSubject(subject.id, subject.name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* 1. Assign Instructor Modal */}
      {showAssignInsModal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, width: "550px" }}>
            <h3>Manage Instructors</h3>
            <input
              style={modalInput}
              placeholder="Search instructors..."
              value={instructorSearch}
              onChange={(e) => setInstructorSearch(e.target.value)}
            />
            <div style={listContainerStyle}>
              {instructors
                .filter((i) =>
                  i.fullName
                    ?.toLowerCase()
                    .includes(instructorSearch.toLowerCase()),
                )
                .map((ins) => (
                  <div key={ins.id} style={listItemStyle}>
                    <input
                      type="checkbox"
                      checked={selectedInstructors.includes(ins.id)}
                      onChange={() =>
                        setSelectedInstructors((prev) =>
                          prev.includes(ins.id)
                            ? prev.filter((x) => x !== ins.id)
                            : [...prev, ins.id],
                        )
                      }
                    />
                    <span>{ins.fullName}</span>
                  </div>
                ))}
            </div>
            <div style={{ marginTop: "20px" }}>
              <button style={saveBtn} onClick={syncInstructors}>
                {saving ? "Updating..." : "Save Changes"}
              </button>
              <button
                style={cancelBtn}
                onClick={() => setShowAssignInsModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Enroll Students Modal */}
      {showEnrollModal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, width: "600px" }}>
            <h3>Manage Student Enrollments</h3>

            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input
                style={{ ...modalInput, marginTop: 0, flex: 1 }}
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />

              <button
                type="button"
                onClick={() => {
                  const filtered = students.filter((s) =>
                    s.fullName
                      ?.toLowerCase()
                      .includes(studentSearch.toLowerCase()),
                  );
                  toggleSelectAllStudents(filtered);
                }}
                style={{
                  padding: "0 15px",
                  borderRadius: "8px",
                  border: "1px solid #1E3A8A",
                  background: "transparent",
                  color: "#1E3A8A",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                {students
                  .filter((s) =>
                    s.fullName
                      ?.toLowerCase()
                      .includes(studentSearch.toLowerCase()),
                  )
                  .every((s) => selectedStudents.includes(s.id))
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            <div style={listContainerStyle}>
              {students
                .filter((s) =>
                  s.fullName
                    ?.toLowerCase()
                    .includes(studentSearch.toLowerCase()),
                )
                .map((s) => (
                  <div key={s.id} style={listItemStyle}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s.id)}
                      onChange={() =>
                        setSelectedStudents((prev) =>
                          prev.includes(s.id)
                            ? prev.filter((x) => x !== s.id)
                            : [...prev, s.id],
                        )
                      }
                    />
                    <span>{s.fullName}</span>
                  </div>
                ))}
            </div>
            <div style={{ marginTop: "20px" }}>
              <button style={saveBtn} onClick={syncStudents}>
                {saving ? "Updating..." : "Save Changes"}
              </button>
              <button
                style={cancelBtn}
                onClick={() => setShowEnrollModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. View Instructors Modal */}
      {showInstructorModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Instructor Details</h3>
            <div style={{ margin: "20px 0" }}>
              {currentInstructors.length > 0 ? (
                currentInstructors.map((i) => (
                  <div key={i.id} style={instructorRow}>
                    👤 {i.fullName}
                  </div>
                ))
              ) : (
                <p>No instructors assigned.</p>
              )}
            </div>
            <button
              style={cancelBtn}
              onClick={() => setShowInstructorModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. Add/Edit Subject Modal */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>{editingSubject ? "Edit Subject" : "Add Subject"}</h3>
            <input
              style={modalInput}
              placeholder="Name"
              value={newSubject.name}
              onChange={(e) =>
                setNewSubject({ ...newSubject, name: e.target.value })
              }
            />
            <input
              style={modalInput}
              placeholder="Code"
              value={newSubject.code}
              onChange={(e) =>
                setNewSubject({ ...newSubject, code: e.target.value })
              }
            />
            <input
              style={modalInput}
              placeholder="Level"
              value={newSubject.level}
              onChange={(e) =>
                setNewSubject({ ...newSubject, level: e.target.value })
              }
            />
            <div style={{ marginTop: "20px" }}>
              <button style={saveBtn} onClick={handleSave}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button style={cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Styles الموحدة والاحترافية ---
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "25px",
};
const addBtn = {
  background: "#1E3A8A",
  color: "white",
  padding: "8px 15px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
};
const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
};
const cardStyle = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  overflow: "hidden",
};
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = {
  padding: "15px",
  backgroundColor: "#F1F5F9",
  textAlign: "left",
  color: "#1E3A8A",
};
const tdStyle = {
  padding: "15px",
  borderTop: "1px solid #eee",
  fontSize: "14px",
};
const assignInsBtn = {
  background: "#4F46E5",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  marginLeft: "5px",
  cursor: "pointer",
  fontSize: "12px",
};
const instructorBtn = {
  background: "#F59E0B",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  marginLeft: "5px",
  cursor: "pointer",
  fontSize: "12px",
};
const viewBtn = {
  background: "#059669",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  marginLeft: "5px",
  cursor: "pointer",
  fontSize: "12px",
};
const editBtn = {
  background: "#3B82F6",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  marginLeft: "5px",
  cursor: "pointer",
  fontSize: "12px",
};
const deleteBtn = {
  background: "#DC2626",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  marginLeft: "5px",
  cursor: "pointer",
  fontSize: "12px",
};
const badgeStyle = {
  backgroundColor: "#E0F2FE",
  color: "#0EA5E9",
  padding: "4px 10px",
  borderRadius: "15px",
  fontSize: "12px",
  fontWeight: "bold",
};
const studentCountBadge = {
  backgroundColor: "#F1F5F9",
  color: "#475569",
  padding: "2px 8px",
  borderRadius: "12px",
  fontSize: "11px",
  fontWeight: "bold",
  marginLeft: "5px",
};
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};
const modalStyle = {
  background: "white",
  padding: "25px",
  borderRadius: "12px",
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
};
const modalInput = {
  width: "100%",
  padding: "10px",
  marginTop: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  boxSizing: "border-box",
};
const listContainerStyle = {
  maxHeight: "300px",
  overflow: "auto",
  marginTop: "15px",
  border: "1px solid #eee",
  borderRadius: "8px",
  padding: "10px",
};
const listItemStyle = {
  display: "flex",
  alignItems: "center",
  padding: "8px",
  gap: "10px",
  borderBottom: "1px solid #f9f9f9",
};
const saveBtn = {
  background: "#1E3A8A",
  color: "white",
  border: "none",
  padding: "8px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  marginRight: "10px",
  fontWeight: "500",
};
const cancelBtn = {
  background: "#94A3B8",
  color: "white",
  border: "none",
  padding: "8px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "500",
};
const instructorRow = {
  padding: "10px",
  background: "#f8fafc",
  borderRadius: "8px",
  marginBottom: "8px",
  borderLeft: "4px solid #F59E0B",
  fontWeight: "500",
};

export default Subjects;
