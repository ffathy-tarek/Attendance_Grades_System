import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, updateDoc, addDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase"; 
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

function PendingAccounts() {
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const auth = getAuth();

  // States للمودال
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [studentDetails, setStudentDetails] = useState({
    academicYear: "", // خليناها فاضية عشان تختار بنفسك
    department: ""   // خليناها فاضية عشان تختار بنفسك
  });

  useEffect(() => {
    const q = query(collection(db, "emailRequests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingAccounts(data);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenApproveModal = (account) => {
    setSelectedAccount(account);
    setStudentDetails({ academicYear: "", department: "" }); // تصفير الاختيارات عند كل فتح
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    // التأكد إن الأدمن اختار ليفل وقسم
    if (!studentDetails.academicYear || !studentDetails.department) {
      alert("Please select both Academic Level and Department!");
      return;
    }

    try {
      // 1. إنشاء الحساب في Firebase Auth
      await createUserWithEmailAndPassword(auth, selectedAccount.email, "TempPass123!");

      // 2. تحديث حالة الطلب لـ approved
      await updateDoc(doc(db, "emailRequests", selectedAccount.id), {
        status: "approved"
      });

      // 3. إضافة المستخدم للـ users
      await addDoc(collection(db, "users"), {
        fullName: selectedAccount.name || selectedAccount.fullName,
        email: selectedAccount.email,
        code: selectedAccount.code || "N/A", // بياخد الكود اللي الطالب بعته أصلاً
        role: "student",
        academicYear: Number(studentDetails.academicYear),
        department: studentDetails.department,
        status: "active",
        createdAt: new Date(),
      });

      alert(`Account for ${selectedAccount.name} approved successfully! ✅`);
      setShowApproveModal(false);
      setSelectedAccount(null);
    } catch (error) {
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
  const modalStyle = { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "400px" };
  const modalInput = { width: "100%", padding: "10px", marginTop: "8px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #CBD5E1", boxSizing: "border-box" };
  const labelStyle = { fontSize: "14px", fontWeight: "bold", color: "#475569", display: "block" };
  const cancelBtn = { backgroundColor: "#94A3B8", color: "white", border: "none", padding: "10px 15px", borderRadius: "8px", marginRight: "10px", cursor: "pointer" };
  const saveBtn = { backgroundColor: "#1E3A8A", color: "white", border: "none", padding: "10px 15px", borderRadius: "8px", cursor: "pointer" };

  return (
    <div>
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
                <td style={tdStyle}>{account.name}</td>
                <td style={tdStyle}>{account.email}</td>
                <td style={tdStyle}>{account.role}</td>
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

      {/* Approve Modal */}
      {showApproveModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ marginTop: 0, color: "#1E3A8A" }}>Assign Student Details</h3>
            <p style={{ fontSize: "14px", color: "#64748B", marginBottom: "20px" }}>
              Approving: <strong>{selectedAccount?.name}</strong>
            </p>

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