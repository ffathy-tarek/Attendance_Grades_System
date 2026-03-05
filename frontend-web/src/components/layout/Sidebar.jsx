import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { auth } from "../../firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  signOut,
} from "firebase/auth";
import { FiLogOut, FiLock } from "react-icons/fi";

const Sidebar = () => {
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleChangePassword = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        alert("No authenticated user found.");
        return;
      }

      if (!currentPassword || !newPassword || !confirmPassword) {
        alert("Please fill all fields.");
        return;
      }

      if (newPassword !== confirmPassword) {
        alert("New passwords do not match.");
        return;
      }

      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      alert("Password updated successfully!");

      setShowModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
      <div style={sidebarStyle}>
        <h2 style={logoStyle}>Attendance</h2>

        <nav style={{ marginTop: "40px" }}>
          <NavLink to="/admin" end style={linkStyle}>
            Dashboard
          </NavLink>

          <NavLink to="/admin/students" style={linkStyle}>
            Students
          </NavLink>

          <NavLink to="/admin/instructors" style={linkStyle}>
            Instructors
          </NavLink>

          <NavLink to="/admin/subjects" style={linkStyle}>
            Subjects
          </NavLink>

          <NavLink to="/admin/pending-accounts" style={linkStyle}>
            Pending Accounts
          </NavLink>
        </nav>

        {/* Buttons Section */}
        <div style={{ marginTop: "auto" }}>
          <button
            onClick={() => setShowModal(true)}
            style={changePasswordBtn}
          >
            <FiLock style={{ marginRight: "8px" }} />
            Reset Password
          </button>

          <button
            onClick={handleLogout}
            style={logoutBtn}
          >
            <FiLogOut style={{ marginRight: "8px" }} />
            Logout
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>Change Password</h3>

            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />

            <div style={{ marginTop: "15px", textAlign: "right" }}>
              <button onClick={handleChangePassword} style={saveBtn}>
                Save
              </button>

              <button
                onClick={() => setShowModal(false)}
                style={cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ===== Styles ===== */

const sidebarStyle = {
  width: "230px",
  backgroundColor: "var(--color-primary)",
  color: "white",
  padding: "30px 20px",
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  position: "sticky",
  top: 0,
};

const logoStyle = {
  margin: 0,
  fontSize: "20px",
  fontWeight: "600",
};

const linkStyle = ({ isActive }) => ({
  display: "block",
  padding: "12px 15px",
  marginBottom: "10px",
  borderRadius: "8px",
  textDecoration: "none",
  color: "white",
  backgroundColor: isActive
    ? "var(--color-secondary)"
    : "transparent",
  transition: "0.2s",
});

const changePasswordBtn = {
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  backgroundColor: "#ffffff22",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const logoutBtn = {
  width: "100%",
  padding: "12px",
  backgroundColor: "#e74c3c",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalContent = {
  backgroundColor: "white",
  padding: "25px",
  borderRadius: "12px",
  width: "350px",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  marginTop: "10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const saveBtn = {
  padding: "8px 15px",
  marginRight: "10px",
  backgroundColor: "#110a96",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const cancelBtn = {
  padding: "8px 15px",
  backgroundColor: "#ccc",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export default Sidebar;