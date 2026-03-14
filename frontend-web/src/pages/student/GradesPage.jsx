
import React, { useState } from 'react';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { getGradesData, getTotalStats } from './coursesData';

const GradesPage = () => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const grades = getGradesData();
  const stats = getTotalStats();

  const getStatusColor = (status) => {
    switch(status) {
      case 'Excellent': return '#166534';
      case 'Very Good': return '#854d0e';
      case 'Good': return '#92400e';
      case 'Pass': return '#0369a1';
      default: return '#991b1b';
    }
  };

  const getStatusBg = (status) => {
    switch(status) {
      case 'Excellent': return '#dcfce7';
      case 'Very Good': return '#fef9c3';
      case 'Good': return '#ffedd5';
      case 'Pass': return '#e0f2fe';
      default: return '#fee2e2';
    }
  };

  // حساب الإحصائيات
  const highest = Math.max(...grades.map(g => g.total));
  const lowest = Math.min(...grades.map(g => g.total));
  const passed = grades.filter(g => g.total >= 60).length;

  return (
    <PageLayout 
      title="Grades" 
      subtitle="View your grades and performance"
      actions={
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
      {/* جدول الدرجات الرئيسي */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Final (60)</th>
              <th>Midterm (10)</th>
              <th>Quiz 1 (10)</th>
              <th>Quiz 2 (10)</th>
              <th>Quiz 3 (10)</th>
              <th>Total</th>
              <th>Percentage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g, i) => (
              <tr key={i}>
                <td style={{ fontWeight: '500' }}>{g.subject}</td>
                <td style={{ fontWeight: '600', color: '#0f172a' }}>{g.final}</td>
                <td>{g.midterm}</td>
                <td>{g.quiz1}</td>
                <td>{g.quiz2}</td>
                <td>{g.quiz3}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      {/* بطاقات الإحصائيات */}
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

      {/* شرح نظام الدرجات */}
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
            <span>📝 Quiz 1: 10</span>
            <span>📝 Quiz 2: 10</span>
            <span>📝 Quiz 3: 10</span>
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
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>
    </PageLayout>
  );
};

export default GradesPage;