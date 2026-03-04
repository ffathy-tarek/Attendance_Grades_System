import { useState } from "react";

const Students = () => {
  const [students] = useState([
    { id: 1, name: "Fathy Tarek", code: "2327415", level: 3, department: "CS" },
    { id: 2, name: "Leo Messi", code: "2023002", level: 4, department: "IS" },
  ]);

  return (
    <div style={{ padding: "30px" }}>

      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Students</h2>
          <p style={{ color: "#64748B", marginTop: "5px" }}>
            Manage university students
          </p>
        </div>

        <button className="button primary" style={{ width: "auto", padding: "10px 20px" }}>
          + Add Student
        </button>
      </div>

      {/* Table Card */}
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
            {students.map((student) => (
              <tr key={student.id} style={rowStyle}>
                <td style={tdStyle}>{student.name}</td>
                <td style={tdStyle}>{student.code}</td>

                <td style={tdStyle}>
                  <span style={badgeStyle}>
                    Level {student.level}
                  </span>
                </td>

                <td style={tdStyle}>{student.department}</td>

                <td style={tdStyle}>
                  <button style={editBtn}>Edit</button>
                  <button style={deleteBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "25px",
};

const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  overflow: "hidden",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  padding: "15px",
  textAlign: "left",
  backgroundColor: "#F1F5F9",
  fontSize: "14px",
  fontWeight: "600",
  color: "#1E3A8A",
};

const tdStyle = {
  padding: "15px",
  borderTop: "1px solid #E2E8F0",
  fontSize: "14px",
};

const rowStyle = {
  transition: "0.2s",
};

const badgeStyle = {
  backgroundColor: "#E0F2FE",
  color: "#0EA5E9",
  padding: "5px 12px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "500",
};

const editBtn = {
  backgroundColor: "#3B82F6",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
  cursor: "pointer",
  marginRight: "8px",
};

const deleteBtn = {
  backgroundColor: "#1E3A8A",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "8px",
  cursor: "pointer",
};

export default Students;