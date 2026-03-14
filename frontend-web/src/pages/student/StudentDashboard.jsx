// src/studentDashboard/pages/StudentDashboard.jsx
import React from 'react';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { useAuth } from '../../context/AuthContext';
import { getCoursesForDashboard, getTotalStats } from './coursesData';

const StudentDashboard = () => {
  const { user } = useAuth();
  const courses = getCoursesForDashboard();
  const stats = getTotalStats();

  const handleTakeAttendance = (course) => {
    alert(`Starting attendance for ${course.name} with ${course.professor}`);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getAttendanceColor = (percent) => {
    if (percent >= 90) return '#059669';
    if (percent >= 80) return '#d97706';
    return '#dc2626';
  };

  const getWarningMessage = (attendance) => {
    const absence = 100 - attendance;
    if (absence >25) return '🚫 تم حرمانك من المادة';
    if (absence == 25) return '⚠️ لديك إنذار ثاني في المادة';
    if (absence >= 15) return '⚠️ لديك إنذار أول في المادة';
    return '';
  };

  return (
    <PageLayout>
      <div className={styles.dashboardHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 className={styles.dashboardTitle}>
            {getGreeting()}, {user?.fullName || user?.name || 'Ahmed'}! 👋
          </h1>
          <div style={{
            background: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            color: '#475569',
            fontSize: '14px'
          }}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
        <p className={styles.dashboardSubtitle}>
          {user?.department ? `Department of ${user.department} • ` : ''}
          {user?.academicYear ? `Year ${user.academicYear} • ` : ''}
          {user?.code ? `ID: ${user.code}` : ''}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: '20px',
        marginBottom: '32px',
        padding: '0 32px'
      }}>
        <StatCard 
          icon="📚"
          bgColor="#e0f2fe"
          label="Total Courses"
          value={stats.totalCourses}
        />
      </div>

      <div className={styles.dashboardContainer}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a' }}>
            Your Courses
          </h2>
         
            
        </div>

        <div className={styles.coursesGrid}>
          {courses.map(course => {
            const warning = getWarningMessage(course.attendance);
            return (
              <div key={course.id} className={styles.courseCard}>
                {warning && (
                  <div style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {warning} في {course.name}
                  </div>
                )}
                <div className={styles.courseHeader}>
                  <span className={styles.courseCode}>{course.icon}</span>
                  <span 
                    className={styles.courseHours}
                    style={{ background: getAttendanceColor(course.attendance) }}
                  >
                    {course.attendance}%
                  </span>
                </div>

                <div className={styles.courseBody}>
                  <h3 className={styles.courseName}>{course.name}</h3>
                  <p className={styles.courseInstructor}>👨‍🏫 {course.professor}</p>
                  <button
                    className={styles.courseButton}
                    onClick={() => handleTakeAttendance(course)}
                  >
                    Take Attendance
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
};

const StatCard = ({ icon, bgColor, label, value }) => (
  <div style={{
    background: 'white',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }}>
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

export default StudentDashboard;
