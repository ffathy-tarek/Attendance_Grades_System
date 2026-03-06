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
    if (!newSubject.name || !newSubject.code) return;

    const subjectData = {
      ...newSubject,
      instructorIds: newSubject.instructorIds || [],
    };

    delete subjectData.instructorId;

    if (editingSubject) {
      await updateDoc(doc(db, "courses", editingSubject.id), subjectData);
    } else {
      await addDoc(collection(db, "courses"), subjectData);
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
    await deleteDoc(doc(db, "courses", id));
    loadSubjects();
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={headerStyle}>
        <div>
          <h2>Subjects</h2>
          <p style={{ color: "#64748B" }}>Manage university subjects</p>
        </div>

        <button
          style={addBtn}
          onClick={() => {
            setEditingSubject(null);
            setNewSubject({
              name: "",
              code: "",
              level: "",
              creditHours: "",
              department: "",
              instructorIds: [],
            });
            setShowModal(true);
          }}
        >
          + Add Subject
        </button>
      </div>

      <div style={filterContainer}>
        <input
          placeholder="Search by name or instructor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={filterInput}
        />

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          style={filterSelect}
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
              <th style={thStyle}>Instructor</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredSubjects.map((sub) => (
              <tr key={sub.id}>
                <td style={tdStyle}>{sub.name || "-"}</td>
                <td style={tdStyle}>{sub.code || "-"}</td>

                <td style={tdStyle}>
                  <span style={badgeStyle}>{sub.level || "-"}</span>
                </td>

                <td style={tdStyle}>{sub.department || "-"}</td>
                <td style={tdStyle}>{sub.creditHours || "-"}</td>

                <td style={tdStyle}>
                  {(
                    sub.instructorIds ||
                    (sub.instructorId ? [sub.instructorId] : [])
                  )
                    .map(
                      (id) =>
                        instructors.find((i) => i.id === id)?.fullName || "",
                    )
                    .join(", ") || "-"}
                </td>

                <td style={tdStyle}>
                  <button
                    style={editBtn}
                    onClick={() => {
                      setEditingSubject(sub);

                      setNewSubject({
                        name: sub.name || "",
                        code: sub.code || "",
                        level: sub.level || "",
                        creditHours: sub.creditHours || "",
                        department: sub.department || "",
                        instructorIds:
                          sub.instructorIds ||
                          (sub.instructorId ? [sub.instructorId] : []),
                      });

                      setShowModal(true);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    style={deleteBtn}
                    onClick={() => deleteSubject(sub.id)}
                  >
                    Delete
                  </button>

                  <button
                    style={viewBtn}
                    onClick={() => navigate(`/subjects/${sub.id}/students`)}
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
              placeholder="Subject Code"
              value={newSubject.code}
              onChange={(e) =>
                setNewSubject({ ...newSubject, code: e.target.value })
              }
            />

            <select
              style={modalInput}
              value={newSubject.level}
              onChange={(e) =>
                setNewSubject({ ...newSubject, level: e.target.value })
              }
            >
              <option value="">Select Level</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
            </select>

            <input
              style={modalInput}
              placeholder="Department"
              value={newSubject.department}
              onChange={(e) =>
                setNewSubject({ ...newSubject, department: e.target.value })
              }
            />

            <input
              style={modalInput}
              placeholder="Credit Hours"
              value={newSubject.creditHours}
              onChange={(e) =>
                setNewSubject({ ...newSubject, creditHours: e.target.value })
              }
            />

            <select
              multiple
              style={modalInput}
              value={newSubject.instructorIds}
              onChange={(e) => {
                const options = [...e.target.selectedOptions].map(
                  (o) => o.value,
                );

                setNewSubject({
                  ...newSubject,
                  instructorIds: options,
                });
              }}
            >
              {instructors.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.fullName}
                </option>
              ))}
            </select>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
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

export default Subjects;

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "20px",
};

const addBtn = {
  background: "#1E3A8A",
  color: "white",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
};

const filterContainer = {
  display: "flex",
  gap: "15px",
  marginBottom: "20px",
};

const filterInput = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  width: "220px",
};

const filterSelect = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  width: "160px",
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
