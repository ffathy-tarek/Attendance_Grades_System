
import React from 'react';
import { useParams } from 'react-router-dom';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { getCourseById, getGradeDetails } from './coursesData';

const CourseDetails = () => {
  const { courseId } = useParams();
  const course = getCourseById(courseId);
  const gradeDetails = getGradeDetails(courseId);

  if (!course) {
    return (
      <PageLayout>
        <div className={styles.emptyState}>
          <h3>Course Not Found</h3>
          <p>The course you're looking for doesn't exist.</p>
        </div>
      </PageLayout>
    );
  }

  const attendedLectures = course.lectures.filter(l => l.attended).length;
  const attendanceRate = ((attendedLectures / course.lectures.length) * 100).toFixed(1);

  const finalScore = course.grades.final || 0;
  const midtermScore = course.grades.midterm || 0;
  const quizzesScore = (course.grades.quiz1 || 0) + (course.grades.quiz2 || 0) + (course.grades.quiz3 || 0);
  const totalGrade = ((finalScore + midtermScore + quizzesScore) / 100) * 100;

  return (
    <PageLayout>
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
          {/* Final Exam */}
          <GradeCard 
            title="Final Exam"
            score={finalScore}
            maxScore={60}
            color="#2563eb"
            icon="📚"
          />

          {/* Midterm */}
          <GradeCard 
            title="Midterm Exam"
            score={midtermScore}
            maxScore={10}
            color="#7c3aed"
            icon="📖"
          />

          {/* Quiz 1 */}
          <GradeCard 
            title="Quiz 1"
            score={course.grades.quiz1 || 0}
            maxScore={10}
            color="#059669"
            icon="📝"
          />

          {/* Quiz 2 */}
          <GradeCard 
            title="Quiz 2"
            score={course.grades.quiz2 || 0}
            maxScore={10}
            color="#d97706"
            icon="📝"
          />

          {/* Quiz 3 */}
          <GradeCard 
            title="Quiz 3"
            score={course.grades.quiz3 || 0}
            maxScore={10}
            color="#dc2626"
            icon="📝"
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
              Final: {finalScore}/60 + Midterm: {midtermScore}/10 + Quizzes: {quizzesScore}/30
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
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: '#fef9c3' }}>📚</div>
          <div>
            <div className={styles.statLabel}>Total Lectures & Labs</div>
            <div className={styles.statValue}>{course.lectures.length}</div>
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {course.lectures.map((lec, idx) => (
          <div key={idx} className={styles.courseCard} style={{ 
            padding: '20px',
            borderLeft: lec.attended ? '4px solid #059669' : '4px solid #dc2626'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{
                background: '#e2e8f0',
                padding: '4px 12px',
                borderRadius: '30px',
                fontSize: '13px',
                fontWeight: 500
              }}>
                {lec.type}
              </span>
              <span style={{
                background: lec.attended ? '#d1fae5' : '#fee2e2',
                color: lec.attended ? '#059669' : '#dc2626',
                padding: '4px 12px',
                borderRadius: '30px',
                fontSize: '13px',
                fontWeight: 600
              }}>
                {lec.attended ? 'Attended' : 'Missed'}
              </span>
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              {lec.topic}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '14px' }}>
              <span>📅</span> {new Date(lec.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
        ))}
      </div>
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
