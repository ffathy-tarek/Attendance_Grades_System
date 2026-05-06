import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; //
import { getAuth } from 'firebase/auth'; //[cite: 2]
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore'; //[cite: 2]
import PageLayout from '../../components/student/PageLayout'; //[cite: 2]
import { FaStar, FaEdit, FaBookOpen } from 'react-icons/fa'; //[cite: 2]

const ReviewsPage = () => {
  const auth = getAuth(); //[cite: 2]
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [reviewsCount, setReviewsCount] = useState(0);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const userId = auth.currentUser?.uid; //[cite: 2]

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const enrollQuery = query(collection(db, "enrollments"), where("studentId", "==", userId)); //[cite: 2]
        const enrollSnap = await getDocs(enrollQuery);
        const coursesPromises = enrollSnap.docs.map(async (enrollDoc) => {
          const cId = enrollDoc.data().courseId;
          const courseSnap = await getDoc(doc(db, "courses", cId));
          return courseSnap.exists() ? { id: cId, ...courseSnap.data() } : null;
        });
        const coursesList = (await Promise.all(coursesPromises)).filter(c => c !== null);
        setEnrolledCourses(coursesList);
      } catch (err) { console.error("Error fetching courses:", err); }
      setLoading(false);
    };
    fetchEnrolledCourses();
  }, [userId]);

  // Logic: Reset status and check review count when subject changes[cite: 2]
  useEffect(() => {
    const checkReviewCount = async () => {
      if (!selectedCourse || !userId) {
        setReviewsCount(0);
        return;
      }
      const q = query(collection(db, "reviews"), where("courseId", "==", selectedCourse), where("studentId", "==", userId));
      const snap = await getDocs(q);
      setReviewsCount(snap.size);
    };
    
    setStatus({ type: '', msg: '' }); 
    checkReviewCount();
  }, [selectedCourse, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !selectedCourse) return;
    setSubmitLoading(true);
    try {
      if (reviewsCount >= 3) {
        setStatus({ type: 'error', msg: 'You reached the maximum number of reviews for this subject' });
      } else {
        await addDoc(collection(db, "reviews"), {
          courseId: selectedCourse,
          studentId: userId,
          rating,
          comment: comment.trim(),
          createdAt: serverTimestamp()
        }); //[cite: 2]
        setStatus({ type: 'success', msg: 'Review submitted successfully ✅' });
        setRating(0);
        setComment('');
        setSelectedCourse('');
      }
    } catch (err) { setStatus({ type: 'error', msg: 'Failed to submit review.' }); }
    setSubmitLoading(false);
  };

  return (
    <PageLayout title="Course Feedback" subtitle="Your feedback helps us improve. All submissions are anonymous.">
      <div style={wrapperStyle}>
        {loading ? (
          <div style={loadingContainerStyle}>
            <div className="spinner"></div>
            <p>Loading your courses...</p>
          </div>
        ) : (
          <div style={mainCardStyle}>
            {/* Header Section */}
            <div style={cardHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={iconBoxStyle}><FaEdit color="white" /></div>
                <div>
                  <h2 style={headerTitleStyle}>Write a Review</h2>
                  <p style={headerSubtitleStyle}>Share your thoughts about the course</p>
                </div>
              </div>
              {selectedCourse && (
                <div style={{
                  ...badgeStyle,
                  backgroundColor: reviewsCount >= 3 ? '#fff1f2' : '#f0f9ff',
                  color: reviewsCount >= 3 ? '#e11d48' : '#0369a1',
                  border: `1px solid ${reviewsCount >= 3 ? '#fecdd3' : '#bae6fd'}`
                }}>
                  {reviewsCount} / 3 Attempts Used
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} style={formStyle}>
              {/* Subject Selection */}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>
                  <FaBookOpen style={{ marginRight: '8px' }} size={14} /> 
                  Select Subject
                </label>
                <div style={selectWrapperStyle}>
                  <select 
                    style={selectStyle}
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                  >
                    <option value="">Choose from your enrolled subjects...</option>
                    {enrolledCourses.map(course => (
                      <option key={course.id} value={course.id}>{course.name} — {course.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rating Section */}
              <div style={ratingSectionStyle}>
                <p style={{ ...labelStyle, textAlign: 'center', marginBottom: '15px' }}>How would you rate this course?</p>
                <div style={starsContainerStyle}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      size={42}
                      style={{ 
                        cursor: 'pointer', 
                        transition: 'transform 0.2s, color 0.2s',
                        transform: star <= (hover || rating) ? 'scale(1.1)' : 'scale(1)'
                      }}
                      color={star <= (hover || rating) ? "#fbbf24" : "#e2e8f0"}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => { setRating(star); setStatus({ type: '', msg: '' }); }}
                    />
                  ))}
                </div>
                {rating > 0 && <p style={ratingHintStyle}>{['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1]}</p>}
              </div>

              {/* Comment Section */}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Detailed Feedback (Optional)</label>
                <textarea
                  style={textareaStyle}
                  placeholder="Share your experience with the instructor or course content..."
                  value={comment}
                  onChange={(e) => { setComment(e.target.value); setStatus({ type: '', msg: '' }); }}
                />
              </div>

              {/* Status Message */}
              {status.msg && (
                <div style={{ 
                  ...statusBoxStyle, 
                  backgroundColor: status.type === 'success' ? '#ecfdf5' : '#fff1f2', 
                  color: status.type === 'success' ? '#065f46' : '#9f1239',
                  border: `1px solid ${status.type === 'success' ? '#a7f3d0' : '#fecdd3'}`
                }}>
                  {status.msg}
                </div>
              )}

              {/* Action Button */}
              <button 
                type="submit" 
                disabled={!rating || !selectedCourse || submitLoading || reviewsCount >= 3} 
                style={{ 
                  ...submitBtnStyle, 
                  backgroundColor: (!rating || !selectedCourse || submitLoading || reviewsCount >= 3) ? '#e2e8f0' : '#2563eb',
                  cursor: (!rating || !selectedCourse || submitLoading || reviewsCount >= 3) ? 'not-allowed' : 'pointer'
                }}
              >
                {submitLoading ? "Processing..." : "Publish Review"}
              </button>
            </form>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

// --- Styles ---
const wrapperStyle = {
  display: 'flex',
  justifyContent: 'center',
  padding: '20px 0',
  width: '100%',
};

const mainCardStyle = {
  width: '100%',
  maxWidth: '800px', // زيادة العرض ليكون أكثر راحة
  background: 'white',
  borderRadius: '24px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  overflow: 'hidden',
  border: '1px solid #f1f5f9'
};

const cardHeaderStyle = {
  padding: '30px 40px',
  background: 'linear-gradient(to right, #f8fafc, #ffffff)',
  borderBottom: '1px solid #f1f5f9',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '15px'
};

const iconBoxStyle = {
  width: '45px',
  height: '45px',
  background: '#2563eb',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
};

const headerTitleStyle = { margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' };
const headerSubtitleStyle = { margin: '2px 0 0 0', fontSize: '14px', color: '#64748b' };

const badgeStyle = {
  padding: '6px 14px',
  borderRadius: '99px',
  fontSize: '13px',
  fontWeight: '600',
};

const formStyle = { padding: '40px' };

const inputGroupStyle = { marginBottom: '30px' };

const labelStyle = { 
  display: 'flex', 
  alignItems: 'center', 
  fontSize: '15px', 
  fontWeight: '600', 
  color: '#334155', 
  marginBottom: '10px' 
};

const selectWrapperStyle = { position: 'relative' };

const selectStyle = { 
  width: '100%', 
  padding: '15px 20px', 
  border: '2px solid #f1f5f9', 
  borderRadius: '14px', 
  fontSize: '15px', 
  backgroundColor: '#f8fafc', 
  outline: 'none', 
  cursor: 'pointer',
  appearance: 'none',
  transition: 'all 0.2s',
  color: '#1e293b'
};

const ratingSectionStyle = {
  background: '#f8fafc',
  padding: '30px',
  borderRadius: '20px',
  marginBottom: '30px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const starsContainerStyle = { display: 'flex', gap: '15px' };

const ratingHintStyle = { 
  marginTop: '12px', 
  fontSize: '14px', 
  fontWeight: '700', 
  color: '#2563eb', 
  letterSpacing: '0.5px' 
};

const textareaStyle = { 
  width: '100%', 
  minHeight: '150px', 
  padding: '18px', 
  border: '2px solid #f1f5f9', 
  borderRadius: '16px', 
  fontSize: '15px', 
  backgroundColor: '#f8fafc', 
  outline: 'none', 
  resize: 'vertical',
  transition: 'border 0.2s',
  fontFamily: 'inherit'
};

const statusBoxStyle = { 
  padding: '15px', 
  borderRadius: '12px', 
  fontSize: '14px', 
  marginBottom: '25px', 
  textAlign: 'center', 
  fontWeight: '500' 
};

const submitBtnStyle = { 
  width: '100%', 
  padding: '18px', 
  color: 'white', 
  border: 'none', 
  borderRadius: '16px', 
  fontWeight: '700', 
  fontSize: '16px', 
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
};

const loadingContainerStyle = {
  textAlign: 'center',
  padding: '60px',
  color: '#64748b'
};

export default ReviewsPage;