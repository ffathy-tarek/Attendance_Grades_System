import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [enrollCounts, setEnrollCounts] = useState({});

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const navigate = useNavigate();

  const [newSubject, setNewSubject] = useState({
    name: "",
    code: "",
    level: "",
    creditHours: "",
    department: "",
    instructorIds: [],
  });

  useEffect(() => {
    loadSubjects();
    loadInstructors();
  }, []);

  const loadSubjects = async () => {
    const snapshot = await getDocs(collection(db, "courses"));

    const list = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    setSubjects(list);

    const enrollSnap = await getDocs(collection(db, "enrollments"));
    const counts = {};

    enrollSnap.docs.forEach((doc) => {
      const data = doc.data();
      const courseId = data.courseId;

      counts[courseId] = (counts[courseId] || 0) + 1;
    });

    setEnrollCounts(counts);
  };

  const loadInstructors = async () => {
    const snapshot = await getDocs(collection(db, "users"));

    const list = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => u.role === "instructor");

    setInstructors(list);
  };

  const filteredSubjects = subjects.filter((sub) => {
    const instructorNames = (
      sub.instructorIds || (sub.instructorId ? [sub.instructorId] : [])
    )
      .map((id) => instructors.find((i) => i.id === id)?.fullName || "")
      .join(", ");

    const subjectName = (sub.name || "").toLowerCase();
    const instructorText = instructorNames.toLowerCase();
    const searchText = search.toLowerCase();

    const matchSearch =
      subjectName.includes(searchText) || instructorText.includes(searchText);

    const matchLevel =
      levelFilter === "all" || (sub.level || "").toString() === levelFilter;

    return matchSearch && matchLevel;
  });

  const handleSave = async () => {
    if (!newSubject.name || !newSubject.code) {
      alert("Please fill name and code");
      return;
    }

    if (editingSubject) {
      await updateDoc(doc(db, "courses", editingSubject.id), newSubject);
    } else {
      await addDoc(collection(db, "courses"), newSubject);
    }

    setShowModal(false);
    setEditingSubject(null);

    setNewSubject({
      name: "",
      code: "",
      level: "",
      creditHours: "",
      department: "",
      instructorIds: [],
    });

    loadSubjects();
  };

  const deleteSubject = async (id) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      await deleteDoc(doc(db, "courses", id));
      loadSubjects();
    }
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setNewSubject(subject);
    setShowModal(true);
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={headerStyle}>
        <h2>Subjects Management</h2>

        <button
          style={addBtn}
          onClick={() => {
            setEditingSubject(null);
            setShowModal(true);
          }}
        >
          Add Subject
        </button>
      </div>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <input
          style={inputStyle}
          placeholder="Search subject or instructor"
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
              <th style={thStyle}>Level</th>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Credit Hours</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredSubjects.map((subject) => (
              <tr key={subject.id}>
                <td style={tdStyle}>
                  <div style={subjectNameStyle}>
                    {subject.name}

                    <span style={studentsBadge}>
                      👥 {enrollCounts[subject.id] || 0}
                    </span>
                  </div>
                </td>

                <td style={tdStyle}>{subject.code}</td>

                <td style={tdStyle}>
                  <span style={badgeStyle}>{subject.level}</span>
                </td>

                <td style={tdStyle}>{subject.department}</td>

                <td style={tdStyle}>{subject.creditHours}</td>

                <td style={tdStyle}>
                  <button
                    style={editBtn}
                    onClick={() => openEditModal(subject)}
                  >
                    Edit
                  </button>

                  <button
                    style={deleteBtn}
                    onClick={() => deleteSubject(subject.id)}
                  >
                    Delete
                  </button>

                  <button
                    style={viewBtn}
                    onClick={() =>
                      navigate(`/admin/subject-students/${subject.id}`)
                    }
                  >
                    View Students
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>{editingSubject ? "Edit Subject" : "Add Subject"}</h3>

            <input
              style={modalInput}
              placeholder="Subject Name"
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

            <input
              style={modalInput}
              placeholder="Credit Hours"
              value={newSubject.creditHours}
              onChange={(e) =>
                setNewSubject({
                  ...newSubject,
                  creditHours: e.target.value,
                })
              }
            />

            <input
              style={modalInput}
              placeholder="Department"
              value={newSubject.department}
              onChange={(e) =>
                setNewSubject({
                  ...newSubject,
                  department: e.target.value,
                })
              }
            />

            <div style={{ marginTop: "15px", textAlign: "right" }}>
              <button style={cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button style={saveBtn} onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ===== Styles ===== */

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "20px",
};

const subjectNameStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const studentsBadge = {
  background: "#EEF2FF",
  color: "#4338CA",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "600",
};

const addBtn = {
  background: "#1E3A8A",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: "8px",
  cursor: "pointer",
};

const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  width: "200px",
};

const cardStyle = {
  background: "white",
  borderRadius: "12px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  padding: "15px",
  backgroundColor: "#F1F5F9",
  color: "#1E3A8A",
  textAlign: "left",
};

const tdStyle = {
  padding: "15px",
  borderTop: "1px solid #E2E8F0",
};

const badgeStyle = {
  backgroundColor: "#E0F2FE",
  color: "#0EA5E9",
  padding: "5px 12px",
  borderRadius: "20px",
};

const editBtn = {
  background: "#3B82F6",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
  marginRight: "8px",
};

const deleteBtn = {
  background: "#DC2626",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
};

const viewBtn = {
  background: "#059669",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
  marginLeft: "8px",
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
};

const modalStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "12px",
  width: "400px",
};

const modalInput = {
  width: "100%",
  padding: "10px",
  marginTop: "10px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
};

const cancelBtn = {
  background: "#94A3B8",
  color: "white",
  border: "none",
  padding: "8px 15px",
  borderRadius: "8px",
  marginRight: "10px",
};

const saveBtn = {
  background: "#1E3A8A",
  color: "white",
  border: "none",
  padding: "8px 15px",
  borderRadius: "8px",
};

export default Subjects;
