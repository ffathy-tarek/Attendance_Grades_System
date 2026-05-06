import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/student/PageLayout';
import styles from '../../components/student/PageLayout.module.css';
import { getCoursesForCoursesPage } from './coursesData';
import { useAuth } from '../../context/AuthContext';

const CoursesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const coursesData = await getCoursesForCoursesPage(user.uid);
        setCourses(coursesData || []);
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [user?.uid]);

  const handleViewDetails = (courseId) => {
    navigate(`/student/courses/${courseId}`);
  };

  if (loading) {
    return (
      <PageLayout title="My Courses" subtitle="Check your enrolled courses">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>Loading...</div>
        </div>
      </PageLayout>
    );
  }

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
        {courses.length > 0 ? (
          courses.map(course => (
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
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', gridColumn: '1/-1' }}>
            No courses available
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default CoursesPage;