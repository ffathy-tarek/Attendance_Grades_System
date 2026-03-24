import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { getAttendanceData, getTotalStats } from './coursesData';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const AttendancePage = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({
    averageAttendance: 0,
    perfectAttendance: 0,
    needingAttention: 0,
    totalCourses: 0,
    totalLectures: 0,
    totalPresent: 0,
    totalAbsences: 0,
    averageGrade: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // دالة لجلب البيانات وتحديثها
  const loadAttendanceData = async () => {
    if (!user?.uid) return;

    try {
      const [attendanceData, statsData] = await Promise.all([
        getAttendanceData(user.uid),
        getTotalStats(user.uid)
      ]);

      setAttendance(attendanceData || []);
      setStats(statsData || {
        averageAttendance: 0,
        perfectAttendance: 0,
        needingAttention: 0,
        totalCourses: 0,
        totalLectures: 0,
        totalPresent: 0,
        totalAbsences: 0,
        averageGrade: 0
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    loadAttendanceData();
    
    const attendanceRef = collection(db, 'attendance');
    const attendanceQuery = query(
      attendanceRef,
      where('studentId', '==', user.uid)
    );
    
    const unsubscribeAttendance = onSnapshot(attendanceQuery, () => {
      console.log('Attendance changed, reloading data...');
      loadAttendanceData();
    });
    
    const enrollmentsRef = collection(db, 'enrollments');
    const enrollmentsQuery = query(
      enrollmentsRef,
      where('studentId', '==', user.uid)
    );
    
    const unsubscribeEnrollments = onSnapshot(enrollmentsQuery, () => {
      console.log('Enrollments changed, reloading data...');
      loadAttendanceData();
    });
    
    const sessionsRef = collection(db, 'lecture_sessions');
    const unsubscribeSessions = onSnapshot(sessionsRef, () => {
      console.log('Sessions changed, reloading data...');
      loadAttendanceData();
    });
    
    return () => {
      unsubscribeAttendance();
      unsubscribeEnrollments();
      unsubscribeSessions();
    };
  }, [user?.uid]);

  const filteredAttendance = attendance.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'excellent') return a.status === 'Perfect' || a.status === 'Regular';
    if (filter === 'needs-improvement') return a.status === 'انذار اول' || a.status === 'انذار ثاني' || a.status === 'حرمان';
    return true;
  });

  const handleExport = () => {
    const exportData = attendance.map(a => ({
      Subject: a.subject,
      Present: a.present,
      'Total Lectures': a.total,
      Absences: a.absences,
      'Absence %': a.absencePercent,  // ✅ نسبة الغياب
      Status: a.status
    }));
    
    console.log('Exporting data:', exportData);
    alert("Exporting attendance report... Check console for data");
  };

  const handleRefresh = () => {
    setLoading(true);
    loadAttendanceData();
  };

  // ✅ دالة للحصول على لون نسبة الغياب (كلما زادت الغيابات كلما كان اللون أغمق)
  const getAbsenceColor = (absencePercent) => {
    const value = parseInt(absencePercent);
    if (value <= 10) return '#166534';      // غياب قليل → أخضر
    if (value <= 15) return '#854d0e';      // إنذار أول → برتقالي
    if (value <= 25) return '#92400e';      // إنذار ثاني → برتقالي غامق
    return '#991b1b';                       // حرمان → أحمر
  };

  // ✅ دالة للحصول على خلفية نسبة الغياب
  const getAbsenceBg = (absencePercent) => {
    const value = parseInt(absencePercent);
    if (value <= 10) return '#dcfce7';
    if (value <= 15) return '#fef9c3';
    if (value <= 25) return '#ffedd5';
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

  if (loading && attendance.length === 0) {
    return (
      <PageLayout title="Attendance" subtitle="Track your attendance records">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>جاري التحميل...</div>
        </div>
      </PageLayout>
    );
  }

  // ✅ حساب نسبة الغياب الإجمالية
  const totalAbsencePercent = stats.totalLectures > 0 
    ? ((stats.totalAbsences / stats.totalLectures) * 100).toFixed(1)
    : 0;

  return (
    <PageLayout 
      title="Attendance" 
      subtitle="Track your attendance records"
      actions={
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleRefresh}
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
            <span>🔄</span> Refresh
          </button>
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
      {/* إشعار بالتحديث التلقائي */}
      <div style={{
        background: '#e0f2fe',
        borderRadius: '8px',
        padding: '8px 16px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#0369a1'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔄</span>
          <span>البيانات يتم تحديثها تلقائياً عند تسجيل الحضور</span>
        </div>
        <div>
          آخر تحديث: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* ✅ إحصائيات الغياب بدل الحضور */}
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
          <div style={{ fontSize: '13px', color: '#64748b' }}>Overall Absence Rate</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{totalAbsencePercent}%</div>
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

      {/* Filter Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        padding: '0 0 16px 0',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 20px',
            background: filter === 'all' ? '#2563eb' : 'white',
            color: filter === 'all' ? 'white' : '#475569',
            border: '1px solid #e2e8f0',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          All Courses
        </button>
        <button
          onClick={() => setFilter('excellent')}
          style={{
            padding: '8px 20px',
            background: filter === 'excellent' ? '#059669' : 'white',
            color: filter === 'excellent' ? 'white' : '#475569',
            border: '1px solid #e2e8f0',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ✅ Excellent
        </button>
        <button
          onClick={() => setFilter('needs-improvement')}
          style={{
            padding: '8px 20px',
            background: filter === 'needs-improvement' ? '#dc2626' : 'white',
            color: filter === 'needs-improvement' ? 'white' : '#475569',
            border: '1px solid #e2e8f0',
            borderRadius: '30px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ⚠️ Need Attention
        </button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Present</th>
              <th>Total Lectures</th>
              <th>Absences</th>
              <th>Absence %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.length > 0 ? (
              filteredAttendance.map((a, i) => {
                // ✅ حساب نسبة الغياب لكل مادة
                const absencePercent = a.total > 0 ? ((a.absences / a.total) * 100).toFixed(1) : 0;
                
                return (
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
                        background: getAbsenceBg(absencePercent),
                        color: getAbsenceColor(absencePercent),
                        padding: '4px 12px',
                        borderRadius: '30px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {absencePercent}%
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
                );
              })
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No attendance records found
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
        color: '#475569',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#dcfce7', borderRadius: '4px' }}></span>
            <span>Perfect (0% absence)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#fef9c3', borderRadius: '4px' }}></span>
            <span>انذار اول (10% - 15% absence)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#ffedd5', borderRadius: '4px' }}></span>
            <span>انذار ثاني (15% - 25% absence)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', background: '#fee2e2', borderRadius: '4px' }}></span>
            <span>حرمان (اكثر من 25% absence)</span>
          </div>
        </div>
        <div style={{ color: '#2563eb', fontWeight: '500' }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    </PageLayout>
  );
};

const StatsCards = ({ stats }) => {
  // ✅ حساب نسبة الغياب الإجمالية
  const totalAbsencePercent = stats.totalLectures > 0 
    ? ((stats.totalAbsences / stats.totalLectures) * 100).toFixed(1)
    : 0;

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, 1fr)', 
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
      <StatCard 
        icon="📊"
        bgColor="#fef3c7"
        label="Absence Rate"
        value={`${totalAbsencePercent}%`}
      />
    </div>
  );
};

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