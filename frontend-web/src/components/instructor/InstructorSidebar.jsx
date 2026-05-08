import React, { useState } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { auth } from "../../firebase"; 
import { signOut } from "firebase/auth";
import AIChatPopup from "../AIChatPopup";

const InstructorSidebar = () => {
  const navigate = useNavigate();
  const [showAIChat, setShowAIChat] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Failed to logout!");
    }
  };

  return (
    <div style={sidebarStyle}>
      <h2 style={logoStyle}>Instructor</h2>

      <nav style={{ marginTop: "40px", flex: 1 }}>
        <NavLink to="/instructor" end style={linkStyle}>
          Dashboard
        </NavLink>

        <NavLink to="/instructor/subjects" style={linkStyle}>
          Subjects
        </NavLink>

        <NavLink to="/instructor/lectures" style={linkStyle}>
          Lectures
        </NavLink>

        <NavLink to="/instructor/attendance" style={linkStyle}>
          Attendance
        </NavLink>

        <NavLink to="/instructor/grades" style={linkStyle}>
          Grades
        </NavLink>

        <NavLink to="/instructor/profile" style={linkStyle}>
          Profile
        </NavLink>

        <NavLink to="/instructor/reviews" style={linkStyle}>
          View Reviews
        </NavLink>

        <NavLink to="/instructor/reset-password" style={linkStyle}>
          Reset Password
        </NavLink>
      </nav>

      <button 
        onClick={() => setShowAIChat(true)} 
        style={aiAssistantButtonStyle}
        title="AI Assistant"
      >
        🤖 AI Assistant
      </button>

      <button onClick={handleLogout} style={logoutButtonStyle}>
        Logout
      </button>

      {showAIChat && (
        <AIChatPopup onClose={() => setShowAIChat(false)} userRole="instructor" />
      )}
    </div>
  );
};

const sidebarStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  width: "230px",
  backgroundColor: "var(--color-primary)",
  color: "white",
  padding: "30px 20px",
  height: "100vh",
  position: "sticky",
  top: 0,
  alignSelf: "flex-start",
  overflowY: "auto",
};

const logoStyle = { margin: 0 };

const linkStyle = ({ isActive }) => ({
  display: "block",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "8px",
  textDecoration: "none",
  color: "white",
  backgroundColor: isActive ? "var(--color-secondary)" : "transparent",
  transition: "background-color 0.2s",
  cursor: "pointer",
});

const aiAssistantButtonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "12px",
  width: "100%",
  border: "none",
  backgroundColor: "#8b5cf6",
  color: "white",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "500",
  transition: "all 0.2s",
};

const logoutButtonStyle = {
  padding: "12px",
  borderRadius: "8px",
  width: "100%",
  border: "none",
  backgroundColor: "#ff4d4f",
  color: "white",
  cursor: "pointer",
  fontSize: "16px",
};

export default InstructorSidebar;