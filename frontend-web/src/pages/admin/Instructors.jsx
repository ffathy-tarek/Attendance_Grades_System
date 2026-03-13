import { useState, useEffect } from "react";
import {
  addDoc,
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";

const Instructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showViewSubjectsModal, setShowViewSubjectsModal] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [currentInstructorSubjects, setCurrentInstructorSubjects] = useState(
    [],
  );
  const [saving, setSaving] = useState(false);

  const [newInstructor, setNewInstructor] = useState({
    fullName: "",
    department: "",
    assignedSubjects: [],
  });

  useEffect(() => {
    loadInstructors();
    loadSubjects();
  }, []);

  const loadInstructors = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const list = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((u) => u.role === "instructor");
    setInstructors(list);
    const deps = [...new Set(list.map((i) => i.department).filter(Boolean))];
    setDepartments(deps);
  };

  const loadSubjects = async () => {
    const snapshot = await getDocs(collection(db, "courses"));
    const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setSubjects(list);
  };

  const deleteInstructor = async (id) => {
    if (window.confirm("Are you sure you want to delete this instructor?")) {
      try {
        await deleteDoc(doc(db, "users", id));
        alert("Instructor deleted successfully!");
        loadInstructors();
      } catch (e) {
        alert("Error deleting instructor");
      }
    }
  };

  const handleSubjectToggle = (subjectId) => {
    setNewInstructor((prev) => {
      const isAssigned = prev.assignedSubjects.includes(subjectId);
      return {
        ...prev,
        assignedSubjects: isAssigned
          ? prev.assignedSubjects.filter((id) => id !== subjectId)
          : [...prev.assignedSubjects, subjectId],
      };
    });
  };

  const handleSave = async () => {
    if (!newInstructor.fullName) return alert("Please enter the full name");

    setSaving(true);
    try {
      let instructorId = editingInstructor?.id;

      if (editingInstructor) {
        await updateDoc(doc(db, "users", instructorId), {
          fullName: newInstructor.fullName,
          department: newInstructor.department,
        });
      } else {
        const docRef = await addDoc(collection(db, "users"), {
          fullName: newInstructor.fullName,
          department: newInstructor.department,
          role: "instructor",
        });
        instructorId = docRef.id;
      }

      const batch = writeBatch(db);
      subjects.forEach((subject) => {
        const subjectRef = doc(db, "courses", subject.id);
        let currentInstructors = Array.isArray(subject.instructorIds)
          ? [...subject.instructorIds]
          : [];

        const shouldHaveThisInstructor =
          newInstructor.assignedSubjects.includes(subject.id);
        const alreadyHasThisInstructor =
          currentInstructors.includes(instructorId);

        if (shouldHaveThisInstructor && !alreadyHasThisInstructor) {
          currentInstructors.push(instructorId);
          batch.update(subjectRef, { instructorIds: currentInstructors });
        } else if (!shouldHaveThisInstructor && alreadyHasThisInstructor) {
          currentInstructors = currentInstructors.filter(
            (id) => id !== instructorId,
          );
          batch.update(subjectRef, { instructorIds: currentInstructors });
        }
      });

      await batch.commit();
      alert(
        editingInstructor
          ? "Instructor updated successfully!"
          : "Instructor added successfully!",
      );

      setShowModal(false);
      setEditingInstructor(null);
      setNewInstructor({ fullName: "", department: "", assignedSubjects: [] });
      loadInstructors();
      loadSubjects();
    } catch (error) {
      alert("An error occurred while saving data");
    } finally {
      setSaving(false);
    }
  };

  const handleViewSubjects = (insId) => {
    const assigned = subjects.filter((s) => s.instructorIds?.includes(insId));
    setCurrentInstructorSubjects(assigned);
    setShowViewSubjectsModal(true);
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Instructors</h2>
        </div>
        <button
          style={addBtn}
          onClick={() => {
            setEditingInstructor(null);
            setNewInstructor({
              fullName: "",
              department: "",
              assignedSubjects: [],
            });
            setShowModal(true);
          }}
        >
          + Add Instructor
        </button>
      </div>

      <input
        placeholder="Search instructor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={inputStyle}
      />

      <div style={cardStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {instructors
              .filter((i) =>
                i.fullName?.toLowerCase().includes(search.toLowerCase()),
              )
              .map((ins) => (
                <tr key={ins.id}>
                  <td style={tdStyle}>{ins.fullName}</td>
                  <td style={tdStyle}>{ins.department || "-"}</td>
                  <td style={tdStyle}>
                    <button
                      style={viewSubBtn}
                      onClick={() => handleViewSubjects(ins.id)}
                    >
                      View Subjects
                    </button>
                    <button
                      style={editBtn}
                      onClick={() => {
                        setEditingInstructor(ins);
                        const assigned = subjects
                          .filter((s) => s.instructorIds?.includes(ins.id))
                          .map((s) => s.id);
                        setNewInstructor({
                          fullName: ins.fullName,
                          department: ins.department || "",
                          assignedSubjects: assigned,
                        });
                        setShowModal(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      style={deleteBtn}
                      onClick={() => deleteInstructor(ins.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* --- Modals Section --- */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>{editingInstructor ? "Edit Instructor" : "Add Instructor"}</h3>
            <label>Full Name</label>
            <input
              style={modalInput}
              value={newInstructor.fullName}
              onChange={(e) =>
                setNewInstructor({ ...newInstructor, fullName: e.target.value })
              }
            />

            <label style={{ marginTop: "15px", display: "block" }}>
              Department
            </label>
            <input
              style={modalInput}
              list="dept-list"
              value={newInstructor.department}
              onChange={(e) =>
                setNewInstructor({
                  ...newInstructor,
                  department: e.target.value,
                })
              }
            />
            <datalist id="dept-list">
              {departments.map((d, i) => (
                <option key={i} value={d} />
              ))}
            </datalist>

            <div style={{ marginTop: "20px" }}>
              <strong>Assign Subjects:</strong>
              <div style={subjectListContainer}>
                {subjects.map((subject) => (
                  <div key={subject.id} style={{ marginBottom: "8px" }}>
                    <input
                      type="checkbox"
                      id={`sub-${subject.id}`}
                      checked={newInstructor.assignedSubjects.includes(
                        subject.id,
                      )}
                      onChange={() => handleSubjectToggle(subject.id)}
                    />
                    <label
                      htmlFor={`sub-${subject.id}`}
                      style={{ marginLeft: "8px", cursor: "pointer" }}
                    >
                      {subject.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: "20px" }}>
              <button style={cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button style={saveBtn} onClick={handleSave}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewSubjectsModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Assigned Subjects</h3>
            <div style={{ margin: "20px 0" }}>
              {currentInstructorSubjects.length > 0 ? (
                currentInstructorSubjects.map((s) => (
                  <div key={s.id} style={subjectRow}>
                    📚 {s.name} ({s.code})
                  </div>
                ))
              ) : (
                <p>No subjects assigned to this instructor.</p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                style={cancelBtn}
                onClick={() => setShowViewSubjectsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const addBtn = {
  background: "#1E3A8A",
  color: "white",
  padding: "10px 15px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const viewSubBtn = {
  background: "#F59E0B",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  marginRight: "5px",
  cursor: "pointer",
};
const editBtn = {
  background: "#3B82F6",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  marginRight: "5px",
  cursor: "pointer",
};
const deleteBtn = {
  background: "#DC2626",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "6px",
  cursor: "pointer",
};

const inputStyle = {
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  marginBottom: "20px",
  width: "300px",
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
  color: "#1E3A8A",
  textAlign: "left",
};
const tdStyle = { padding: "15px", borderTop: "1px solid #eee" };

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
  padding: "30px",
  borderRadius: "12px",
  width: "450px",
};
const modalInput = {
  width: "100%",
  padding: "10px",
  marginTop: "5px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  boxSizing: "border-box",
};
const subjectListContainer = {
  maxHeight: "150px",
  overflowY: "auto",
  marginTop: "10px",
  border: "1px solid #eee",
  padding: "10px",
  borderRadius: "8px",
};
const cancelBtn = {
  background: "#94A3B8",
  color: "white",
  border: "none",
  padding: "8px 15px",
  borderRadius: "8px",
  marginRight: "10px",
  cursor: "pointer",
};
const saveBtn = {
  background: "#1E3A8A",
  color: "white",
  border: "none",
  padding: "8px 15px",
  borderRadius: "8px",
  cursor: "pointer",
};
const subjectRow = {
  padding: "10px",
  background: "#f8fafc",
  borderRadius: "8px",
  marginBottom: "8px",
  borderLeft: "4px solid #F59E0B",
  fontWeight: "500",
};

export default Instructors;
