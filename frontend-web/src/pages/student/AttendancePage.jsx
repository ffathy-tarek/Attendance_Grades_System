
import React, { useState } from 'react';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { getAttendanceData, getTotalStats } from './coursesData';

const AttendancePage = () => {
  const [filter, setFilter] = useState('all'); 
  
  const attendance = getAttendanceData();
  const stats = getTotalStats();


  const filteredAttendance = attendance.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'excellent') return a.status === 'Perfect' || a.status === 'Good';
    if (filter === 'needs-improvement') return a.status === 'Needs Improvement';
    return true;
  });

  const handleExport = () => {
  
    const exportData = attendance.map(a => ({
      Subject: a.subject,
      Present: a.present,
      'Total Lectures': a.total,
      Absences: a.absences,
      'Attendance %': a.percent,
      Status: a.status
    }));
    
    console.log('Exporting data:', exportData);
    alert("Exporting attendance report... Check console for data");
  };

  const getAttendanceColor = (percent) => {
    const value = parseInt(percent);
    if (value >= 90) return '#166534';
    if (value >= 80) return '#854d0e';
    if (value >= 70) return '#92400e';
    return '#991b1b';
  };

  const getAttendanceBg = (percent) => {
    const value = parseInt(percent);
    if (value >= 90) return '#dcfce7';
    if (value >= 80) return '#fef9c3';
    if (value >= 70) return '#ffedd5';
    return '#fee2e2';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Perfect': return '#166534';
      case 'انذار اول': return '#854d0e';
      case 'انذار ثاني': return '#92400e';
      case 'حرمان': return '#991b1b';
      default: return '#475569';
    }
  };

  const getStatusBg = (status) => {
    switch(status) {
      case 'Perfect': return '#dcfce7';
      case 'انذار اول': return '#fef9c3';
      case 'انذار ثاني': return '#ffedd5';
      case 'حرمان': return '#fee2e2';
      default: return '#f1f5f9';
    }
  };

  return (
    <PageLayout 
      title="Attendance" 
      subtitle="Track your attendance records"
      actions={
        <div style={{ display: 'flex', gap: '12px' }}>
         
          <button 
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              color: '#0f172a',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <span>📥</span> Export Report
          </button>
        </div>
      }
    >
    
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0'
      }}>
        <div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Overall Attendance</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{stats.averageAttendance}%</div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Perfect Attendance</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>{stats.perfectAttendance}</div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Need Attention</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f70000' }}>{stats.needingAttention}</div>
        </div>
        <div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Total Courses</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>{stats.totalCourses}</div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Present</th>
              <th>Total Lectures</th>
              <th>Absences</th>
              <th>Attendance %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.length > 0 ? (
              filteredAttendance.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '500' }}>{a.subject}</td>
                  <td style={{ fontWeight: '600', color: '#0f172a' }}>{a.present}</td>
                  <td style={{ color: '#64748b' }}>{a.total}</td>
                  <td style={{ 
                    color: a.absences > 0 ? '#991b1b' : '#166534',
                    fontWeight: '500'
                  }}>
                    {a.absences}
                  </td>
                  <td>
                    <span style={{ 
                      background: getAttendanceBg(a.percent),
                      color: getAttendanceColor(a.percent),
                      padding: '4px 12px',
                      borderRadius: '30px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {a.percent}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      background: getStatusBg(a.status),
                      color: getStatusColor(a.status),
                      padding: '6px 16px',
                      borderRadius: '30px',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No courses match the selected filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

     
      <StatsCards stats={stats} />

    
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        color: '#475569'
      }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#dcfce7', borderRadius: '4px' }}></span>
            <span>Perfect (0 absences)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#fef9c3', borderRadius: '4px' }}></span>
            <span>انذار اول  (15% الي 25%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#ffedd5', borderRadius: '4px' }}></span>
            <span>انذار ثاني (25%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#fee2e2', borderRadius: '4px' }}></span>
            <span>حرمان (اكثر من 25%)</span>
          </div>
        </div>
        <div style={{ color: '#2563eb', fontWeight: '500' }}>
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </PageLayout>
  );
};

const StatsCards = ({ stats }) => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(3, 1fr)', 
    gap: '24px', 
    marginTop: '32px' 
  }}>
    <StatCard 
      icon="📅"
      bgColor="#e0f2fe"
      label="Total Lectures"
      value={stats.totalLectures}
    />
    <StatCard 
      icon="✅"
      bgColor="#dcfce7"
      label="Lectures Attended"
      value={stats.totalPresent}
    />
    <StatCard 
      icon="❌"
      bgColor="#fee2e2"
      label="Total Absences"
      value={stats.totalAbsences}
    />
  </div>
);

const StatCard = ({ icon, bgColor, label, value }) => (
  <div style={{ 
    background: 'white', 
    padding: '24px', 
    borderRadius: '16px', 
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s',
    cursor: 'default'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
    e.currentTarget.style.transform = 'translateY(-2px)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.transform = 'translateY(0)';
  }}
  >
    <div style={{ 
      width: '48px', 
      height: '48px', 
      background: bgColor, 
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px'
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a' }}>{value}</div>
    </div>
  </div>
);

export default AttendancePage;