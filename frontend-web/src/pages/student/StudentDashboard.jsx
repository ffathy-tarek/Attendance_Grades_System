import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { useAuth } from '../../context/AuthContext';
import { getCoursesForDashboard, getTotalStats, takeAttendance, openMapToLocation } from './coursesData';
import LocationPermission from '../../components/LocationPermission';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

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
  const [attendanceLoading, setAttendanceLoading] = useState({});
  const [message, setMessage] = useState({ courseId: '', text: '', type: '' });
  const [locationError, setLocationError] = useState(null);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [pendingAttendance, setPendingAttendance] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadDashboardData = async () => {
    if (!user?.uid) return;

    try {
      console.log('🔄 Loading dashboard data for UID:', user.uid);
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
      setLastUpdated(new Date());
      console.log('✅ Dashboard data loaded:', coursesData.length, 'courses');
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listeners
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    console.log('🎧 Setting up real-time listeners for UID:', user.uid);
    setLoading(true);
    loadDashboardData();
    
    // ✅ استمع للتغيرات في attendance (من الطالب أو الدكتور)
    const attendanceRef = collection(db, 'attendance');
    const attendanceQuery = query(
      attendanceRef,
      where('studentId', '==', user.uid),
      where('status', '==', 'present')
    );
    
    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      console.log('📊 Dashboard: Attendance changed! Total records:', snapshot.size);
      snapshot.docChanges().forEach(change => {
        console.log('  - Change type:', change.type);
        console.log('  - Record ID:', change.doc.id);
        console.log('  - Data:', change.doc.data());
      });
      loadDashboardData();
    });
    
    // ✅ استمع للتغيرات في enrollments
    const enrollmentsRef = collection(db, 'enrollments');
    const enrollmentsQuery = query(
      enrollmentsRef,
      where('studentId', '==', user.uid)
    );
    
    const unsubscribeEnrollments = onSnapshot(enrollmentsQuery, () => {
      console.log('✅ Dashboard: Enrollments changed');
      loadDashboardData();
    });
    
    // ✅ استمع للتغيرات في lecture_sessions
    const sessionsRef = collection(db, 'lecture_sessions');
    const unsubscribeSessions = onSnapshot(sessionsRef, () => {
      console.log('✅ Dashboard: Sessions changed');
      loadDashboardData();
    });
    
    return () => {
      console.log('🔴 Dashboard: Cleaning up listeners');
      unsubscribeAttendance();
      unsubscribeEnrollments();
      unsubscribeSessions();
    };
  }, [user?.uid]);

  const handleTakeAttendance = async (course) => {
    setAttendanceLoading(prev => ({ ...prev, [course.id]: true }));
    setMessage({ courseId: '', text: '', type: '' });
    setLocationError(null);

    const result = await takeAttendance(user.uid, course.id);
    
    if (result.requiresLocation) {
      setPendingAttendance(course);
      setShowLocationPermission(true);
      setMessage({
        courseId: course.id,
        text: result.message,
        type: 'warning'
      });
    } else if (result.instructorLocation && !result.success) {
      setLocationError({
        courseId: course.id,
        message: result.message,
        distance: result.distance,
        allowedDistance: result.allowedDistance,
        instructorLocation: result.instructorLocation
      });
      setMessage({
        courseId: course.id,
        text: result.message,
        type: 'error'
      });
    } else {
      setMessage({
        courseId: course.id,
        text: result.message,
        type: result.success ? 'success' : 'error'
      });
    }
    
    setAttendanceLoading(prev => ({ ...prev, [course.id]: false }));
    
    setTimeout(() => {
      setMessage({ courseId: '', text: '', type: '' });
      setLocationError(null);
    }, 5000);
  };

  const handleLocationGranted = async (location) => {
    setShowLocationPermission(false);
    if (pendingAttendance) {
      setAttendanceLoading(prev => ({ ...prev, [pendingAttendance.id]: true }));
      
      const result = await takeAttendance(user.uid, pendingAttendance.id);
      
      setMessage({
        courseId: pendingAttendance.id,
        text: result.message,
        type: result.success ? 'success' : 'error'
      });
      
      if (result.instructorLocation && !result.success) {
        setLocationError({
          courseId: pendingAttendance.id,
          message: result.message,
          distance: result.distance,
          allowedDistance: result.allowedDistance,
          instructorLocation: result.instructorLocation
        });
      }
      
      setAttendanceLoading(prev => ({ ...prev, [pendingAttendance.id]: false }));
      setPendingAttendance(null);
      
      setTimeout(() => {
        setMessage({ courseId: '', text: '', type: '' });
        setLocationError(null);
      }, 5000);
    }
  };

  const handleLocationDenied = () => {
    setShowLocationPermission(false);
    setPendingAttendance(null);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getAbsenceColor = (absencePercent) => {
    if (absencePercent <= 10) return '#059669';
    if (absencePercent <= 15) return '#d97706';
    if (absencePercent <= 25) return '#dc2626';
    return '#991b1b';
  };

  const getWarningMessage = (absencePercent) => {
    if (absencePercent > 25) return '🚫 تم حرمانك من المادة';
    if (absencePercent == 25) return '⚠️ لديك إنذار ثاني في المادة';
    if (absencePercent >=15) return '⚠️ لديك إنذار أول في المادة';
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

  const totalAbsencePercent = stats.totalLectures > 0 
    ? ((stats.totalAbsences / stats.totalLectures) * 100).toFixed(1)
    : 0;

  return (
    <PageLayout>
      {showLocationPermission && (
        <LocationPermission
          onLocationGranted={handleLocationGranted}
          onLocationDenied={handleLocationDenied}
          onClose={() => setShowLocationPermission(false)}
        />
      )}
      
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
        <div style={{
          background: '#e0f2fe',
          borderRadius: '8px',
          padding: '4px 12px',
          marginTop: '8px',
          display: 'inline-block',
          fontSize: '11px',
          color: '#0369a1'
        }}>
          🔄 تحديث تلقائي | آخر تحديث: {lastUpdated.toLocaleTimeString()}
        </div>
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
          bgColor="#fee2e2"
          label="Avg Absence"
          value={`${totalAbsencePercent}%`}
        />
        <StatCard 
          icon="✅"
          bgColor="#dcfce7"
          label="Perfect Attendance"
          value={stats.perfectAttendance}
        />
        <StatCard 
          icon="⚠️"
          bgColor="#fef3c7"
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
              const absencePercent = course.absencePercent;
              const warning = getWarningMessage(absencePercent);
              const isLoading = attendanceLoading[course.id];
              const msg = message.courseId === course.id ? message : null;
              const locError = locationError?.courseId === course.id ? locationError : null;
              
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
                      style={{ background: getAbsenceColor(absencePercent) }}
                    >
                      {absencePercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className={styles.courseBody}>
                    <h3 className={styles.courseName}>{course.name}</h3>
                    <p className={styles.courseInstructor}>👨‍🏫 {course.professor}</p>
                    
                    {locError && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        background: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fde68a'
                      }}>
                        <div style={{ whiteSpace: 'pre-line' }}>{locError.message}</div>
                        {locError.instructorLocation && (
                          <button
                            onClick={() => openMapToLocation(locError.instructorLocation.latitude, locError.instructorLocation.longitude)}
                            style={{
                              marginTop: '8px',
                              padding: '4px 12px',
                              background: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            📍 عرض موقع الدكتور على الخريطة
                          </button>
                        )}
                      </div>
                    )}
                    
                    {msg && msg.text && !locError && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        textAlign: 'center',
                        background: msg.type === 'success' ? '#dcfce7' : msg.type === 'warning' ? '#fef3c7' : '#fee2e2',
                        color: msg.type === 'success' ? '#166534' : msg.type === 'warning' ? '#92400e' : '#991b1b',
                        whiteSpace: 'pre-line'
                      }}>
                        {msg.text}
                      </div>
                    )}
                    
                    <button
                      className={styles.courseButton}
                      onClick={() => handleTakeAttendance(course)}
                      disabled={isLoading}
                      style={{
                        ...(isLoading ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                      }}
                    >
                      {isLoading ? 'جاري التسجيل...' : '📝 تسجيل الحضور'}
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