import Layout from "../components/layout/Layout";

const Dashboard = () => {
  return (
    <Layout>
      <h1>Dashboard</h1>
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <div className="card">Total Students</div>
        <div className="card">Total Courses</div>
        <div className="card">Today Attendance</div>
      </div>
    </Layout>
  );
};

export default Dashboard;