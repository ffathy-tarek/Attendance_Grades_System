import React, { useState, useEffect } from "react";
import { setDoc, collection, query, where, onSnapshot, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const auth = getAuth();

  const [newStudent, setNewStudent] = useState({
    fullName: "",
    email: "",
    code: "",
    academicYear: 1,
    department: "CS"
  });

  const [assignModal, setAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(data);
    });
    return () => unsubscribe();
  }, []);

  const filteredStudents = students.filter((student) => {
    const nameToSearch = (student.fullName || student.name || "").toLowerCase();
    const matchesSearch = nameToSearch.includes(search.toLowerCase());
    const matchesLevel = selectedLevel ? Number(student.academicYear) === Number(selectedLevel) : true;
    return matchesSearch && matchesLevel;
  });

  const totalStudents = filteredStudents.length;
  const totalDepartments = [
    ...new Set(filteredStudents.map((s) => s.department || "General")),
  ].length;

  const handleAddStudent = async () => {
    if (!newStudent.fullName || !newStudent.code) {
        alert("Please fill Name and Code");
        return;
    }

    try {
      if (editingStudent) {
        const studentRef = doc(db, "users", editingStudent.id);
        await updateDoc(studentRef, {
          fullName: newStudent.fullName,
          code: newStudent.code,
          department: newStudent.department,
          academicYear: Number(newStudent.academicYear),
          updatedAt: new Date()
        });
        alert("Student updated successfully ✅");
      } else {
        if (!newStudent.email) { alert("Email is required!"); return; }
        
        let userUid;
        try {
          const tempPass = Math.random().toString(36).slice(-8) + "S!2026";
          const userCredential = await createUserWithEmailAndPassword(auth, newStudent.email, tempPass);
          userUid = userCredential.user.uid; // حفظ الـ UID الجديد
          await sendPasswordResetEmail(auth, newStudent.email);
        } catch (authError) {
          if (authError.code === 'auth/email-already-in-use') {
            alert("This email is already registered in Auth system.");
            return; // وقف هنا عشان ميعملش دوكيومنت عشوائي لواحد موجود أصلاً
          } else {
            throw authError;
          }
        }

        // الحل السحري هنا: بنستخدم setDoc مع الـ userUid
        await setDoc(doc(db, "users", userUid), {
          fullName: newStudent.fullName,
          email: newStudent.email,
          code: newStudent.code,
          department: newStudent.department,
          academicYear: Number(newStudent.academicYear),
          role: "student",
          status: "active",
          createdAt: new Date()
        });
        
        alert("Student registered and IDs linked successfully! 📧");
      }

      setShowModal(false);
      setEditingStudent(null);
      setNewStudent({ fullName: "", email: "", code: "", academicYear: 1, department: "CS" });
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleAssign = (student) => {
    setSelectedStudent(student);
    setAssignModal(true);
  };

  const handleAssignConfirm = async () => {
    if (!selectedSubject) return;
    try {
      const q = query(collection(db, "enrollments"), where("studentId", "==", selectedStudent.id), where("courseId", "==", selectedSubject));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        alert("Student already assigned to this subject ⚠");
        return;
      }
      // الـ enrollments ممكن تفضل addDoc عادي لأننا مش بنقرأ منها بالـ UID
      const { addDoc } = await import("firebase/firestore"); 
      await addDoc(collection(db, "enrollments"), {
        studentId: selectedStudent.id,
        courseId: selectedSubject,
        createdAt: new Date(),
      });
      alert("Student assigned successfully ✅");
      setAssignModal(false);
      setSelectedSubject("");
    } catch (error) { console.error(error); }
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Students</h2>
          <p style={{ color: "#64748B", marginTop: "5px" }}>Manage university students</p>
        </div>
        <button style={addBtn} onClick={() => { setEditingStudent(null); setNewStudent({ fullName: "", email: "", code: "", academicYear: 1, department: "CS" }); setShowModal(true); }}>
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
        <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} />
        <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} style={inputStyle}>
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
                  <td style={tdStyle}>{student.fullName || student.name}</td>
                  <td style={tdStyle}>{student.code}</td>
                  <td style={tdStyle}><span style={badgeStyle}>{student.academicYear}</span></td>
                  <td style={tdStyle}>{student.department}</td>
                  <td style={tdStyle}>
                    <button style={editBtn} onClick={() => {
                        setEditingStudent(student);
                        setNewStudent({ fullName: student.fullName || student.name || "", email: student.email || "", code: student.code || "", academicYear: student.academicYear || 1, department: student.department || "CS" });
                        setShowModal(true);
                    }}>Edit</button>
                    <button style={deleteBtn} onClick={() => setConfirmDelete(student)}>Delete</button>
                    <button style={assignBtnStyle} onClick={() => handleAssign(student)}>Assign</button>
                  </td>
                </tr>
              ))
            ) : (<tr><td colSpan="5" style={{ padding: "20px", textAlign: "center" }}>No students found</td></tr>)}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>{editingStudent ? "Edit Student" : "Add New Student"}</h3>
            <input style={modalInput} placeholder="Student Name" value={newStudent.fullName} onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} />
            {!editingStudent && (
              <input style={modalInput} placeholder="Student Email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} />
            )}
            <input style={modalInput} placeholder="Student Code" value={newStudent.code} onChange={(e) => setNewStudent({ ...newStudent, code: e.target.value })} />
            <select style={modalInput} value={newStudent.academicYear} onChange={(e) => setNewStudent({ ...newStudent, academicYear: Number(e.target.value) })}>
              <option value={1}>Level 1</option><option value={2}>Level 2</option><option value={3}>Level 3</option><option value={4}>Level 4</option>
            </select>
            <select style={modalInput} value={newStudent.department} onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}>
              <option value="CS">CS</option><option value="IS">IS</option><option value="CHEMISTRY">CHEMISTRY</option><option value="MATHIMATICS">MATHIMATICS</option>
            </select>
            <div style={{ textAlign: "right", marginTop: "15px" }}>
              <button style={cancelBtn} onClick={() => { setShowModal(false); setEditingStudent(null); }}>Cancel</button>
              <button style={saveBtn} onClick={handleAddStudent}>Save</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{confirmDelete.fullName || confirmDelete.name}</strong>?</p>
            <div style={{ textAlign: "right", marginTop: "20px" }}>
              <button style={cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={deleteBtn} onClick={async () => {
                  try { await deleteDoc(doc(db, "users", confirmDelete.id)); setConfirmDelete(null); } catch (error) { console.error(error); }
              }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Assign Subject</h3>
            <select style={modalInput} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="">Select Subject</option>
              {subjects.map((sub) => (<option key={sub.id} value={sub.id}>{sub.name}</option>))}
            </select>
            <div style={{ textAlign: "right", marginTop: "15px" }}>
              <button style={cancelBtn} onClick={() => setAssignModal(false)}>Cancel</button>
              <button style={saveBtn} onClick={handleAssignConfirm}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
const tdStyle = { padding: "15px", borderTop: "1px solid #E2E8F0", textAlign: "left", maxWidth: "180px" };
const badgeStyle = { backgroundColor: "#E0F2FE", color: "#0EA5E9", padding: "5px 12px", borderRadius: "20px" };
const editBtn = { backgroundColor: "#3B82F6", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", marginRight: "8px", cursor: "pointer" };
const deleteBtn = { backgroundColor: "#DC2626", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", cursor: "pointer" };
const assignBtnStyle = { backgroundColor: "#10B981", color: "white", border: "none", padding: "6px 12px", borderRadius: "8px", marginLeft: "8px", cursor: "pointer" };
const overlayStyle = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalStyle = { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "400px" };
const modalInput = { width: "100%", padding: "10px", marginTop: "10px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" };
const cancelBtn = { backgroundColor: "#94A3B8", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", marginRight: "10px", cursor: "pointer" };
const saveBtn = { backgroundColor: "#1E3A8A", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", cursor: "pointer" };

export default Students;