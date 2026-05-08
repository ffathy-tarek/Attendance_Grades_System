import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { 
  getCourseById, 
  getGradeDetails, 
  takeAttendance, 
  checkActiveSession,
  openMapToLocation 
} from './coursesData';
import { useAuth } from '../../context/AuthContext';
import LocationPermission from '../../components/LocationPermission';

const CourseDetails = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [gradeDetails, setGradeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState({ text: '', type: '' });
  const [activeSession, setActiveSession] = useState(null);
  const [showLocationPermission, setShowLocationPermission] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // دالة تنسيق التاريخ المحسنة
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Date not available';
    
    try {
      let date;
      
      // دعم Timestamp من Firestore
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      }
      // إذا كان string
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
        // إذا كان التاريخ غير صالح، حاول التحليل بتنسيق مختلف
        if (isNaN(date.getTime())) {
          // محاولة تحليل DD/MM/YYYY
          const parts = dateValue.split('/');
          if (parts.length === 3) {
            date = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        }
      }
      // إذا كان number (timestamp)
      else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
      }
      // إذا كان Date object بالفعل
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      else {
        return 'Invalid date format';
      }
      
      // التحقق من صحة التاريخ
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // تنسيق التاريخ
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  // دالة تحميل البيانات المركزية (بدون إعادة تحميل الصفحة)
  const loadCourseDetails = useCallback(async (showRefreshIndicator = false) => {
    if (!user?.uid || !courseId) {
      setLoading(false);
      return;
    }

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else if (loading) {
        setLoading(true);
      }
      
      const [courseData, gradeData, session] = await Promise.all([
        getCourseById(courseId, user.uid),
        getGradeDetails(user.uid, courseId),
        checkActiveSession(courseId)
      ]);

      // معالجة التواريخ في المحاضرات عند جلب البيانات
      if (courseData && courseData.lectures) {
        courseData.lectures = courseData.lectures.map(lecture => ({
          ...lecture,
          // تحويل التاريخ إلى كائن Date إذا كان Timestamp
          originalDate: lecture.date,
          formattedDate: lecture.date ? formatDate(lecture.date) : null
        }));
      }

      // تحديث البيانات فقط إذا كانت مختلفة
      let hasChanges = false;
      
      if (JSON.stringify(courseData) !== JSON.stringify(course)) {
        setCourse(courseData);
        hasChanges = true;
      }
      
      if (JSON.stringify(gradeData) !== JSON.stringify(gradeDetails)) {
        setGradeDetails(gradeData);
        hasChanges = true;
      }
      
      if (JSON.stringify(session) !== JSON.stringify(activeSession)) {
        setActiveSession(session);
        hasChanges = true;
      }
      
      if (hasChanges) {
        setLastUpdated(new Date());
      }
      
    } catch (error) {
      console.error('Error loading course details:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.uid, courseId, course, gradeDetails, activeSession, loading]);

  // تحميل البيانات الأولي وإعداد auto refresh كل 3 ثواني (بدون reload)
  useEffect(() => {
    loadCourseDetails();

    // Auto refresh كل 3 ثواني - يحدث البيانات فقط بدون إعادة تحميل الصفحة
    const intervalId = setInterval(() => {
      loadCourseDetails(true);
    }, 3000);

    // تنظيف الـ interval عند إزالة المكون
    return () => clearInterval(intervalId);
  }, [loadCourseDetails]);

  const handleTakeAttendance = async () => {
    setAttendanceLoading(true);
    setAttendanceMessage({ text: '', type: '' });
    setLocationError(null);

    const result = await takeAttendance(user.uid, courseId);
    
    if (result.requiresLocation) {
      setShowLocationPermission(true);
      setAttendanceMessage({
        text: result.message,
        type: 'warning'
      });
    } else if (result.instructorLocation && !result.success) {
      setLocationError({
        message: result.message,
        distance: result.distance,
        allowedDistance: result.allowedDistance,
        instructorLocation: result.instructorLocation
      });
      setAttendanceMessage({
        text: result.message,
        type: 'error'
      });
    } else {
      setAttendanceMessage({
        text: result.message,
        type: result.success ? 'success' : 'error'
      });
    }
    
    setAttendanceLoading(false);
    
    // تحديث البيانات فوراً بعد تسجيل الحضور
    if (result.success) {
      setTimeout(() => {
        loadCourseDetails(true);
      }, 500);
    }
    
    setTimeout(() => {
      setAttendanceMessage({ text: '', type: '' });
      setLocationError(null);
    }, 5000);
  };

  const handleLocationGranted = async (location) => {
    setShowLocationPermission(false);
    setAttendanceLoading(true);
    setAttendanceMessage({ text: '', type: '' });
    
    const result = await takeAttendance(user.uid, courseId);
    
    setAttendanceMessage({
      text: result.message,
      type: result.success ? 'success' : 'error'
    });
    
    if (result.instructorLocation && !result.success) {
      setLocationError({
        message: result.message,
        distance: result.distance,
        allowedDistance: result.allowedDistance,
        instructorLocation: result.instructorLocation
      });
    }
    
    setAttendanceLoading(false);
    
    if (result.success) {
      setTimeout(() => {
        loadCourseDetails(true);
      }, 500);
    }
    
    setTimeout(() => {
      setAttendanceMessage({ text: '', type: '' });
      setLocationError(null);
    }, 5000);
  };

  const handleLocationDenied = () => {
    setShowLocationPermission(false);
    setAttendanceMessage({
      text: '⚠️ Please approve location access and try again',
      type: 'error'
    });
    setAttendanceLoading(false);
    
    setTimeout(() => {
      setAttendanceMessage({ text: '', type: '' });
    }, 3000);
  };

  if (loading) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Loading...</div>
        </div>
      </PageLayout>
    );
  }

  if (!course) {
    return (
      <PageLayout>
        <div className={styles.emptyState}>
          <h3>Course Not Found</h3>
          <p>The course you're looking for doesn't exist or you're not enrolled in it.</p>
        </div>
      </PageLayout>
    );
  }

  const attendedLectures = course.lectures?.filter(l => l.attended === true).length || 0;
  const totalLectures = course.lectures?.length || 0;
  const attendanceRate = totalLectures > 0 ? ((attendedLectures / totalLectures) * 100).toFixed(1) : 0;

  const finalScore = course.grades?.final || 0;
  const midtermScore = course.grades?.midterm || 0;
  const practicalScore = course.grades?.practical || 0;
  const totalGrade = finalScore + midtermScore + practicalScore;

  return (
    <PageLayout>
      {showLocationPermission && (
        <LocationPermission
          onLocationGranted={handleLocationGranted}
          onLocationDenied={handleLocationDenied}
          onClose={() => setShowLocationPermission(false)}
        />
      )}
      
      <div style={{ 
        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        boxShadow: '0 10px 30px rgba(37, 99, 235, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>{course.name}</h1>
            <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '4px' }}>
              {course.code} • {course.instructor}
            </p>
            <p style={{ fontSize: '14px', opacity: 0.8 }}>{course.hours} Credit Hours</p>
          </div>
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '16px', 
            borderRadius: '16px',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <div style={{ fontSize: '36px', fontWeight: 700 }}>{totalGrade.toFixed(1)}%</div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Final Grade</div>
          </div>
        </div>
      </div>

      {/* شريط آخر تحديث */}
      <div style={{
        textAlign: 'right',
        fontSize: '11px',
        color: '#94a3b8',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span style={{ 
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#22c55e',
          animation: 'pulse 2s infinite'
        }}></span>
      </div>

      {/* Attendance Section */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a', marginBottom: '8px' }}>
              📝 Take Attendance
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b' }}>
              {activeSession 
                ? activeSession.attendanceOpen !== false
                  ? '🟢 There is an active session right now - You can take attendance'
                  : '🔴 The instructor closed the attendance'
                : '🔴 No active session right now'}
            </p>
          </div>
          
          <button
            onClick={handleTakeAttendance}
            disabled={attendanceLoading || !activeSession || activeSession?.attendanceOpen === false}
            style={{
              padding: '12px 32px',
              background: (activeSession && activeSession.attendanceOpen !== false) ? '#2563eb' : '#94a3b8',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '16px',
              cursor: (activeSession && activeSession.attendanceOpen !== false && !attendanceLoading) ? 'pointer' : 'not-allowed',
              opacity: attendanceLoading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {attendanceLoading ? 'Please wait...' : '📝 Take Attendance'}
          </button>
        </div>
        
        {/* Session location information */}
        {activeSession && activeSession.instructorLocation && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#e0f2fe',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#0369a1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span>📍</span>
              <span style={{ fontWeight: '500' }}>Session Location:</span>
            </div>
            <div style={{ marginLeft: '28px' }}>
              <div>You must be within {activeSession.allowedDistance || 100} meters of the instructor to take attendance</div>
              <button
                onClick={() => openMapToLocation(
                  activeSession.instructorLocation.latitude, 
                  activeSession.instructorLocation.longitude
                )}
                style={{
                  marginTop: '8px',
                  padding: '6px 14px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🗺️</span> Show instructor location
              </button>
            </div>
          </div>
        )}
        
        {/* Error/location messages */}
        {locationError && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fde68a',
            fontSize: '13px'
          }}>
            <div style={{ whiteSpace: 'pre-line' }}>{locationError.message}</div>
            {locationError.instructorLocation && (
              <button
                onClick={() => openMapToLocation(
                  locationError.instructorLocation.latitude, 
                  locationError.instructorLocation.longitude
                )}
                style={{
                  marginTop: '10px',
                  padding: '6px 14px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🗺️</span> Show instructor location
              </button>
            )}
          </div>
        )}
        
        {/* General messages */}
        {attendanceMessage.text && !locationError && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            background: attendanceMessage.type === 'success' ? '#dcfce7' : attendanceMessage.type === 'warning' ? '#fef3c7' : '#fee2e2',
            color: attendanceMessage.type === 'success' ? '#166534' : attendanceMessage.type === 'warning' ? '#92400e' : '#991b1b',
            fontSize: '14px',
            textAlign: 'center',
            whiteSpace: 'pre-line'
          }}>
            {attendanceMessage.text}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '48px' }}>
        <h3 style={{ 
          color: '#0f172a', 
          fontSize: '20px', 
          fontWeight: 600, 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '24px' }}>📝</span> Grades Breakdown
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <GradeCard 
            title="Final Exam"
            score={finalScore}
            maxScore={60}
            color="#2563eb"
            icon="📚"
          />

          <GradeCard 
            title="Midterm Exam"
            score={midtermScore}
            maxScore={10}
            color="#7c3aed"
            icon="📖"
          />

          <GradeCard 
            title="Practical"
            score={practicalScore}
            maxScore={30}
            color="#059669"
            icon="🔧"
          />

          <div className={styles.courseCard} style={{ padding: '20px', borderTop: '4px solid #0f172a', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🎯</span>
                <span style={{ fontWeight: 600, fontSize: '18px' }}>Total Grade</span>
              </div>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#2563eb' }}>{totalGrade.toFixed(1)}%</span>
            </div>
            <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>
              Final: {finalScore}/60 + Midterm: {midtermScore}/10 + Practical: {practicalScore}/30
            </p>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#dcfce7' }}>📅</div>
          <div>
            <div className={styles.statLabel}>Attendance Rate</div>
            <div className={styles.statValue}>{attendanceRate}%</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              {attendedLectures} / {totalLectures} lectures
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef9c3' }}>📚</div>
          <div>
            <div className={styles.statLabel}>Total Lectures & Labs</div>
            <div className={styles.statValue}>{totalLectures}</div>
          </div>
        </div>
      </div>

      <h3 style={{ 
        color: '#0f172a', 
        fontSize: '20px', 
        fontWeight: 600, 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '24px' }}>📅</span> Lectures & Attendance
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {course.lectures?.map((lec, idx) => {
          // تحديد حالة الحضور بشكل صحيح
          let attendanceStatus = 'Not Recorded';
          let statusColor = '#64748b';
          let statusBg = '#f1f5f9';
          
          if (lec.attended === true) {
            attendanceStatus = 'Attended';
            statusColor = '#059669';
            statusBg = '#d1fae5';
          } else if (lec.attended === false || lec.missed === true) {
            attendanceStatus = 'Missed';
            statusColor = '#dc2626';
            statusBg = '#fee2e2';
          }
          
          // استخدام التاريخ المنسق إذا كان موجوداً، وإلا استخدام formatDate
          const displayDate = lec.formattedDate || formatDate(lec.date);
          
          return (
            <div key={idx} className={styles.courseCard} style={{ 
              padding: '20px',
              borderLeft: lec.attended === true ? '4px solid #059669' : 
                         (lec.attended === false || lec.missed === true) ? '4px solid #dc2626' : 
                         '4px solid #94a3b8'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{
                  background: '#e2e8f0',
                  padding: '4px 12px',
                  borderRadius: '30px',
                  fontSize: '13px',
                  fontWeight: 500
                }}>
                  {lec.type || 'Lecture'}
                </span>
                <span style={{
                  background: statusBg,
                  color: statusColor,
                  padding: '4px 12px',
                  borderRadius: '30px',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  {attendanceStatus}
                </span>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                {lec.topic || 'No topic specified'}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
                <span>📅</span> 
                <span>{displayDate}</span>
              </div>
              {lec.attendanceOpen === false && (
                <div style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  background: '#fef3c7',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#92400e'
                }}>
                  🔒 Attendance closed
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.5; transform: scale(1); }
        }
        
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(20px); }
          10% { opacity: 1; transform: translateX(0); }
          90% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(20px); }
        }
      `}</style>
    </PageLayout>
  );
};

const GradeCard = ({ title, score, maxScore, color, icon }) => (
  <div className={styles.courseCard} style={{ padding: '20px', borderTop: `4px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <span style={{ background: '#f0f0f0', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color }}>{title}</span>
    </div>
    <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{title}</h4>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ color: '#64748b' }}>Score</span>
      <span style={{ fontSize: '24px', fontWeight: 700, color }}>{score} <span style={{ fontSize: '16px', color: '#64748b' }}>/ {maxScore}</span></span>
    </div>
    <div className={styles.progressBar} style={{ marginTop: '12px', height: '8px' }}>
      <div style={{ width: `${(score/maxScore)*100}%`, background: color, height: '100%', borderRadius: '10px' }} />
    </div>
  </div>
);

export default CourseDetails;