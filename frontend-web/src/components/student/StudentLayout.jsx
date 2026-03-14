import { Outlet } from "react-router-dom";
import StudentSidebar from "./StudentSidebar";

const StudentLayout = () => {
  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh",
      backgroundColor: "#f8fafc"
    }}>
      <StudentSidebar />
      
      <div style={{ 
        flex: 1, 
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        height: "100vh", 
        overflowY: "auto" 
      }}>
        <Outlet />
      </div>
    </div>
  );
};

export default StudentLayout;