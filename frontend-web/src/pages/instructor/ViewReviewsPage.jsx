import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase'; // تأكد من استيراد auth من ملفك
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy 
} from 'firebase/firestore';
import { FaStar, FaRegCommentDots } from 'react-icons/fa';

const ViewReviewsPage = () => {
  const [courses, setCourses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const instructorId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchInstructorData = async () => {
      if (!instructorId) return;
      setLoading(true);
      try {
        const coursesQuery = query(
          collection(db, "courses"),
          where("instructorIds", "array-contains", instructorId)
        );
        const coursesSnap = await getDocs(coursesQuery);
        const myCourses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCourses(myCourses);

        const reviewsQuery = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
        const reviewsSnap = await getDocs(reviewsQuery);
        const allReviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const instructorReviews = allReviews.filter(rev => 
          myCourses.some(course => course.id === rev.courseId)
        );
        setReviews(instructorReviews);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      }
      setLoading(false);
    };

    fetchInstructorData();
  }, [instructorId]);

  const calculateAverage = (courseId) => {
    const courseReviews = reviews.filter(r => r.courseId === courseId);
    if (courseReviews.length === 0) return 0;
    const sum = courseReviews.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / courseReviews.length).toFixed(1);
  };

  return (
    <div style={{ padding: '20px', width: '100%' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: 'var(--color-primary)', margin: 0 }}>Course Feedback</h1>
        <p style={{ color: '#666' }}>View anonymous student ratings and comments.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading feedback...</div>
      ) : (
        <div style={containerStyle}>
          {courses.length === 0 ? (
            <div style={cardStyle}>No courses assigned to you yet.</div>
          ) : (
            courses.map(course => {
              const courseReviews = reviews.filter(r => r.courseId === course.id);
              const avg = calculateAverage(course.id);

              return (
                <div key={course.id} style={{ marginBottom: '32px' }}>
                  <div style={courseHeaderStyle}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>{course.name}</h3>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Code: {course.code}</span>
                    </div>
                    <div style={avgBadgeStyle}>
                      <FaStar color="#fbbf24" style={{ marginRight: '6px' }} />
                      <span>{avg} / 5.0</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
                    {courseReviews.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '14px' }}>No student feedback yet.</p>
                    ) : (
                      courseReviews.map(review => (
                        <div key={review.id} style={reviewCardStyle}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex' }}>
                              {[...Array(5)].map((_, i) => (
                                <FaStar key={i} color={i < review.rating ? "#fbbf24" : "#e2e8f0"} size={14} />
                              ))}
                            </div>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {review.createdAt?.toDate().toLocaleDateString()}
                            </span>
                          </div>
                          {review.comment && <p style={commentTextStyle}>{review.comment}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// Styles
const containerStyle = { maxWidth: '1000px' };
const cardStyle = { background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #ddd' };
const courseHeaderStyle = { 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  padding: '15px', 
  background: '#f1f5f9', 
  borderRadius: '10px' 
};
const avgBadgeStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  background: '#1e293b', 
  color: 'white', 
  padding: '5px 15px', 
  borderRadius: '20px' 
};
const reviewCardStyle = { 
  background: 'white', 
  padding: '15px', 
  borderRadius: '10px', 
  border: '1px solid #f1f5f9',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};
const commentTextStyle = { margin: '8px 0 0 0', fontSize: '14px', color: '#475569', fontStyle: 'italic' };

export default ViewReviewsPage;