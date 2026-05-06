// ==================== StudentDashboard.jsx (معدل بالكامل) ====================

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState({});
  const [message, setMessage] = useState({ courseId: '', text: '', type: '' });
  const [locationError, setLocationError] = useState(null);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [pendingAttendance, setPendingAttendance] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Refs for preventing multiple loads and caching
  const isLoadingRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const lastLoadTimeRef = useRef(0);
  const cacheRef = useRef({ courses: null, stats: null, timestamp: 0 });

  const loadDashboardData = useCallback(async (force = false) => {
    if (!user?.uid) return;
    
    // Check cache (cache valid for 30 seconds)
    const now = Date.now();
    if (!force && cacheRef.current.courses && (now - cacheRef.current.timestamp) < 30000) {
      console.log('📦 Using cached data');
      setCourses(cacheRef.current.courses);
      setStats(cacheRef.current.stats);
      setLastUpdated(new Date(cacheRef.current.timestamp));
      setLoading(false);
      setIsRefreshing(false);
      return;
    }
    
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) return;
    
    // Prevent rapid consecutive loads (2 seconds minimum between loads)
    if (!force && (now - lastLoadTimeRef.current) < 2000) {
      console.log('⏳ Skipping load, too soon since last load');
      return;
    }
    
    isLoadingRef.current = true;
    if (!force) setLoading(true);
    setIsRefreshing(true);
    lastLoadTimeRef.current = now;
    
    try {
      console.log('🔄 Loading dashboard data from server...');
      const [coursesData, statsData] = await Promise.all([
        getCoursesForDashboard(user.uid),
        getTotalStats(user.uid)
      ]);

      // Save to cache
      cacheRef.current = {
        courses: coursesData || [],
        stats: statsData || {
          totalCourses: 0,
          averageAttendance: 0,
          perfectAttendance: 0,
          needingAttention: 0,
          totalLectures: 0,
          totalPresent: 0,
          totalAbsences: 0,
          averageGrade: 0
        },
        timestamp: now
      };
      
      setCourses(coursesData || []);
      setStats(statsData || {});
      setLastUpdated(new Date());
      console.log('✅ Dashboard data loaded:', coursesData.length, 'courses');
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [user?.uid]);

  const handleManualRefresh = () => {
    loadDashboardData(true);
  };

  // Real-time listener with debounce - only ONE listener
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    console.log('🎧 Setting up single real-time listener for UID:', user.uid);
    
    // Initial load
    loadDashboardData(true);
    
    // Single listener for attendance only (most important for real-time updates)
    const attendanceRef = collection(db, 'attendance');
    const attendanceQuery = query(
      attendanceRef,
      where('studentId', '==', user.uid)
    );
    
    const unsubscribeAttendance = onSnapshot(attendanceQuery, () => {
      // Debounce to prevent multiple rapid updates
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        console.log('📊 Attendance changed, reloading data with debounce...');
        loadDashboardData(true);
      }, 1000);
    });
    
    // Cleanup function
    return () => {
      console.log('🔴 Dashboard: Cleaning up listeners');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      unsubscribeAttendance();
    };
  }, [user?.uid, loadDashboardData]);

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
    
    // Auto refresh after attendance to show updated data
    setTimeout(() => {
      loadDashboardData(true);
    }, 500);
    
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
      
      // Auto refresh after attendance to show updated data
      setTimeout(() => {
        loadDashboardData(true);
      }, 500);
      
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
    if (absencePercent > 25) return '🚫 You have been denied';
    if (absencePercent === 25) return '⚠️ You have a second warning';
    if (absencePercent >= 15) return '⚠️ You have a first warning';
    return '';
  };

  if (loading && courses.length === 0) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Loading...</div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className={styles.dashboardTitle}>
            {getGreeting()}, {user?.fullName || user?.name || 'Ahmed'}! 👋
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              style={{
                padding: '8px 16px',
                background: isRefreshing ? '#94a3b8' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔄</span> {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
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
          🔄 Live Auto Update • Last sync: {lastUpdated.toLocaleTimeString()}
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
          {loading && courses.length > 0 && (
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              <span>🔄 Updating...</span>
            </div>
          )}
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
                            📍 Show lecture location
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
                        background: isLoading ? '#94a3b8' : '#2563eb',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1,
                      }}
                    >
                      {isLoading ? 'Taking attendance...' : '📝 Take Attendance'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', gridColumn: '1/-1' }}>
              No courses available
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