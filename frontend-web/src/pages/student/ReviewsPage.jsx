import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { getAuth } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import PageLayout from '../../components/student/PageLayout';
import { FaStar } from 'react-icons/fa';

const ReviewsPage = () => {
  const auth = getAuth();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const enrollQuery = query(
          collection(db, "enrollments"), 
          where("studentId", "==", userId)
        );
        const enrollSnap = await getDocs(enrollQuery);
        
        const coursesPromises = enrollSnap.docs.map(async (enrollDoc) => {
          const cId = enrollDoc.data().courseId;
          const courseRef = doc(db, "courses", cId);
          const courseSnap = await getDoc(courseRef);
          if (courseSnap.exists()) {
            return { id: cId, ...courseSnap.data() };
          }
          return null;
        });

        const coursesList = (await Promise.all(coursesPromises)).filter(c => c !== null);
        setEnrolledCourses(coursesList);
      } catch (err) {
        console.error("Error fetching enrolled courses:", err);
      }
      setLoading(false);
    };

    fetchEnrolledCourses();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !selectedCourse) return;

    setSubmitLoading(true);
    setStatus({ type: '', msg: '' });

    try {
      const reviewQuery = query(
        collection(db, "reviews"),
        where("courseId", "==", selectedCourse),
        where("studentId", "==", userId)
      );
      const existingReviews = await getDocs(reviewQuery);

      if (existingReviews.size >= 3) {
        setStatus({ type: 'error', msg: 'You reached the maximum number of reviews for this subject' });
        setSubmitLoading(false);
        return;
      }

      await addDoc(collection(db, "reviews"), {
        courseId: selectedCourse,
        studentId: userId,
        rating: rating,
        comment: comment.trim(),
        createdAt: serverTimestamp()
      });

      setStatus({ type: 'success', msg: 'Review submitted successfully ✅' });
      setRating(0);
      setComment('');
      setSelectedCourse('');
    } catch (err) {
      console.error("Error submitting review:", err);
      setStatus({ type: 'error', msg: 'Failed to submit review. Please try again.' });
    }
    setSubmitLoading(false);
  };

  return (
    <PageLayout title="Course Reviews" subtitle="Your reviews are anonymous. You can submit up to 3 reviews per subject.">
      <div style={containerStyle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#2563eb', fontWeight: '500' }}>
            Loading your courses...
          </div>
        ) : (
          <div style={cardStyle}>
            <h4 style={sectionTitleStyle}>Submit Feedback</h4>
            
            <form onSubmit={handleSubmit}>
              {/* Subject Selection */}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Subject</label>
                <select 
                  style={inputStyle}
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  required
                >
                  <option value="">-- Select a subject to review --</option>
                  {enrolledCourses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>

              {/* Star Rating */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <label style={{ ...labelStyle, textAlign: 'left' }}>Your Rating *</label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      size={35}
                      style={{ cursor: 'pointer', transition: '0.15s' }}
                      color={star <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(star)}
                    />
                  ))}
                </div>
              </div>

              {/* Comment Box */}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Comment (Optional)</label>
                <textarea
                  style={{ ...inputStyle, height: '120px', resize: 'none' }}
                  placeholder="What did you think of the course content?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              {/* Status Messages */}
              {status.msg && (
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  marginBottom: '20px',
                  border: '1px solid',
                  backgroundColor: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  color: status.type === 'success' ? '#15803d' : '#b91c1c',
                  borderColor: status.type === 'success' ? '#bcf0da' : '#fecaca'
                }}>
                  {status.msg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!rating || !selectedCourse || submitLoading}
                style={{
                  ...submitButtonStyle,
                  backgroundColor: (!rating || !selectedCourse || submitLoading) ? '#cbd5e1' : '#2563eb',
                  cursor: (!rating || !selectedCourse || submitLoading) ? 'not-allowed' : 'pointer'
                }}
              >
                {submitLoading ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

// --- Styles (Consistent with your Profile/Grades pages) ---
const containerStyle = {
  maxWidth: '600px',
  margin: '24px auto',
};

const cardStyle = {
  background: 'white',
  borderRadius: '20px',
  padding: '32px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
};

const sectionTitleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#0f172a',
  marginBottom: '24px',
  paddingBottom: '16px',
  borderBottom: '2px solid #f1f5f9'
};

const inputGroupStyle = {
  marginBottom: '20px'
};

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '500',
  color: '#475569',
  marginBottom: '8px'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  fontSize: '15px',
  outline: 'none',
  fontFamily: 'inherit',
  backgroundColor: '#f8fafc'
};

const submitButtonStyle = {
  width: '100%',
  padding: '14px',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontWeight: '600',
  transition: '0.2s',
  marginTop: '10px'
};

export default ReviewsPage;