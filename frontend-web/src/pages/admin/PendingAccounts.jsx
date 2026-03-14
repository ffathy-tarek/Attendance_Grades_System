import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, query, where, deleteDoc } from "firebase/firestore";
import { db, app } from "../../firebase"; 
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";

function PendingAccounts() {
  const [pendingAccounts, setPendingAccounts] = useState([]);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [studentDetails, setStudentDetails] = useState({
    academicYear: "", 
    department: "",
    password: "" 
  });

  useEffect(() => {
    const q = query(collection(db, "emailRequests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // التعديل هنا: ترتيب البيانات بحيث الأقدم (تاريخياً) يظهر أولاً
      const sortedData = data.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateA - dateB; // الأقدم فوق
      });

      setPendingAccounts(sortedData);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenApproveModal = (account) => {
    setSelectedAccount(account);
    setStudentDetails({ academicYear: "", department: "", password: "" }); 
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!studentDetails.password || studentDetails.password.length < 6) {
        alert("Please enter a password (min 6 characters)!");
        return;
    }
    if (!studentDetails.department) {
        alert("Please select a Department!");
        return;
    }
    if (selectedAccount.role === "student" && !studentDetails.academicYear) {
        alert("Please select Academic Level!");
        return;
    }

    try {
      const secondaryApp = initializeApp(app.options, "SecondaryApproval");
      const secondaryAuth = getAuth(secondaryApp);
      
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(secondaryAuth, selectedAccount.email, studentDetails.password);
        
        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);
      } catch (authError) {
        await deleteApp(secondaryApp);
        if (authError.code === 'auth/email-already-in-use') {
            alert("This email is already registered!");
            return;
        }
        throw authError;
      }

      const newUserUID = userCredential.user.uid;

      await updateDoc(doc(db, "emailRequests", selectedAccount.id), {
        status: "approved"
      });

      const userData = {
        fullName: selectedAccount.name || selectedAccount.fullName,
        email: selectedAccount.email,
        role: selectedAccount.role, 
        status: "active",
        createdAt: new Date(),
        department: studentDetails.department,
        uid: newUserUID
      };

      if (selectedAccount.role === "student") {
        userData.code = selectedAccount.code || "N/A";
        userData.academicYear = Number(studentDetails.academicYear);
      }

      await setDoc(doc(db, "users", newUserUID), userData);

      alert(`Success! ${selectedAccount.role} created successfully. ✅`);
      setShowApproveModal(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    }
  };

  const rejectAccount = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await updateDoc(doc(db, "emailRequests", id), { status: "rejected" });
    } catch (error) { alert(error.message); }
  };

  // ======= Styles =======
  const tableStyle = { width: "100%", borderCollapse: "collapse", backgroundColor: "#FFFFFF", borderRadius: "10px", overflow: "hidden" };
  const thStyle = { padding: "14px", backgroundColor: "#F1F5F9", color: "#1E3A8A", textAlign: "left" };
  const tdStyle = { padding: "14px", borderTop: "1px solid #E2E8F0", textAlign: "left" };
  const approveBtn = { backgroundColor: "#22C55E", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", marginRight: "8px" };
  const rejectBtn = { backgroundColor: "#EF4444", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" };
  const overlayStyle = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
  const modalStyle = { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "400px", maxHeight: "90vh", overflowY: "auto" };
  const modalInput = { width: "100%", padding: "10px", marginTop: "8px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" };
  const labelStyle = { fontSize: "14px", fontWeight: "bold", color: "#475569", display: "block" };
  const cancelBtn = { backgroundColor: "#94A3B8", color: "white", border: "none", padding: "10px 15px", borderRadius: "8px", marginRight: "10px", cursor: "pointer" };
  const saveBtn = { backgroundColor: "#1E3A8A", color: "white", border: "none", padding: "10px 15px", borderRadius: "8px", cursor: "pointer" };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px", color: "#1E3A8A" }}>Pending Accounts</h2>
      
      {pendingAccounts.length === 0 ? <p>No pending requests.</p> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingAccounts.map((account) => (
              <tr key={account.id}>
                <td style={tdStyle}>{account.name || account.fullName}</td>
                <td style={tdStyle}>{account.email}</td>
                <td style={{ ...tdStyle, fontWeight: "bold", color: account.role === "instructor" ? "#1E3A8A" : "#64748B" }}>
                    {account.role}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <button style={approveBtn} onClick={() => handleOpenApproveModal(account)}>
                    Approve
                  </button>
                  <button style={rejectBtn} onClick={() => rejectAccount(account.id)}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showApproveModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginTop: 0, color: "#1E3A8A" }}>
                Confirm {selectedAccount?.role === "instructor" ? "Instructor" : "Student"}
            </h3>
            <p style={{ fontSize: "14px", color: "#64748B", marginBottom: "20px" }}>
              Approving: <strong>{selectedAccount?.name}</strong>
            </p>

            <label style={labelStyle}>Password</label>
            <input 
              type="password" 
              placeholder="Set password (min 6 chars)" 
              style={modalInput} 
              value={studentDetails.password}
              onChange={(e) => setStudentDetails({ ...studentDetails, password: e.target.value })}
            />

            {selectedAccount?.role === "student" && (
              <>
                <label style={labelStyle}>Academic Level</label>
                <select
                  style={modalInput}
                  value={studentDetails.academicYear}
                  onChange={(e) => setStudentDetails({ ...studentDetails, academicYear: e.target.value })}
                >
                  <option value="">-- Choose Level --</option>
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                </select>
              </>
            )}

            <label style={labelStyle}>Department</label>
            <select
              style={modalInput}
              value={studentDetails.department}
              onChange={(e) => setStudentDetails({ ...studentDetails, department: e.target.value })}
            >
              <option value="">-- Choose Department --</option>
              <option value="CS">CS</option>
              <option value="IS">IS</option>
              <option value="CHEMISTRY">CHEMISTRY</option>
              <option value="MATHIMATICS">MATHIMATICS</option>
            </select>

            <div style={{ textAlign: "right", marginTop: "10px" }}>
              <button style={cancelBtn} onClick={() => setShowApproveModal(false)}>Cancel</button>
              <button style={saveBtn} onClick={confirmApprove}>Confirm & Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PendingAccounts;