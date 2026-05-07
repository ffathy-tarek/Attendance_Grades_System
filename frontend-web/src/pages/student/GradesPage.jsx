import React, { useState, useEffect } from 'react';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { getGradesData, getTotalStats } from './coursesData';
import { useAuth } from '../../context/AuthContext';
// 1. استيراد أدوات الفايربيز للتحويل للوضع اللايف
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const GradesPage = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [stats, setStats] = useState({
    averageGrade: 0,
    totalCourses: 0,
    totalLectures: 0,
    totalPresent: 0,
    totalAbsences: 0,
    averageAttendance: 0,
    perfectAttendance: 0,
    needingAttention: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

<<<<<<< Updated upstream
  // دالة جلب البيانات (مشتقة من الـ useEffect الأصلي)
  const loadGradesData = async (showNotification = false) => {
=======
  useEffect(() => {
>>>>>>> Stashed changes
    if (!user?.uid) {
      setLoading(false);
      return;
    }

<<<<<<< Updated upstream
    try {
      if (showNotification) setIsRefreshing(true);
      
      const [gradesData, statsData] = await Promise.all([
        getGradesData(user.uid),
        getTotalStats(user.uid)
      ]);
=======
    setLoading(true);

    // 2. إعداد الـ Query لمراقبة درجات الطالب الحالي
    const q = query(
      collection(db, "grades"), 
      where("studentId", "==", user.uid)
    );

    // 3. فتح الـ Real-time Listener
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        // أول ما يحصل أي تغيير (إضافة/تعديل)، هننادي الدوال بتاعتك تجيب البيانات المحدثة
        const [gradesData, statsData] = await Promise.all([
          getGradesData(user.uid),
          getTotalStats(user.uid)
        ]);
>>>>>>> Stashed changes

      // التحقق إذا كانت البيانات تغيرت فعلاً
      const gradesChanged = JSON.stringify(gradesData) !== JSON.stringify(grades);
      const statsChanged = JSON.stringify(statsData) !== JSON.stringify(stats);

      if (gradesChanged || statsChanged) {
        setGrades(gradesData || []);
        setStats(statsData || {
          averageGrade: 0, totalCourses: 0, totalLectures: 0,
          totalPresent: 0, totalAbsences: 0, averageAttendance: 0,
          perfectAttendance: 0, needingAttention: 0
        });
<<<<<<< Updated upstream
        setLastUpdated(new Date());
        
        // إظهار إشعار عند التحديث (اختياري)
        if (showNotification && !loading) {
          // يمكنك إضافة toast notification هنا
          console.log('Grades updated!');
        }
      }
    } catch (error) {
      console.error('Error loading grades:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // الـ useEffect الأصلي معدل قليلاً
  useEffect(() => {
    loadGradesData();

    // إضافة auto refresh كل 5 ثواني (يمكنك تغيير المدة)
    const intervalId = setInterval(() => {
      loadGradesData(true); // true يعني اعرض حالة التحديث
    }, 5000); // 5000毫秒 = 5 ثواني

    // تنظيف الـ interval عند إزالة المكون
    return () => clearInterval(intervalId);
  }, [user?.uid]); // نفس التبعية الأصلية

  // باقي الدوال كما هي بدون تغيير
=======
      } catch (error) {
        console.error('Error updating live grades:', error);
      } finally {
        setLoading(false);
      }
    });

    // 4. تنظيف الـ Listener عند الخروج من الصفحة
    return () => unsubscribe();
  }, [user?.uid]);

  // --- باقي كود getStatusColor و getStatusBg والـ UI كما هو تماماً دون تغيير ---
>>>>>>> Stashed changes
  const getStatusColor = (status) => {
    switch(status) {
      case 'Excellent': return '#166534';
      case 'Very Good': return '#854d0e';
      case 'Good': return '#92400e';
      case 'Fair': return '#0369a1';
      default: return '#991b1b';
    }
  };

  const getStatusBg = (status) => {
    switch(status) {
      case 'Excellent': return '#dcfce7';
      case 'Very Good': return '#fef9c3';
      case 'Good': return '#ffedd5';
      case 'Fair': return '#e0f2fe';
      default: return '#fee2e2';
    }
  };

  const highest = grades.length > 0 ? Math.max(...grades.map(g => g.total)) : 0;
  const lowest = grades.length > 0 ? Math.min(...grades.map(g => g.total)) : 0;
  const passed = grades.filter(g => g.total >= 60).length;

  if (loading) {
    return (
      <PageLayout title="Grades" subtitle="View your grades and performance">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Grades" 
      subtitle="View your grades and performance"
      actions={
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* إضافة زر التحديث اليدوي */}
          <button 
            onClick={() => loadGradesData(true)}
            disabled={isRefreshing}
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              padding: '8px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '500',
              color: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isRefreshing ? 0.6 : 1
            }}
          >
            <span style={{ 
              display: 'inline-block',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
            }}>
              🔄
            </span>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          
          {/* الجزء الأصلي - لم نمسحه */}
          <span style={{ 
            background: '#e0f2fe', 
            padding: '8px 16px', 
            borderRadius: '12px',
            fontWeight: '500',
            color: '#0369a1'
          }}>
            Average: {stats.averageGrade}%
          </span>
        </div>
      }
    >
      {/* باقي الكود الأصلي كما هو دون تغيير */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Final (60)</th>
              <th>Midterm (10)</th>
              <th>Practical (30)</th>
              <th>Total</th>
              <th>Percentage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {grades.length > 0 ? (
              grades.map((g, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '500' }}>{g.subject}</td>
                  <td style={{ fontWeight: '600', color: '#0f172a' }}>{g.final}</td>
                  <td>{g.midterm}</td>
                  <td>{g.practical}</td>
                  <td style={{ fontWeight: '700', color: '#2563eb' }}>{g.total}</td>
                  <td>
                    <span style={{ 
                      background: '#f1f5f9',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      {g.percentage}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      background: getStatusBg(g.status),
                      color: getStatusColor(g.status),
                      padding: '6px 16px',
                      borderRadius: '30px',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No grades available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* إضافة مؤشر auto refresh في الأسفل (اختياري) */}
      <div style={{
        marginTop: '16px',
        padding: '8px',
        fontSize: '12px',
        color: '#64748b',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#22c55e',
          animation: 'pulse 2s infinite'
        }}></span>
        Auto-refreshing every 5 seconds • Last updated: {lastUpdated.toLocaleTimeString()}
      </div>

      {grades.length > 0 && (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '24px', 
            marginTop: '32px' 
          }}>
            <div style={{ 
              background: 'white', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: '#e0f2fe', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>📊</div>
              <div>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Highest Grade</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a' }}>{highest}%</div>
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: '#dcfce7', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>📈</div>
              <div>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Lowest Grade</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a' }}>{lowest}%</div>
              </div>
            </div>

            <div style={{ 
              background: 'white', 
              padding: '24px', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                background: '#fef9c3', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>🎯</div>
              <div>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Passed Courses</div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#0f172a' }}>{passed}/{grades.length}</div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '32px',
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>📝 Grading System:</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', color: '#475569', fontSize: '14px' }}>
                <span>📚 Final: 60</span>
                <span>📖 Midterm: 10</span>
                <span>🔧 Practical: 30</span>
                <span style={{ fontWeight: '600', color: '#2563eb' }}>Total: 100</span>
              </div>
            </div>
            <div style={{
              background: '#e0f2fe',
              padding: '6px 12px',
              borderRadius: '30px',
              fontSize: '13px',
              color: '#0369a1'
            }}>
              Last updated: {lastUpdated.toLocaleDateString()}
            </div>
          </div>
        </>
      )}

      {/* إضافة الـ CSS animations */}
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
      `}</style>
    </PageLayout>
  );
};

export default GradesPage;