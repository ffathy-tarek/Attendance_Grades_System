import React, { useState, useEffect } from "react";
import { setDoc, collection, query, where, onSnapshot, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db, app } from "../../firebase"; 
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [departments, setDepartments] = useState([]);

  const [newStudent, setNewStudent] = useState({
    fullName: "",
    email: "",
    password: "", 
    code: "",
    academicYear: 1,
    department: ""
  });

  const [assignModal, setAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState([]);

  // 1. جلب الطلاب
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. جلب الأقسام
  useEffect(() => {
    const q = collection(db, "users");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => doc.data());
      const uniqueDepts = [...new Set(allData.map(u => u.department).filter(Boolean))];
      setDepartments(uniqueDepts);
    });
    return () => unsubscribe();
  }, []);

  // 3. جلب المواد
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubjects(data);
    });
    return () => unsubscribe();
  }, []);

  // المنطق المعدل: فلترة + ترتيب (حسب المستوى ثم أبجدياً)
  const filteredStudents = students
    .filter((student) => {
      const nameToSearch = (student.fullName || student.name || "").toLowerCase();
      const matchesSearch = nameToSearch.includes(search.toLowerCase());
      const matchesLevel = selectedLevel ? Number(student.academicYear) === Number(selectedLevel) : true;
      return matchesSearch && matchesLevel;
    })
    .sort((a, b) => {
      // أولاً: الترتيب حسب المستوى (Level)
      if (a.academicYear !== b.academicYear) {
        return a.academicYear - b.academicYear;
      }
      // ثانياً: الترتيب الأبجدي إذا كانا في نفس المستوى
      const nameA = a.fullName || a.name || "";
      const nameB = b.fullName || b.name || "";
      return nameA.localeCompare(nameB, ["ar", "en"]);
    });

  const totalStudents = filteredStudents.length;
  const totalDepartments = [
    ...new Set(students.map((s) => s.department || "General")),
  ].length;

  const handleAddStudent = async () => {
    if (!newStudent.fullName || !newStudent.code || !newStudent.department) {
        alert("Please fill Name, Code and Department");
        return;
    }

    try {
      if (editingStudent) {
        const studentRef = doc(db, "users", editingStudent.id);
        await updateDoc(studentRef, {
          fullName: newStudent.fullName,
          code: newStudent.code,
          department: newStudent.department.toUpperCase(),
          academicYear: Number(newStudent.academicYear),
          updatedAt: new Date()
        });
        alert("Student updated successfully ✅");
      } else {
        if (!newStudent.email || !newStudent.password) { 
          alert("Email and Password are required!"); 
          return; 
        }

        const secondaryApp = initializeApp(app.options, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);
        
        let userUid;
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStudent.email, newStudent.password);
          userUid = userCredential.user.uid;
          
          await signOut(secondaryAuth);
          await deleteApp(secondaryApp); 
        } catch (authError) {
          await deleteApp(secondaryApp);
          if (authError.code === 'auth/email-already-in-use') {
            alert("This email is already registered.");
            return;
          } else { throw authError; }
        }

        await setDoc(doc(db, "users", userUid), {
          fullName: newStudent.fullName,
          email: newStudent.email,
          code: newStudent.code,
          department: newStudent.department.toUpperCase(), 
          academicYear: Number(newStudent.academicYear),
          role: "student",
          status: "active",
          createdAt: new Date()
        });
        
        alert("Student created successfully! ✅");
      }

      setShowModal(false);
      setEditingStudent(null);
      setNewStudent({ fullName: "", email: "", password: "", code: "", academicYear: 1, department: "" });
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
        <button style={addBtn} onClick={() => { setEditingStudent(null); setNewStudent({ fullName: "", email: "", password: "", code: "", academicYear: 1, department: "" }); setShowModal(true); }}>
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
          <option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3</option><option value="4">Level 4</option>
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
                        setNewStudent({ fullName: student.fullName || student.name || "", email: student.email || "", password: "", code: student.code || "", academicYear: student.academicYear || 1, department: student.department || "" });
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
            <h3>{editingStudent ? "Edit Student Info" : "Add New Student"}</h3>
            
            <label style={labelStyle}>Full Name</label>
            <input style={modalInput} placeholder="Student Name" value={newStudent.fullName} onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} />
            
            {!editingStudent && (
              <>
                <label style={labelStyle}>Email Address</label>
                <input style={modalInput} placeholder="***@std.sci.cu.edu.eg" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} />
                
                <label style={labelStyle}>Password</label>
                <input type="password" style={modalInput} placeholder="Min 6 characters" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} />
              </>
            )}

            <label style={labelStyle}>Student Code</label>
            <input style={modalInput} placeholder="Code" value={newStudent.code} onChange={(e) => setNewStudent({ ...newStudent, code: e.target.value })} />
            
            <label style={labelStyle}>Academic Level</label>
            <select style={modalInput} value={newStudent.academicYear} onChange={(e) => setNewStudent({ ...newStudent, academicYear: Number(e.target.value) })}>
              <option value={1}>Level 1</option><option value={2}>Level 2</option><option value={3}>Level 3</option><option value={4}>Level 4</option>
            </select>
            
            <label style={labelStyle}>Department</label>
            <input 
              style={modalInput} 
              list="dept-list" 
              placeholder="Select or Type new department..." 
              value={newStudent.department} 
              onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })} 
            />
            <datalist id="dept-list">
              {departments.map((dept, index) => (
                <option key={index} value={dept} />
              ))}
            </datalist>

            <div style={{ textAlign: "right", marginTop: "20px" }}>
              <button style={cancelBtn} onClick={() => { setShowModal(false); setEditingStudent(null); }}>Cancel</button>
              <button style={saveBtn} onClick={handleAddStudent}>{editingStudent ? "Update" : "Create"}</button>
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

// Styles
const labelStyle = { display: "block", marginTop: "10px", fontWeight: "600", color: "#475569", fontSize: "14px" };
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
const modalStyle = { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "420px", maxHeight: "90vh", overflowY: "auto" };
const modalInput = { width: "100%", padding: "10px", marginTop: "5px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" };
const cancelBtn = { backgroundColor: "#94A3B8", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", marginRight: "10px", cursor: "pointer" };
const saveBtn = { backgroundColor: "#1E3A8A", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", cursor: "pointer" };

export default Students;