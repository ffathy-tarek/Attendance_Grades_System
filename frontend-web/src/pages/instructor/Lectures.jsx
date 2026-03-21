import React, { useState, useEffect } from "react";
// Import من ملف الفايربيز اللي إنت بعته
import { db, auth } from "../../firebase"; 
import { 
  collection, query, where, getDocs, addDoc, 
  serverTimestamp, onSnapshot, orderBy 
} from "firebase/firestore";

function Lectures() {
  const [lectures, setLectures] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // بيانات الفورم الجديدة
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [duration, setDuration] = useState("1 hour");

  // 1. جلب تاريخ المحاضرات (History) لايف
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "lecture_sessions"),
      where("instructorId", "==", user.uid),
      orderBy("startTime", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLectures(docs);
    });

    return () => unsubscribe();
  }, []);

  // 2. جلب المواد المتاحة للدكتور (Subject Selection)
  useEffect(() => {
    const fetchCourses = async () => {
      const user = auth.currentUser;
      if (user) {
        const q = query(collection(db, "courses"), where("instructorIds", "array-contains", user.uid));
        const snap = await getDocs(q);
        setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    };
    fetchCourses();
  }, []);

  // 3. منطق بدء المحاضرة (Start Session)
  const handleStartLecture = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return alert("Please select a subject!");

    setLoading(true);
    try {
      const selectedCourse = courses.find(c => c.id === selectedCourseId);
      
      await addDoc(collection(db, "lecture_sessions"), {
        courseId: selectedCourseId,
        courseName: selectedCourse.name || selectedCourse.courseName,
        instructorId: auth.currentUser.uid,
        startTime: serverTimestamp(),
        status: "active",
        durationMinutes: duration, // المهمة المطلوبة في السبرنت
      });

      setShowModal(false);
      alert("Lecture Started Successfully! 🚀");
    } catch (error) {
      console.error(error);
      alert("Error starting lecture");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Lectures History</h1>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>+ Add New Lecture</button>
      </div>

      <div style={styles.list}>
        {lectures.length === 0 ? <p>No lectures yet.</p> : lectures.map((lec) => (
          <div key={lec.id} style={styles.card}>
            <div>
              <h3 style={{margin: 0, color: '#1a3a8a'}}>{lec.courseName}</h3>
              <p style={{fontSize: '12px', color: '#666'}}>
                {lec.startTime?.toDate().toLocaleString() || "Starting..."}
              </p>
            </div>
            <span style={{
              padding: '5px 10px', 
              borderRadius: '15px', 
              backgroundColor: lec.status === 'active' ? '#dcfce7' : '#f1f5f9',
              color: lec.status === 'active' ? '#166534' : '#64748b',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {lec.status}
            </span>
          </div>
        ))}
      </div>

      {/* Modal الفورم الجديدة */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Start New Session</h3>
            <form onSubmit={handleStartLecture}>
              <label style={styles.label}>Select Subject</label>
              <select style={styles.input} value={selectedCourseId} onChange={(e)=>setSelectedCourseId(e.target.value)}>
                <option value="">-- Choose Subject --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name || c.courseName}</option>)}
              </select>

              <label style={styles.label}>Duration</label>
              <select style={styles.input} value={duration} onChange={(e)=>setDuration(e.target.value)}>
                <option value="1 hour">1 Hour</option>
                <option value="2 hours">2 Hours</option>
                <option value="3 hours">3 Hours</option>
              </select>

              <div style={styles.actions}>
                <button type="button" onClick={()=>setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={loading} style={styles.confirmBtn}>
                  {loading ? "Starting..." : "Start Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ستايل سريع وشيك عشان تبهرهم
const styles = {
  container: { padding: '30px', fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  addBtn: { backgroundColor: '#1a3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  list: { display: 'flex', flexDirection: 'column', gap: '15px' },
  card: { padding: '15px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  modalOverlay: { position: 'fixed', top:0, left:0, right:0, bottom:0, backgroundColor: 'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center' },
  modalContent: { backgroundColor:'#fff', padding:'30px', borderRadius:'15px', width:'400px' },
  label: { display:'block', marginBottom:'8px', fontWeight:'bold', fontSize:'13px' },
  input: { width:'100%', padding:'10px', marginBottom:'20px', borderRadius:'8px', border:'1px solid #ddd' },
  actions: { display:'flex', justifyContent:'flex-end', gap:'10px' },
  cancelBtn: { padding:'10px 20px', borderRadius:'8px', border:'none', cursor:'pointer' },
  confirmBtn: { padding:'10px 20px', backgroundColor:'#1a3a8a', color:'#fff', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'bold' }
};

export default Lectures;