import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { 
  FaStar, 
  FaTrashAlt, 
  FaChevronDown, 
  FaChevronUp, 
  FaRegCommentDots,
  FaBookReader,
  FaPollH
} from 'react-icons/fa';

const ViewReviewsPage = () => {
  const [courses, setCourses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [seenReviewIds, setSeenReviewIds] = useState(new Set()); 

  const instructorId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchData = async () => {
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
        setReviews(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) { 
        console.error("Error:", err); 
      }
      setLoading(false);
    };
    fetchData();
  }, [instructorId]);

  const handleToggle = (courseId) => {
    if (activeAccordion === courseId) {
      setActiveAccordion(null);
    } else {
      setActiveAccordion(courseId);
      const currentCourseReviews = reviews.filter(r => r.courseId === courseId);
      setSeenReviewIds(prev => {
        const newSet = new Set(prev);
        currentCourseReviews.forEach(r => newSet.add(r.id));
        return newSet;
      });
    }
  };

  const handleDelete = async (reviewId) => {
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      try {
        await deleteDoc(doc(db, "reviews", reviewId));
        setReviews(prev => prev.filter(r => r.id !== reviewId));
      } catch (err) { 
        alert("Error deleting review."); 
      }
    }
  };

  const calculateAverage = (courseId) => {
    const courseReviews = reviews.filter(r => r.courseId === courseId);
    if (courseReviews.length === 0) return "0.0";
    const sum = courseReviews.reduce((acc, curr) => acc + curr.rating, 0);
    return (sum / courseReviews.length).toFixed(1);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div style={pageContainerStyle}>
      <div style={headerAreaStyle}>
        <div style={iconHeaderStyle}><FaPollH color="white" /></div>
        <div style={{ textAlign: 'left' }}>
          <h1 style={titleStyle}>Instructor Insights</h1>
          <p style={subtitleStyle}>Analyze student feedback and ratings for your assigned subjects.</p>
        </div>
      </div>

      {loading ? (
        <div style={loadingWrapperStyle}>
          <div className="loader"></div>
          <p>Gathering latest feedback...</p>
        </div>
      ) : (
        <div style={contentWidthStyle}>
          {courses.length === 0 ? (
            <div style={emptyStateStyle}>
              <FaBookReader size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
              <h3>No Courses Assigned</h3>
            </div>
          ) : (
            courses.map((course) => {
              const courseReviews = reviews.filter(r => r.courseId === course.id);
              const avg = calculateAverage(course.id);
              const isOpen = activeAccordion === course.id;
              const unreadCount = courseReviews.filter(r => !seenReviewIds.has(r.id)).length;

              return (
                <div key={course.id} style={{
                  ...accordionCardStyle,
                  borderColor: isOpen ? '#3b82f6' : '#e2e8f0',
                  boxShadow: isOpen ? '0 10px 20px -5px rgba(59, 130, 246, 0.12)' : '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={cardHeaderStyle} onClick={() => handleToggle(course.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                      <div style={{
                        ...subjectIconBox,
                        background: isOpen ? '#3b82f6' : '#f8fafc',
                        color: isOpen ? 'white' : '#64748b'
                      }}>
                        <FaRegCommentDots size={20} />
                      </div>
                      <div>
                        <h3 style={courseNameStyle}>{course.name}</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={courseCodeStyle}>Code: {course.code}</span>
                          {unreadCount > 0 && !isOpen && (
                            <span style={unreadBadgeStyle}>{unreadCount} NEW</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                      <div style={avgContainerStyle}>
                        <FaStar color="#fbbf24" size={14} style={{ marginRight: '6px' }} />
                        <span style={{ fontWeight: '700', fontSize: '15px' }}>{avg}</span>
                        <span style={totalReviewsCount}>({courseReviews.length} reviews)</span>
                      </div>
                      {isOpen ? <FaChevronUp color="#3b82f6" /> : <FaChevronDown color="#94a3b8" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div style={expandedContentStyle}>
                      {courseReviews.length === 0 ? (
                        <div style={noDataTextStyle}>No student feedback available yet.</div>
                      ) : (
                        <div style={reviewsGridStyle}>
                          {courseReviews.map((review) => (
                            <div key={review.id} style={reviewCardItem}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', gap: '2px' }}>
                                      {[...Array(5)].map((_, i) => (
                                        <FaStar key={i} color={i < review.rating ? "#fbbf24" : "#e2e8f0"} size={14} />
                                      ))}
                                    </div>
                                    {!seenReviewIds.has(review.id) && (
                                      <span style={newIndicatorLabel}>NEW</span>
                                    )}
                                  </div>
                                  <span style={reviewDateStyle}>{formatDate(review.createdAt)}</span>
                                </div>
                                <button style={trashButtonStyle} onClick={() => handleDelete(review.id)}>
                                  <FaTrashAlt size={14} />
                                </button>
                              </div>
                              {review.comment && (
                                <div style={commentQuoteStyle}>"{review.comment}"</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// --- Styles ---
const pageContainerStyle = { maxWidth: '1100px', margin: '0 auto', padding: '50px 20px', fontFamily: 'sans-serif' };
const headerAreaStyle = { display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '48px', justifyContent: 'center' };
const iconHeaderStyle = { width: '64px', height: '64px', background: '#2563eb', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' };
const titleStyle = { margin: 0, fontSize: '32px', fontWeight: '800', color: '#0f172a' };
const subtitleStyle = { margin: '4px 0 0 0', fontSize: '16px', color: '#64748b' };
const contentWidthStyle = { width: '100%', display: 'grid', gap: '24px' };
const accordionCardStyle = { background: 'white', borderRadius: '24px', border: '1px solid', overflow: 'hidden', transition: 'all 0.3s' };
const cardHeaderStyle = { padding: '24px 32px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const subjectIconBox = { width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const courseNameStyle = { margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' };
const courseCodeStyle = { fontSize: '13px', color: '#94a3b8', fontWeight: '600' };
const unreadBadgeStyle = { background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' };
const avgContainerStyle = { display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #f1f5f9' };
const totalReviewsCount = { color: '#94a3b8', marginLeft: '6px', fontSize: '13px' };
const expandedContentStyle = { padding: '0 32px 32px 32px' };
const reviewsGridStyle = { display: 'grid', gap: '20px' };
const reviewCardItem = { padding: '24px', background: 'white', borderRadius: '20px', border: '1px solid #f1f5f9' };
const newIndicatorLabel = { background: '#10b981', color: 'white', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px' };
const reviewDateStyle = { fontSize: '12px', color: '#94a3b8' };
const commentQuoteStyle = { marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '14px', borderLeft: '4px solid #e2e8f0', color: '#475569', fontStyle: 'italic' };
const trashButtonStyle = { border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer' };
const loadingWrapperStyle = { textAlign: 'center', padding: '80px' };
const emptyStateStyle = { textAlign: 'center', padding: '100px', background: 'white', borderRadius: '30px', border: '2px dashed #e2e8f0' };
const noDataTextStyle = { textAlign: 'center', padding: '40px', color: '#94a3b8' };

export default ViewReviewsPage;