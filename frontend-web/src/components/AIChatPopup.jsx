// src/components/AIChatPopup.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { createPortal } from "react-dom";
import AIService from "../services/AIService";

const AIChatPopup = ({ onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState({
    profile: null,
    attendance: [],
    grades: [],
    courses: []
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [usingAI, setUsingAI] = useState(false);
  const messagesEndRef = useRef(null);

  // دالة مساعدة لاستخراج اسم المادة من الجملة
  const extractCourseName = (message, courseList) => {
    const lowerMsg = message.toLowerCase();
    const sortedCourses = [...courseList].sort((a, b) => b.subject.length - a.subject.length);
    
    for (const course of sortedCourses) {
      const courseNameLower = course.subject.toLowerCase();
      if (lowerMsg.includes(courseNameLower)) {
        return course;
      }
    }
    return null;
  };

  // جلب البيانات مباشرة من Firebase
  useEffect(() => {
    const loadAllStudentData = async () => {
      if (!user?.uid) {
        setDataLoading(false);
        return;
      }

      try {
        console.log("🟢 Loading data for UID:", user.uid);
        
        // 1. جلب البروفايل من users
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const profile = userSnap.exists() ? userSnap.data() : {};
        
        // 2. جلب الـ enrollments
        const enrollmentsRef = collection(db, "enrollments");
        const enrollmentsQuery = query(
          enrollmentsRef, 
          where("studentId", "==", user.uid)
        );
        const enrollmentsSnap = await getDocs(enrollmentsQuery);
        
        const courseIds = [];
        enrollmentsSnap.forEach(doc => {
          courseIds.push(doc.data().courseId);
        });
        console.log("📚 Enrolled Course IDs:", courseIds);
        
        // 3. جلب بيانات المواد من courses
        const coursesList = [];
        for (const courseId of courseIds) {
          const courseRef = doc(db, "courses", courseId);
          const courseSnap = await getDoc(courseRef);
          if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            coursesList.push({
              id: courseId,
              name: courseData.name || "Unknown",
              code: courseData.code || "---",
              creditHours: courseData.creditHours || 3,
              level: courseData.Level || "Unknown",
            });
          }
        }
        
        // 4. جلب lecture sessions
        const sessionsRef = collection(db, "lecture_sessions");
        const sessionsSnap = await getDocs(sessionsRef);
        
        const sessionsByCourse = {};
        sessionsSnap.forEach(doc => {
          const session = doc.data();
          const courseId = session.courseId;
          if (!sessionsByCourse[courseId]) {
            sessionsByCourse[courseId] = [];
          }
          sessionsByCourse[courseId].push({
            id: doc.id,
            ...session
          });
        });
        
        // 5. جلب attendance records
        const attendanceRef = collection(db, "attendance");
        const attendanceSnap = await getDocs(attendanceRef);
        
        const attendanceByCourse = {};
        attendanceSnap.forEach(doc => {
          const data = doc.data();
          if (data.studentId === user.uid && data.status === "present") {
            const courseId = data.courseId;
            if (!attendanceByCourse[courseId]) {
              attendanceByCourse[courseId] = 0;
            }
            attendanceByCourse[courseId]++;
          }
        });
        
        // 6. بناء بيانات الحضور
        const attendanceData = coursesList.map(course => {
          const sessions = sessionsByCourse[course.id] || [];
          const totalLectures = sessions.length;
          const presentCount = attendanceByCourse[course.id] || 0;
          const absences = totalLectures - presentCount;
          const absencePercent = totalLectures > 0 ? ((absences / totalLectures) * 100).toFixed(1) : 0;
          
          let status = "Regular";
          if (totalLectures === 0) {
            status = "No lectures recorded yet";
          } else if (absences === 0 && totalLectures > 0) {
            status = "Perfect";
          } else if (parseFloat(absencePercent) > 25) {
            status = "Denied";
          } else if (parseFloat(absencePercent) >= 15) {
            status = "First warning";
          }
          
          return {
            id: course.id,
            subject: course.name,
            code: course.code,
            present: presentCount,
            total: totalLectures,
            absences: absences,
            absencePercent: parseFloat(absencePercent),
            status: status,
          };
        });
        
        // 7. جلب الدرجات
        const gradesRef = collection(db, "grades");
        const gradesQuery = query(
          gradesRef,
          where("studentId", "==", user.uid)
        );
        const gradesSnap = await getDocs(gradesQuery);
        
        const gradesByCourse = {};
        gradesSnap.forEach(doc => {
          const data = doc.data();
          const courseId = data.courseId;
          const assessmentName = data.assessmentName;
          const score = data.score || 0;
          
          if (!gradesByCourse[courseId]) {
            gradesByCourse[courseId] = {
              final: 0,
              midterm: 0,
              practical: 0
            };
          }
          if (assessmentName === "Final") gradesByCourse[courseId].final = score;
          if (assessmentName === "Midterm") gradesByCourse[courseId].midterm = score;
          if (assessmentName === "Practical") gradesByCourse[courseId].practical = score;
        });
        
        // 8. بناء بيانات الدرجات
        const gradesData = coursesList.map(course => {
          const grades = gradesByCourse[course.id] || { final: 0, midterm: 0, practical: 0 };
          const total = grades.final + grades.midterm + grades.practical;
          
          let status = "No grade yet";
          if (total > 0) {
            if (total >= 85) status = "Excellent";
            else if (total >= 75) status = "Very Good";
            else if (total >= 65) status = "Good";
            else if (total >= 60) status = "Fair";
            else status = "Fail";
          }
          
          return {
            id: course.id,
            subject: course.name,
            code: course.code,
            final: grades.final,
            midterm: grades.midterm,
            practical: grades.practical,
            total: total,
            status: status
          };
        });
        
        console.log("✅ Attendance Data:", attendanceData.length, "courses");
        console.log("✅ Grades Data:", gradesData.length, "courses");
        
        setStudentData({
          profile: {
            name: profile.fullName || profile.name || "Student",
            email: profile.email || user.email,
            department: profile.department || "Not specified",
            academicYear: profile.level || profile.academicYear || "Unknown",
            studentId: profile.code || profile.studentId || "N/A",
            phone: profile.phone || "Not provided",
            role: profile.role || "student"
          },
          attendance: attendanceData,
          grades: gradesData,
          courses: coursesList
        });
        
        // رسالة ترحيب
        const firstName = profile.fullName?.split(" ")[0] || "there";
        const aiStatus = AIService.isAvailable() ? "🤖 AI Mode (Ask me anything!)" : "⚡ Local Mode";
        
        setMessages([
          {
            role: "assistant",
            content: `Hi ${firstName}! 👋\n\nI'm your AI study assistant. ${aiStatus}\n\nI can see you're enrolled in ${coursesList.length} course(s).\n\n📌 **What I can help with:**\n\n📊 **Attendance**\n• "What's my attendance in Math1?"\n• "Show my overall attendance"\n• "Which course has the highest absence?"\n\n🎓 **Grades**\n• "Show me my grades"\n• "What's my grade in Operating System?"\n• "What's my average grade?"\n\n👤 **Personal Info**\n• "What's my name/ID/department/year/phone/email?"\n\n💡 **Study Tips**\n• "How can I improve my grades?"\n• "Give me study advice"\n• "How to prepare for exams?"\n\n🌐 **General Questions**\n• "Explain recursion"\n• "How to learn programming?"\n• "Tell me a joke"`
          }
        ]);
        
      } catch (error) {
        console.error("❌ Error loading student data:", error);
        setMessages([
          {
            role: "assistant",
            content: "⚠️ I'm having trouble connecting to your data. Please make sure you're logged in and try again."
          }
        ]);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadAllStudentData();
  }, [user]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // معالجة إرسال الرسالة
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);
    setUsingAI(true);
    
    try {
      let aiResponse = null;
      
      if (AIService.isAvailable()) {
        aiResponse = await AIService.ask(userMessage, {
          profile: studentData.profile,
          attendance: studentData.attendance,
          grades: studentData.grades,
          courses: studentData.courses
        });
      }
      
      if (aiResponse) {
        setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
      } else {
        setUsingAI(false);
        const localResponse = getLocalResponse(userMessage);
        setMessages(prev => [...prev, { role: "assistant", content: localResponse }]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      const localResponse = getLocalResponse(userMessage);
      setMessages(prev => [...prev, { role: "assistant", content: localResponse }]);
    } finally {
      setLoading(false);
      setUsingAI(false);
    }
  };
  
  // المنطق المحلي المتطور (Fallback)
  const getLocalResponse = (userMessage) => {
    const lowerMsg = userMessage.toLowerCase();
    const allCourses = [...studentData.attendance, ...studentData.grades].filter((v, i, a) => 
      a.findIndex(t => t.subject === v.subject) === i
    );
    const mentionedCourse = extractCourseName(userMessage, allCourses);
    
    // ==================== ATTENDANCE QUESTIONS ====================
    if (lowerMsg.includes("غياب") || lowerMsg.includes("absence") || lowerMsg.includes("attendance") || lowerMsg.includes("حضور")) {
      
      // أعلى نسبة غياب
      if (lowerMsg.includes("اعلى") || lowerMsg.includes("highest") || lowerMsg.includes("اكبر")) {
        const coursesWithData = studentData.attendance.filter(c => c.total > 0);
        if (coursesWithData.length === 0) {
          return "📊 No attendance records yet.";
        }
        const highest = [...coursesWithData].sort((a, b) => b.absencePercent - a.absencePercent)[0];
        return `📊 **Highest Absence:** ${highest.subject}\n• Absence Rate: ${highest.absencePercent}%\n• Absences: ${highest.absences}/${highest.total}\n• Status: ${highest.status}`;
      }
      
      // أقل نسبة غياب
      if (lowerMsg.includes("اقل") || lowerMsg.includes("lowest") || lowerMsg.includes("اقل")) {
        const coursesWithData = studentData.attendance.filter(c => c.total > 0);
        if (coursesWithData.length === 0) {
          return "📊 No attendance records yet.";
        }
        const lowest = [...coursesWithData].sort((a, b) => a.absencePercent - b.absencePercent)[0];
        return `📊 **Lowest Absence:** ${lowest.subject}\n• Absence Rate: ${lowest.absencePercent}%\n• Absences: ${lowest.absences}/${lowest.total}\n• Status: ${lowest.status}`;
      }
      
      // موضوع معين
      if (mentionedCourse) {
        const course = studentData.attendance.find(c => c.subject === mentionedCourse.subject);
        if (course && course.total > 0) {
          const emoji = course.absencePercent == 0 ? "✅" : course.absencePercent > 25 ? "❌" : "⚠️";
          return `${emoji} **${course.subject}**\n\n📅 **Attendance Details:**\n• Attended: ${course.present}/${course.total}\n• Absences: ${course.absences}\n• Absence Rate: ${course.absencePercent}%\n• Status: ${course.status}`;
        } else if (course && course.total === 0) {
          return `📚 **${course.subject}**\n\nNo attendance records yet for this course.`;
        }
      }
      
      // عرض كل المواد
      const coursesWithData = studentData.attendance.filter(c => c.total > 0);
      if (coursesWithData.length === 0) {
        return "📊 You don't have any attendance records yet. Attend a lecture first!";
      }
      
      let reply = "📊 **Your Attendance Summary:**\n\n";
      studentData.attendance.forEach(c => {
        if (c.total > 0) {
          const emoji = c.absencePercent == 0 ? "✅" : c.absencePercent > 25 ? "❌" : "⚠️";
          reply += `${emoji} **${c.subject}**: ${c.present}/${c.total} (${c.absencePercent}% absences) - ${c.status}\n`;
        }
      });
      const totalPresent = studentData.attendance.reduce((s, c) => s + c.present, 0);
      const totalLectures = studentData.attendance.reduce((s, c) => s + c.total, 0);
      const overall = totalLectures > 0 ? ((totalLectures - totalPresent) / totalLectures * 100).toFixed(1) : 0;
      reply += `\n📈 **Overall absence rate**: ${overall}%`;
      return reply;
    }
    
    // ==================== GRADES QUESTIONS ====================
    if (lowerMsg.includes("درجة") || lowerMsg.includes("grade") || lowerMsg.includes("درجات") || lowerMsg.includes("score")) {
      
      // أعلى درجة
      if (lowerMsg.includes("اعلى") || lowerMsg.includes("highest") || lowerMsg.includes("اكبر")) {
        const coursesWithGrades = studentData.grades.filter(g => g.total > 0);
        if (coursesWithGrades.length === 0) {
          return "🎓 No grades available yet.";
        }
        const highest = [...coursesWithGrades].sort((a, b) => b.total - a.total)[0];
        return `🎓 **Highest Grade:** ${highest.subject}\n• Score: ${highest.total}%\n• Status: ${highest.status}`;
      }
      
      // أقل درجة
      if (lowerMsg.includes("اقل") || lowerMsg.includes("lowest") || lowerMsg.includes("اقل")) {
        const coursesWithGrades = studentData.grades.filter(g => g.total > 0);
        if (coursesWithGrades.length === 0) {
          return "🎓 No grades available yet.";
        }
        const lowest = [...coursesWithGrades].sort((a, b) => a.total - b.total)[0];
        return `🎓 **Lowest Grade:** ${lowest.subject}\n• Score: ${lowest.total}%\n• Status: ${lowest.status}`;
      }
      
      // المتوسط
      if (lowerMsg.includes("متوسط") || lowerMsg.includes("average") || lowerMsg.includes("avg")) {
        const coursesWithGrades = studentData.grades.filter(g => g.total > 0);
        if (coursesWithGrades.length === 0) {
          return "🎓 No grades available yet.";
        }
        const avg = coursesWithGrades.reduce((s, g) => s + g.total, 0) / coursesWithGrades.length;
        const passed = coursesWithGrades.filter(g => g.total >= 60).length;
        const failed = coursesWithGrades.filter(g => g.total < 60 && g.total > 0).length;
        return `🎓 **Academic Summary:**\n• Average Grade: ${avg.toFixed(1)}%\n• Passed Courses: ${passed}\n• Failed Courses: ${failed}\n• Total Courses: ${coursesWithGrades.length}`;
      }
      
      // موضوع معين
      if (mentionedCourse) {
        const course = studentData.grades.find(g => g.subject === mentionedCourse.subject);
        if (course && course.total > 0) {
          return `🎓 **${course.subject}**\n\n📝 **Grade Breakdown:**\n• Final Exam: ${course.final}/60\n• Midterm Exam: ${course.midterm}/10\n• Practical: ${course.practical}/30\n• **Total: ${course.total}%**\n• Status: ${course.status}`;
        } else if (course && course.total === 0) {
          return `📚 **${course.subject}**\n\nNo grades available yet for this course.`;
        }
      }
      
      // عرض كل الدرجات
      const coursesWithGrades = studentData.grades.filter(g => g.total > 0);
      if (coursesWithGrades.length === 0) {
        return "🎓 No grades available yet. Grades will appear after your exams.";
      }
      
      let reply = "🎓 **Your Grades:**\n\n";
      studentData.grades.forEach(g => {
        if (g.total > 0) {
          const emoji = g.total >= 85 ? "🌟" : g.total >= 75 ? "👍" : g.total >= 60 ? "📖" : "⚠️";
          reply += `${emoji} **${g.subject}**: ${g.total}% (${g.status})\n`;
        }
      });
      const avg = coursesWithGrades.reduce((s, g) => s + g.total, 0) / coursesWithGrades.length;
      reply += `\n📊 **Average Grade**: ${avg.toFixed(1)}%`;
      return reply;
    }
    
    // ==================== PERSONAL INFO ====================
    if (lowerMsg.includes("اسمي") || lowerMsg.includes("my name") || lowerMsg.includes("name")) {
      return `👤 Your name is **${studentData.profile?.name || "not set"}**.`;
    }
    if (lowerMsg.includes("student id") || lowerMsg.includes("رقم الطالب") || lowerMsg.includes("code") || lowerMsg.includes("الرقم")) {
      return `🆔 Your Student ID is: **${studentData.profile?.studentId || "N/A"}**.`;
    }
    if (lowerMsg.includes("department") || lowerMsg.includes("قسم") || lowerMsg.includes("كلية")) {
      return `🏛️ Department: **${studentData.profile?.department || "not specified"}**.`;
    }
    if (lowerMsg.includes("level") || lowerMsg.includes("year") || lowerMsg.includes("سنة") || lowerMsg.includes("مستوى") || lowerMsg.includes("الفرقة")) {
      return `📚 Academic Year: **Level ${studentData.profile?.academicYear || "not specified"}**.`;
    }
    if (lowerMsg.includes("phone") || lowerMsg.includes("تليفون") || lowerMsg.includes("رقم") || lowerMsg.includes("موبايل")) {
      return `📞 Phone number: **${studentData.profile?.phone || "not provided"}**.`;
    }
    if (lowerMsg.includes("email") || lowerMsg.includes("بريد") || lowerMsg.includes("ايميل")) {
      return `📧 Email: **${studentData.profile?.email || "not available"}**.`;
    }
    
    // ==================== STUDY TIPS & IMPROVEMENT ====================
    if (lowerMsg.includes("improve") || lowerMsg.includes("أحسن") || lowerMsg.includes("تطوير") || lowerMsg.includes("نصيحة") || lowerMsg.includes("how can i") || lowerMsg.includes("study tip") || lowerMsg.includes("how to")) {
      const highAbsence = studentData.attendance.filter(c => c.absencePercent > 15 && c.total > 0);
      const lowGrades = studentData.grades.filter(g => g.total < 65 && g.total > 0);
      
      let reply = "";
      if (highAbsence.length > 0) {
        reply += `⚠️ **Attendance Alert**\nHigh absence in: ${highAbsence.map(c => c.subject).join(", ")}.\n• Try to attend regularly to avoid course denial.\n\n`;
      }
      if (lowGrades.length > 0) {
        reply += `📖 **Academic Improvement**\nFocus on: ${lowGrades.map(c => c.subject).join(", ")}.\n\n**Suggestions:**\n• Review lecture recordings and slides\n• Attend office hours for extra help\n• Form study groups\n• Practice past exams\n• Use online resources (YouTube, Coursera)\n\n`;
      }
      if (reply === "") {
        reply = "🌟 **You're doing great!** Keep up the good work.\n\n**Study Tips:**\n• Study for 50 minutes, then take a 10-minute break\n• Review material within 24 hours of learning it\n• Teach what you learn to someone else\n• Get 7-8 hours of sleep before exams\n• Stay hydrated and exercise regularly";
      }
      return reply;
    }
    
    // ==================== COURSE INFO ====================
    if (lowerMsg.includes("عدد المواد") || lowerMsg.includes("how many courses") || lowerMsg.includes("total courses")) {
      return `📚 You are enrolled in **${studentData.courses.length}** course(s).`;
    }
    
    if (lowerMsg.includes("المواد") || lowerMsg.includes("my courses") || lowerMsg.includes("list courses")) {
      let reply = "📚 **Your Enrolled Courses:**\n\n";
      studentData.courses.forEach(c => {
        reply += `• ${c.name} (${c.code || "N/A"})\n`;
      });
      return reply;
    }
    
    // ==================== GENERAL QUESTIONS ====================
    if (lowerMsg.includes("help") || lowerMsg.includes("مساعدة") || lowerMsg.includes("what can you do")) {
      return `🔍 **What I can help you with:**\n\n📊 **Attendance**\n• "What's my attendance in Math1?"\n• "Show my overall attendance"\n• "Highest absence course"\n\n🎓 **Grades**\n• "Show me my grades"\n• "What's my average grade?"\n• "Highest/Lowest grade"\n\n👤 **Personal Info**\n• "What's my name/ID/department/year/phone/email?"\n\n📚 **Courses**\n• "List my courses"\n• "How many courses do I have?"\n\n💡 **Tips**\n• "How can I improve my grades?"\n• "Give me study advice"\n• "How to prepare for exams?"`;
    }
    
    if (lowerMsg.includes("شكرا") || lowerMsg.includes("thank you") || lowerMsg.includes("thanks")) {
      return "You're welcome! 😊 Glad I could help. Feel free to ask me anything about your studies!";
    }
    
    if (lowerMsg.includes("صباح") || lowerMsg.includes("good morning") || lowerMsg.includes("مساء") || lowerMsg.includes("good evening")) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      return `${greeting}! ${studentData.profile?.name?.split(" ")[0] || "There"} ☀️\n\nHow can I help you with your studies today?`;
    }
    
    // ==================== DEFAULT ====================
    if (AIService.isAvailable()) {
      return `🤖 I'm connected to AI! Try asking me anything like:\n• "Explain recursion in programming"\n• "What's the capital of Japan?"\n• "How do I learn Python?"\n\nOr ask about your attendance and grades!`;
    }
    
    const firstCourse = studentData.attendance[0]?.subject || studentData.courses[0]?.name || "your courses";
    return `🤔 I'm not sure how to answer that.\n\n💡 **Try asking me:**\n• "What's my attendance in ${firstCourse}?"\n• "Show me my grades"\n• "My average grade"\n• "How can I improve?"\n• "List my courses"\n• "Help" for more options\n\n📌 To enable AI mode for general questions, add your Gemini API key in the .env file.`;
  };
  
  if (dataLoading) {
    return createPortal(
      <div style={popupOverlayStyle} onClick={onClose}>
        <div style={popupContainerStyle} onClick={(e) => e.stopPropagation()}>
          <div style={popupHeaderStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={avatarStyle}>🤖</div>
              <div>
                <h3 style={headerTitleStyle}>Segma</h3>
                <p style={headerSubtitleStyle}>Loading your data...</p>
              </div>
            </div>
            <button onClick={onClose} style={closeButtonStyle}>✕</button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexDirection: "column" }}>
            <div style={{ fontSize: "32px" }}>🔄</div>
            <div style={{ color: "#64748b" }}>Loading your information...</div>
          </div>
        </div>
      </div>,
      document.body
    );
  }
  
  const popupContent = (
    <div style={popupOverlayStyle} onClick={onClose}>
      <div style={popupContainerStyle} onClick={(e) => e.stopPropagation()}>
        <div style={popupHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={avatarStyle}>🤖</div>
            <div>
              <h3 style={headerTitleStyle}>Segma</h3>
              <p style={headerSubtitleStyle}>
                {usingAI ? "🤖 AI Mode" : AIService.isAvailable() ? "🤖 AI Ready - Ask me anything!" : "⚡ Local Mode"}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>
        
        <div style={messagesContainerStyle}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...messageBubbleStyle,
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: msg.role === "user" ? "#2563eb" : "#f1f5f9",
                color: msg.role === "user" ? "white" : "#0f172a",
              }}
            >
              <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div style={loadingBubbleStyle}>
              <span>🤖</span> Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div style={inputContainerStyle}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask me anything... (attendance, grades, study tips, or general questions)"
            style={inputStyle}
          />
          <button onClick={handleSendMessage} style={sendButtonStyle} disabled={loading}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
  
  return createPortal(popupContent, document.body);
};

// ========== Styles ==========
const popupOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999999,
  backdropFilter: "blur(4px)",
};

const popupContainerStyle = {
  width: "500px",
  maxWidth: "90%",
  height: "650px",
  backgroundColor: "white",
  borderRadius: "28px",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
  animation: "slideUp 0.3s ease-out",
};

const popupHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "18px 24px",
  background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  color: "white",
};

const avatarStyle = {
  width: "44px",
  height: "44px",
  backgroundColor: "rgba(255,255,255,0.2)",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
};

const headerTitleStyle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: "600",
};

const headerSubtitleStyle = {
  margin: "2px 0 0 0",
  fontSize: "11px",
  opacity: 0.85,
};

const closeButtonStyle = {
  background: "rgba(255,255,255,0.2)",
  border: "none",
  color: "white",
  fontSize: "18px",
  cursor: "pointer",
  padding: "6px 12px",
  borderRadius: "50%",
  transition: "background 0.2s",
};

const messagesContainerStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  backgroundColor: "#ffffff",
};

const messageBubbleStyle = {
  maxWidth: "85%",
  padding: "12px 16px",
  borderRadius: "20px",
  fontSize: "14px",
  lineHeight: "1.5",
  wordBreak: "break-word",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
};

const loadingBubbleStyle = {
  maxWidth: "85%",
  padding: "10px 16px",
  borderRadius: "20px",
  backgroundColor: "#f1f5f9",
  color: "#64748b",
  fontSize: "13px",
  alignSelf: "flex-start",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const inputContainerStyle = {
  display: "flex",
  padding: "16px",
  borderTop: "1px solid #e2e8f0",
  gap: "10px",
  backgroundColor: "#f8fafc",
};

const inputStyle = {
  flex: 1,
  padding: "12px 18px",
  border: "1px solid #e2e8f0",
  borderRadius: "28px",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "white",
  fontFamily: "inherit",
};

const sendButtonStyle = {
  backgroundColor: "#8b5cf6",
  color: "white",
  border: "none",
  borderRadius: "50%",
  width: "44px",
  height: "44px",
  cursor: "pointer",
  fontSize: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.2s",
};

export default AIChatPopup;