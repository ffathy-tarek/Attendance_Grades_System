import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { useAuth } from '../../context/AuthContext';
import { getCoursesForDashboard, getTotalStats } from './coursesData';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    averageAttendance: 0,
    perfectAttendance: 0,
    needingAttention: 0,
    totalLectures: 0,
    totalPresent: 0,
    totalAbsences: 0,
    averageGrade: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [coursesData, statsData] = await Promise.all([
          getCoursesForDashboard(user.uid),
          getTotalStats(user.uid)
        ]);

        setCourses(coursesData || []);
        setStats(statsData || {
          totalCourses: 0,
          averageAttendance: 0,
          perfectAttendance: 0,
          needingAttention: 0,
          totalLectures: 0,
          totalPresent: 0,
          totalAbsences: 0,
          averageGrade: 0
        });
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.uid]);

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
    if (absence > 25) return '🚫 تم حرمانك من المادة';
    if (absence === 25) return '⚠️ لديك إنذار ثاني في المادة';
    if (absence >= 15) return '⚠️ لديك إنذار أول في المادة';
    return '';
  };

  if (loading) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>جاري التحميل...</div>
        </div>
      </PageLayout>
    );
  }

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
        gridTemplateColumns: 'repeat(4, 1fr)',
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
        <StatCard 
          icon="📊"
          bgColor="#dcfce7"
          label="Avg Attendance"
          value={`${stats.averageAttendance}%`}
        />
        <StatCard 
          icon="✅"
          bgColor="#fef9c3"
          label="Perfect Attendance"
          value={stats.perfectAttendance}
        />
        <StatCard 
          icon="⚠️"
          bgColor="#fee2e2"
          label="Need Attention"
          value={stats.needingAttention}
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
          {courses.length > 0 ? (
            courses.map(course => {
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
                      marginBottom: '8px',
                      fontSize: '12px'
                    }}>
                      {warning}
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
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', gridColumn: '1/-1' }}>
              لا توجد مواد مسجلة
            </div>
          )}
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