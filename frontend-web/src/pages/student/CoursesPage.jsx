
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { getCoursesForCoursesPage } from './coursesData';

const CoursesPage = () => {
  const navigate = useNavigate();
  const courses = getCoursesForCoursesPage();

  const handleViewDetails = (courseId) => {
    navigate(`/student/courses/${courseId}`);
  };

  return (
    <PageLayout 
      title="My Courses" 
      subtitle="Check your enrolled courses"
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        justifyItems: 'center',
        marginTop: '20px'
      }}>
        {courses.map(course => (
          <div 
            key={course.id} 
            className={styles.courseCard}
            style={{ maxWidth: '350px', width: '100%', transition: 'all 0.3s', cursor: 'pointer' }}
            onClick={() => handleViewDetails(course.id)}
          >
            <div className={styles.courseHeader}>
              <span className={styles.courseCode}>{course.code}</span>
              <span className={styles.courseHours}>{course.hours} credits</span>
            </div>

            <div className={styles.courseBody}>
              <h3 className={styles.courseName}>{course.name}</h3>
              <p className={styles.courseInstructor}>
                <span role="img" aria-label="instructor">👨‍🏫</span> {course.instructor}
              </p>

              <button 
                className={styles.courseButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(course.id);
                }}
                style={{ marginTop: '16px' }}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
};

export default CoursesPage;
