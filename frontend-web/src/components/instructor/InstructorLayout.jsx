import { Outlet } from "react-router-dom";
import InstructorSidebar from "./InstructorSidebar";

const InstructorLayout = () => {
  return (
    <div style={{ 
      display: "flex", 
      minHeight: "100vh",
      backgroundColor: "#f8fafc"
    }}>
      <InstructorSidebar />
      
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

export default InstructorLayout;