import React, { useState } from "react";

function PendingAccounts() {
  const [pendingAccounts, setPendingAccounts] = useState([
    {
      id: 1,
      name: "Ahmed Ali",
      email: "ahmed@gmail.com",
      role: "Student",
    },
    {
      id: 2,
      name: "Sara Mohamed",
      email: "sara@gmail.com",
      role: "Instructor",
    },
  ]);

  const approveAccount = (id) => {
    setPendingAccounts((prev) =>
      prev.filter((account) => account.id !== id)
    );

    console.log("Approved account ID:", id);
  };

 const rejectAccount = (id) => {
  const confirmReject = window.confirm(
    "Are you sure you want to reject this account?"
  );

  if (!confirmReject) return;

  setPendingAccounts((prev) =>
    prev.filter((account) => account.id !== id)
  );

  console.log("Rejected account ID:", id);
};

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#FFFFFF",
    borderRadius: "10px",
    overflow: "hidden",
  };

  const thStyle = {
    padding: "14px",
    backgroundColor: "#F1F5F9",
    color: "#1E3A8A",
    textAlign: "left",
  };

  const tdStyle = {
    padding: "14px",
    borderTop: "1px solid #E2E8F0",
    textAlign: "left",
  };

  const approveBtn = {
    backgroundColor: "#22C55E",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginRight: "8px",
  };

  const rejectBtn = {
    backgroundColor: "#EF4444",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
  };

  return (
    <div>
      <h2 style={{ marginBottom: "20px", color: "#1E3A8A" }}>
        Pending Accounts
      </h2>

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
                <button
                  style={approveBtn}
                  onClick={() => approveAccount(account.id)}
                >
                  Approve
                </button>

                <button
                  style={rejectBtn}
                  onClick={() => rejectAccount(account.id)}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PendingAccounts;