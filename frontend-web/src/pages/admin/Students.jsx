import React, { useState, useEffect } from "react";
import { setDoc, collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, addDoc } from "firebase/firestore";
import { db, app } from "../../firebase"; 
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
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
  const [studentEnrollments, setStudentEnrollments] = useState([]);

  // 1. جلب الطلاب
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. جلب الأقسام (ديناميكياً)
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

  // 4. جلب تسجيلات الطالب (Enrollments)
  useEffect(() => {
    if (selectedStudent && assignModal) {
      const q = query(collection(db, "enrollments"), where("studentId", "==", selectedStudent.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const enrolls = snapshot.docs.map(doc => ({
          enrollId: doc.id,
          courseId: doc.data().courseId,
          courseName: subjects.find(s => s.id === doc.data().courseId)?.name || "Unknown Course"
        }));
        setStudentEnrollments(enrolls);
      });
      return () => unsubscribe();
    }
  }, [selectedStudent, assignModal, subjects]);

  const filteredStudents = students
    .filter((student) => {
      const nameToSearch = (student.fullName || student.name || "").toLowerCase();
      const matchesSearch = nameToSearch.includes(search.toLowerCase());
      const matchesLevel = selectedLevel ? Number(student.academicYear) === Number(selectedLevel) : true;
      return matchesSearch && matchesLevel;
    })
    .sort((a, b) => {
      if (a.academicYear !== b.academicYear) return a.academicYear - b.academicYear;
      const nameA = a.fullName || a.name || "";
      const nameB = b.fullName || b.name || "";
      return nameA.localeCompare(nameB, ["ar", "en"]);
    });

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
        const secondaryApp = initializeApp(app.options, "SecondaryAdd");
        const secondaryAuth = getAuth(secondaryApp);
        
        let userCredential;
        let newUserUID;

        try {
          userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStudent.email, newStudent.password);
          newUserUID = userCredential.user.uid;
        } catch (authError) {
          if (authError.code === 'auth/email-already-in-use') {
            try {
              userCredential = await signInWithEmailAndPassword(secondaryAuth, newStudent.email, newStudent.password);
              newUserUID = userCredential.user.uid;
            } catch (signInError) {
              await deleteApp(secondaryApp);
              if (signInError.code === 'auth/wrong-password') {
                alert("⚠️ هذا الإيميل مسجل مسبقاً بباسورد مختلف.");
              } else {
                alert("Auth Error: " + signInError.message);
              }
              return;
            }
          } else {
            await deleteApp(secondaryApp);
            throw authError;
          }
        }

        await signOut(secondaryAuth);
        await deleteApp(secondaryApp); 

        await setDoc(doc(db, "users", newUserUID), {
          fullName: newStudent.fullName,
          email: newStudent.email,
          code: newStudent.code,
          department: newStudent.department.toUpperCase(), 
          academicYear: Number(newStudent.academicYear),
          role: "student", 
          status: "active", 
          createdAt: new Date(),
          uid: newUserUID
        });
        alert("Student created successfully! ✅");
      }
      setShowModal(false);
      setEditingStudent(null);
      setNewStudent({ fullName: "", email: "", password: "", code: "", academicYear: 1, department: "" });
    } catch (error) { alert("Error: " + error.message); }
  };

  const handleAssignConfirm = async () => {
    if (!selectedSubject) return;
    try {
      await addDoc(collection(db, "enrollments"), {
        studentId: selectedStudent.id,
        courseId: selectedSubject,
        createdAt: new Date(),
      });
      setSelectedSubject("");
    } catch (error) { console.error(error); }
  };

  const handleUnassign = async (enrollId) => {
    if (window.confirm("Are you sure you want to remove this subject?")) {
      try {
        await deleteDoc(doc(db, "enrollments", enrollId));
      } catch (error) { console.error(error); }
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <div style={headerStyle}>
        <div><h2 style={{ margin: 0 }}>Students</h2><p style={{ color: "#64748B", marginTop: "5px" }}>Manage university students</p></div>
        <button style={addBtn} onClick={() => { setEditingStudent(null); setNewStudent({ fullName: "", email: "", password: "", code: "", academicYear: 1, department: "" }); setShowModal(true); }}>+ Add Student</button>
      </div>

      <div style={statsContainer}>
        <div style={statCard}><h3 style={statNumber}>{filteredStudents.length}</h3><p style={statLabel}>Total Students</p></div>
        <div style={statCard}><h3 style={statNumber}>{[...new Set(students.map(s => s.department))].length}</h3><p style={statLabel}>Departments</p></div>
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
            <tr><th style={thStyle}>Name</th><th style={thStyle}>Code</th><th style={thStyle}>Level</th><th style={thStyle}>Department</th><th style={thStyle}>Actions</th></tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td style={tdStyle}>{student.fullName || student.name}</td>
                <td style={tdStyle}>{student.code}</td>
                <td style={tdStyle}><span style={badgeStyle}>{student.academicYear}</span></td>
                <td style={tdStyle}>{student.department}</td>
                <td style={tdStyle}>
                  <button style={editBtn} onClick={() => { setEditingStudent(student); setNewStudent({...student}); setShowModal(true); }}>Edit</button>
                  <button style={deleteBtn} onClick={() => setConfirmDelete(student)}>Delete</button>
                  <button style={assignBtnStyle} onClick={() => { setSelectedStudent(student); setAssignModal(true); }}>Assign</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* مودال الإسناد (Assign) */}
      {assignModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Assign Subject</h3>
              <button onClick={() => setAssignModal(false)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>&times;</button>
            </div>
            <p style={{ fontSize: "14px", color: "#64748B", marginBottom: "15px" }}>Student: <strong>{selectedStudent?.fullName}</strong></p>
            <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#F8FAFC", borderRadius: "8px" }}>
              <label style={labelStyle}>Currently Enrolled In:</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                {studentEnrollments.map((env) => (
                  <div key={env.enrollId} style={chipStyle}>{env.courseName}<span onClick={() => handleUnassign(env.enrollId)} style={removeIconStyle}>&times;</span></div>
                ))}
              </div>
            </div>
            <label style={labelStyle}>Add New Subject</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <select style={modalInput} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="" hidden>Select Subject</option>
                {/* التعديل: ترتيب المواد أبجدياً قبل العرض */}
                {subjects
                  .filter(sub => !studentEnrollments.some(env => env.courseId === sub.id))
                  .sort((a, b) => (a.name || "").localeCompare(b.name || "", ["ar", "en"]))
                  .map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
              </select>
              <button style={saveBtn} onClick={handleAssignConfirm}>Assign</button>
            </div>
            <button style={{ ...cancelBtn, width: "100%", marginTop: "15px" }} onClick={() => setAssignModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* مودال الإضافة والتعديل (Add/Edit) */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginBottom: "20px", color: "#1E3A8A" }}>
              {editingStudent ? "Edit Student Details" : "Register New Student"}
            </h3>
            
            <label style={labelStyle}>Full Name</label>
            <input 
              style={modalInput} 
              placeholder="e.g. Ahmed Ali"
              value={newStudent.fullName} 
              onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} 
            />
            
            {!editingStudent && (
              <>
                <label style={labelStyle}>Email Address</label>
                <input 
                  style={modalInput} 
                  type="email"
                  placeholder="---@std.sci.cu.edu.eg"
                  autoComplete="off"
                  value={newStudent.email} 
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} 
                />
                <label style={labelStyle}>Password</label>
                <input 
                  type="password" 
                  style={modalInput} 
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  value={newStudent.password} 
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} 
                />
              </>
            )}

            <label style={labelStyle}>Student Code</label>
            <input 
              style={modalInput} 
              placeholder="e.g. 1141141"
              value={newStudent.code} 
              onChange={(e) => setNewStudent({ ...newStudent, code: e.target.value })} 
            />

            <label style={labelStyle}>Academic Level</label>
            <select 
              style={modalInput} 
              value={newStudent.academicYear} 
              onChange={(e) => setNewStudent({ ...newStudent, academicYear: e.target.value })}
            >
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
            </select>

            <label style={labelStyle}>Department</label>
            <input 
              list="dept-list" 
              style={modalInput} 
              placeholder="Type or select (e.g. CS)" 
              value={newStudent.department} 
              onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })} 
            />
            <datalist id="dept-list">
              {departments.map((dept, index) => <option key={index} value={dept} />)}
            </datalist>

            <div style={{ textAlign: "right", marginTop: "30px" }}>
              <button style={cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={saveBtn} onClick={handleAddStudent}>
                {editingStudent ? "Update" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Confirm Delete</h3>
            <p>Delete <strong>{confirmDelete.fullName}</strong>?</p>
            <div style={{ textAlign: "right", marginTop: "20px" }}>
              <button style={cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={deleteBtn} onClick={async () => { await deleteDoc(doc(db, "users", confirmDelete.id)); setConfirmDelete(null); }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles 
const labelStyle = { display: "block", marginTop: "10px", fontWeight: "600", color: "#475569", fontSize: "14px" };
const chipStyle = { display: "flex", alignItems: "center", backgroundColor: "#E0F2FE", color: "#0369A1", padding: "4px 10px", borderRadius: "6px", fontSize: "13px" };
const removeIconStyle = { marginLeft: "8px", cursor: "pointer", color: "#EF4444" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" };
const addBtn = { backgroundColor: "#1E3A8A", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" };
const statsContainer = { display: "flex", gap: "20px", marginBottom: "30px" };
const statCard = { flex: 1, backgroundColor: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", textAlign: "center" };
const statNumber = { margin: 0, fontSize: "24px", color: "#1E3A8A" };
const statLabel = { color: "#64748B", fontSize: "14px" };
const filterContainer = { display: "flex", gap: "15px", marginBottom: "20px" };
const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #CBD5E1" };
const cardStyle = { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflow: "hidden" };
const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { padding: "15px", backgroundColor: "#F8FAFC", textAlign: "left" };
const tdStyle = { padding: "15px", borderTop: "1px solid #E2E8F0" };
const badgeStyle = { backgroundColor: "#E0F2FE", color: "#0EA5E9", padding: "4px 10px", borderRadius: "20px", fontSize: "12px" };
const editBtn = { backgroundColor: "#3B82F6", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", marginRight: "5px", cursor: "pointer" };
const deleteBtn = { backgroundColor: "#EF4444", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" };
const assignBtnStyle = { backgroundColor: "#10B981", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", marginLeft: "5px", cursor: "pointer" };
const overlayStyle = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalStyle = { backgroundColor: "white", padding: "25px", borderRadius: "12px", width: "400px" };
const modalInput = { width: "100%", padding: "10px", marginTop: "5px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" };
const cancelBtn = { backgroundColor: "#94A3B8", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", marginRight: "10px", cursor: "pointer" };
const saveBtn = { backgroundColor: "#1E3A8A", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" };

export default Students;