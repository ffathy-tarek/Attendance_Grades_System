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
  getDoc,
} from "firebase/firestore";
import { createPortal } from "react-dom";

// ─── Constants ───────────────────────────────────────────────────────────────
const TOTAL_LECTURES = 24;
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// ─── Helper Functions ────────────────────────────────────────────────────────
const calculateGradeStatus = (total) => {
  if (total >= 85) return "Excellent";
  if (total >= 75) return "Very Good";
  if (total >= 65) return "Good";
  if (total >= 60) return "Fair";
  if (total > 0) return "Fail";
  return "No grade yet";
};

// دالة حساب حالة الحضور (حسب القانون الجديد)
// نسبة الغياب = (عدد المحاضرات اللي اتعملت - عدد مرات الحضور) × 100 / 24
const calculateAttendanceStatus = (presentCount, totalOccurred) => {
  // لو مفيش محاضرات اتعملت خالص
  if (totalOccurred === 0) {
    return {
      status: "No lectures held yet",
      isAtRisk: false,
      absenceRate: 0,
      absences: 0,
      warningLevel: null,
    };
  }

  // القانون الجديد: (totalOccurred - presentCount) * 100 / 24
  const absences = totalOccurred - presentCount;
  const absencePct = (absences / TOTAL_LECTURES) * 100;

  let status = "Regular";
  let isAtRisk = false;
  let warningLevel = null;

  if (absences === 0) {
    status = "Perfect";
  } else if (absencePct > 25) {
    status = "Denied (حرمان من الامتحان)";
    isAtRisk = true;
    warningLevel = "denied";
  } else if (absencePct === 25) {
    status = "Second Warning (إنذار ثاني)";
    isAtRisk = true;
    warningLevel = "second";
  } else if (absencePct >= 15) {
    status = "First Warning (إنذار أول)";
    isAtRisk = true;
    warningLevel = "first";
  }

  return {
    status,
    isAtRisk,
    absenceRate: Math.round(absencePct),
    absences,
    warningLevel,
  };
};

// ─── جلب بيانات الطالب ────────────────────────────────────────────────────────
async function fetchStudentData(uid) {
  try {
    // 1. Profile
    const profileSnap = await getDoc(doc(db, "users", uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    // 2. Enrollments
    const enrollSnap = await getDocs(
      query(collection(db, "enrollments"), where("studentId", "==", uid)),
    );
    const courseIds = enrollSnap.docs.map((d) => d.data().courseId);

    // 3. Courses data
    const courses = [];
    for (const id of courseIds) {
      const snap = await getDoc(doc(db, "courses", id));
      if (snap.exists()) {
        const d = snap.data();
        courses.push({
          id,
          name: d.name || "Unknown",
          code: d.code || "---",
          level: d.level || "Unknown",
        });
      }
    }

    // 4. Grades
    const gradesSnap = await getDocs(
      query(collection(db, "grades"), where("studentId", "==", uid)),
    );
    const gradesByCourse = {};
    gradesSnap.forEach((doc) => {
      const g = doc.data();
      if (!gradesByCourse[g.courseId]) gradesByCourse[g.courseId] = {};
      gradesByCourse[g.courseId][g.assessmentName] = g.score || 0;
    });

    // 5. Attendance (الحضور الفعلي)
    const attendSnap = await getDocs(
      query(collection(db, "attendance"), where("studentId", "==", uid)),
    );
    const presentByCourse = {};
    attendSnap.forEach((doc) => {
      const a = doc.data();
      if (a.status === "present") {
        presentByCourse[a.courseId] = (presentByCourse[a.courseId] || 0) + 1;
      }
    });

    // 6. Lecture sessions (عدد المحاضرات اللي اتعملت فعلاً)
    const sessionsSnap = await getDocs(collection(db, "lecture_sessions"));
    const sessionsByCourse = {};
    sessionsSnap.forEach((doc) => {
      const s = doc.data();
      sessionsByCourse[s.courseId] = (sessionsByCourse[s.courseId] || 0) + 1;
    });

    // بناء التقرير النهائي للطالب
    const report = courses.map((course) => {
      const grades = gradesByCourse[course.id] || {};
      const final = grades["Final"] || 0;
      const midterm = grades["Midterm"] || 0;
      const practical = grades["Practical"] || 0;
      const total = final + midterm + practical;

      const presentCount = presentByCourse[course.id] || 0;
      const totalOccurred = sessionsByCourse[course.id] || 0;
      const attendanceStatus = calculateAttendanceStatus(
        presentCount,
        totalOccurred,
      );

      return {
        courseName: course.name,
        courseCode: course.code,
        level: course.level,
        grades: {
          final,
          midterm,
          practical,
          total,
          status: calculateGradeStatus(total),
        },
        attendance: {
          present: presentCount,
          totalOccurred: totalOccurred,
          totalSemester: TOTAL_LECTURES,
          absences: attendanceStatus.absences,
          absenceRate: attendanceStatus.absenceRate,
          status: attendanceStatus.status,
          isAtRisk: attendanceStatus.isAtRisk,
          warningLevel: attendanceStatus.warningLevel,
          hasLectures: totalOccurred > 0,
        },
      };
    });

    // إحصائيات عامة
    const atRiskCount = report.filter(
      (r) => r.attendance.isAtRisk && r.attendance.hasLectures,
    ).length;
    const avgGrade =
      report.length > 0
        ? (
            report.reduce((s, r) => s + r.grades.total, 0) / report.length
          ).toFixed(1)
        : 0;

    return {
      profile: {
        name: profile.fullName || profile.name || "Student",
        email: profile.email || "",
        department: profile.department || "Not specified",
        level: profile.level || profile.academicYear || "Unknown",
        studentId: profile.code || profile.studentId || "N/A",
        phone: profile.phone || "Not provided",
      },
      courses: report,
      stats: {
        totalCourses: courses.length,
        avgGrade,
        atRiskCount,
        role: "student",
        anyLecturesHeld: Object.keys(sessionsByCourse).length > 0,
      },
    };
  } catch (error) {
    console.error("❌ Error fetching student data:", error);
    throw error;
  }
}

// ─── جلب بيانات الدكتور ────────────────────────────────────────────────────────
async function fetchInstructorData(uid) {
  try {
    // 1. Profile
    const profileSnap = await getDoc(doc(db, "users", uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    // 2. Courses taught by instructor
    const coursesSnap = await getDocs(collection(db, "courses"));
    const teachingCourses = [];
    coursesSnap.forEach((doc) => {
      const c = doc.data();
      if (Array.isArray(c.instructorIds) && c.instructorIds.includes(uid)) {
        teachingCourses.push({
          id: doc.id,
          name: c.name || "Unknown",
          code: c.code || "---",
          level: c.level || "Unknown",
        });
      }
    });

    // 3. All students map
    const usersSnap = await getDocs(collection(db, "users"));
    const studentsMap = {};
    usersSnap.forEach((doc) => {
      const u = doc.data();
      if (u.role === "student" || !u.role) {
        studentsMap[doc.id] = {
          name: u.fullName || u.name || "Unknown",
          code: u.code || u.studentId || "",
          email: u.email || "",
        };
      }
    });

    // 4. Enrollments
    const enrollSnap = await getDocs(collection(db, "enrollments"));
    const studentsByCourse = {};
    for (const course of teachingCourses) {
      studentsByCourse[course.id] = [];
    }
    enrollSnap.forEach((doc) => {
      const e = doc.data();
      if (
        studentsByCourse[e.courseId] !== undefined &&
        studentsMap[e.studentId]
      ) {
        studentsByCourse[e.courseId].push({
          id: e.studentId,
          name: studentsMap[e.studentId].name,
          code: studentsMap[e.studentId].code,
        });
      }
    });

    // 5. Grades for each course
    const gradesSnap = await getDocs(collection(db, "grades"));
    const gradesByCourse = {};
    gradesSnap.forEach((doc) => {
      const g = doc.data();
      if (!gradesByCourse[g.courseId]) gradesByCourse[g.courseId] = {};
      if (!gradesByCourse[g.courseId][g.studentId])
        gradesByCourse[g.courseId][g.studentId] = {};
      gradesByCourse[g.courseId][g.studentId][g.assessmentName] = g.score || 0;
    });

    // 6. Attendance
    const attendSnap = await getDocs(collection(db, "attendance"));
    const attendanceByCourse = {};
    attendSnap.forEach((doc) => {
      const a = doc.data();
      if (attendanceByCourse[a.courseId] === undefined)
        attendanceByCourse[a.courseId] = {};
      if (a.status === "present") {
        attendanceByCourse[a.courseId][a.studentId] =
          (attendanceByCourse[a.courseId][a.studentId] || 0) + 1;
      }
    });

    // 7. Lecture sessions (المحاضرات اللي اتعملت)
    const sessionsSnap = await getDocs(collection(db, "lecture_sessions"));
    const sessionsByCourse = {};
    sessionsSnap.forEach((doc) => {
      const s = doc.data();
      sessionsByCourse[s.courseId] = (sessionsByCourse[s.courseId] || 0) + 1;
    });

    // بناء التقرير النهائي للدكتور
    const courseSummaries = teachingCourses.map((course) => {
      const students = studentsByCourse[course.id] || [];
      const totalLectures = sessionsByCourse[course.id] || 0;

      const studentDetails = students.map((student) => {
        const present = attendanceByCourse[course.id]?.[student.id] || 0;
        const grades = gradesByCourse[course.id]?.[student.id] || {};
        const final = grades["Final"] || 0;
        const midterm = grades["Midterm"] || 0;
        const practical = grades["Practical"] || 0;
        const total = final + midterm + practical;

        const attendanceStatus = calculateAttendanceStatus(
          present,
          totalLectures,
        );

        return {
          name: student.name,
          code: student.code,
          id: student.id,
          present,
          totalLectures,
          absences: attendanceStatus.absences,
          absenceRate: attendanceStatus.absenceRate,
          attendanceStatus: attendanceStatus.status,
          isAtRisk: attendanceStatus.isAtRisk,
          warningLevel: attendanceStatus.warningLevel,
          grades: {
            final,
            midterm,
            practical,
            total,
            status: calculateGradeStatus(total),
          },
        };
      });

      const avgGrade =
        studentDetails.length > 0
          ? (
              studentDetails.reduce((s, s2) => s + s2.grades.total, 0) /
              studentDetails.length
            ).toFixed(1)
          : 0;

      const atRiskCount = studentDetails.filter((s) => s.isAtRisk).length;

      return {
        ...course,
        totalLectures,
        studentCount: students.length,
        avgGrade,
        atRiskCount,
        students: studentDetails,
        hasLectures: totalLectures > 0,
      };
    });

    const totalStudents = courseSummaries.reduce(
      (s, c) => s + c.studentCount,
      0,
    );
    const totalAtRisk = courseSummaries.reduce((s, c) => s + c.atRiskCount, 0);

    return {
      profile: {
        name: profile.fullName || profile.name || "Instructor",
        email: profile.email || "",
        department: profile.department || "Not specified",
      },
      courses: courseSummaries,
      stats: {
        totalCourses: teachingCourses.length,
        totalStudents,
        totalAtRisk,
        role: "instructor",
        anyLecturesHeld: Object.keys(sessionsByCourse).length > 0,
      },
    };
  } catch (error) {
    console.error("❌ Error fetching instructor data:", error);
    throw error;
  }
}

// ─── استدعاء Groq API ────────────────────────────────────────────────────────
async function callGroqAPI(systemPrompt, userMessage) {
  const apiKey =
    import.meta.env.GROQ_API_KEY || import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey || apiKey === "") {
    console.log("⚠️ No Groq API key found");
    return null;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.6,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API Error:", error);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("Groq fetch error:", error);
    return null;
  }
}

// ─── بناء System Prompt ─────────────────────────────────────────────────────
function buildSystemPrompt(role, data) {
  if (role === "student") {
    const { profile, courses, stats } = data;

    const coursesSummary = courses
      .map((c) => {
        if (c.attendance.hasLectures) {
          let warningEmoji = "";
          if (c.attendance.warningLevel === "first") warningEmoji = "⚠️";
          else if (c.attendance.warningLevel === "second") warningEmoji = "🔴";
          else if (c.attendance.warningLevel === "denied") warningEmoji = "❌";
          else warningEmoji = "✅";

          return `- ${c.courseName} (${c.courseCode}): Grade ${c.grades.total}% (${c.grades.status}), Attendance: ${c.attendance.present}/${c.attendance.totalOccurred} lectures held (${c.attendance.absences} absences, ${c.attendance.absenceRate}% of 24) - ${warningEmoji} ${c.attendance.status}`;
        } else {
          return `- ${c.courseName} (${c.courseCode}): Grade ${c.grades.total}% (${c.grades.status}), Attendance: ⚠️ No lectures have been held yet for this course.`;
        }
      })
      .join("\n");

    const warningMsg = stats.anyLecturesHeld
      ? `⚠️ IMPORTANT ATTENDANCE RULES (Based on 24 total lectures per semester):
- Absence rate = (number of lectures held - attendance) × 100 / 24
- 15% to 24% absence → FIRST WARNING (إنذار أول)
- 25% absence → SECOND WARNING (إنذار ثاني)  
- More than 25% absence → DENIED (حرمان من الامتحان)

Example: If 10 lectures were held and student attended 6 times:
- Absences = 10 - 6 = 4
- Absence rate = 4 × 100 / 24 = 16.6% → FIRST WARNING`
      : `⚠️ IMPORTANT: No lectures have been held yet in any course. Tell the student that attendance data will appear after instructors start holding lectures.`;

    return `You are the Expert Academic Advisor for a Cairo University student.

## Student Profile
- Name: ${profile.name}
- Student ID: ${profile.studentId}
- Department: ${profile.department}
- Level: ${profile.level}

## Academic Summary
- Total Courses: ${stats.totalCourses}
- Average Grade: ${stats.avgGrade}%
- Courses at Risk: ${stats.atRiskCount}

## Course Details
${coursesSummary}

## Academic Rules
${warningMsg}

## Instructions
You are a GENERAL AI assistant. You can answer ANY question - not just about school data.
- If asked about attendance, grades, or courses → use the data above
- Calculate absence rate using the formula above (based on 24 total lectures)
- Clearly state the warning level (First Warning, Second Warning, or Denied) when applicable
- If asked about ANYTHING else (programming, jokes, general knowledge, advice, etc.) → answer like ChatGPT
- Be helpful, friendly, and use emojis occasionally
- Respond in the same language as the user (Arabic or English)

Now answer the user's question naturally.`;
  }

  // Instructor mode
  const { profile, courses, stats } = data;

  const coursesSummary = courses
    .map((c) => {
      if (c.hasLectures) {
        return `- ${c.name} (${c.code}): ${c.studentCount} students, ${c.totalLectures} lectures held so far, Avg Grade: ${c.avgGrade}%, At-Risk: ${c.atRiskCount} students (based on 24 total lectures)`;
      } else {
        return `- ${c.name} (${c.code}): ${c.studentCount} students, ⚠️ No lectures held yet for this course.`;
      }
    })
    .join("\n");

  const atRiskStudents = courses
    .flatMap((c) =>
      c.students
        .filter((s) => s.isAtRisk && s.totalLectures > 0)
        .map((s) => {
          let warningIcon = "";
          if (s.warningLevel === "first") warningIcon = "⚠️ First Warning";
          else if (s.warningLevel === "second")
            warningIcon = "🔴 Second Warning";
          else if (s.warningLevel === "denied") warningIcon = "❌ Denied";
          return `  • ${warningIcon} ${s.name} (${s.code}) - ${s.courseName}: ${s.absences}/${s.totalLectures} absences (${s.absenceRate}% of 24)`;
        }),
    )
    .join("\n");

  return `You are the Lead Academic Assistant for a Cairo University Instructor.

## Instructor Profile
- Name: ${profile.name}
- Department: ${profile.department}
- Email: ${profile.email}

## Teaching Overview
- Total Courses: ${stats.totalCourses}
- Total Students: ${stats.totalStudents}
- Students at Risk: ${stats.totalAtRisk}

## Courses Details
${coursesSummary}

## At-Risk Students (based on 24 total lectures)
${atRiskStudents || "No at-risk students"}

## Attendance Rules (for your reference)
- Absence rate = (lectures held - attendance) × 100 / 24
- 15-24% → First Warning
- 25% → Second Warning  
- >25% → Denied from exam

## Instructions
You are a GENERAL AI assistant. You can answer ANY question.
- If asked about courses, students, grades, or attendance → use the data above
- Help identify struggling students based on the attendance rules above
- Provide teaching advice when asked
- If asked about ANYTHING else → answer like a normal AI
- Respond in the same language as the user
- Be professional and helpful

Now answer the user's question naturally.`;
}

// ─── Local Fallback (لو API مش شغال) ─────────────────────────────────────────
function localFallback(msg, role, data) {
  const lower = msg.toLowerCase();

  if (role === "student") {
    const { profile, courses, stats } = data;

    // Profile
    if (
      lower.includes("profile") ||
      lower.includes("my info") ||
      lower.includes("student id") ||
      lower.includes("اسمي")
    ) {
      return `👤 **Your Profile**\n\n• Name: ${profile.name}\n• Student ID: ${profile.studentId}\n• Department: ${profile.department}\n• Level: ${profile.level}\n• Email: ${profile.email}\n• Phone: ${profile.phone}`;
    }

    // Courses list
    if (
      lower.includes("courses") ||
      lower.includes("موادي") ||
      lower.includes("my courses")
    ) {
      let reply = `📚 **Your Courses (${courses.length}):**\n\n`;
      courses.forEach((c) => {
        reply += `• **${c.courseName}** (${c.courseCode}) - Level ${c.level}\n`;
      });
      return reply;
    }

    // Attendance
    if (
      lower.includes("attendance") ||
      lower.includes("غياب") ||
      lower.includes("حضور") ||
      lower.includes("absent")
    ) {
      let hasAnyLectures = false;
      let reply =
        "📊 **Your Attendance Summary (Based on 24 total lectures):**\n\n";

      courses.forEach((c) => {
        if (c.attendance.hasLectures) {
          hasAnyLectures = true;
          let emoji = "📖";
          let warningText = "";

          if (c.attendance.warningLevel === "first") {
            emoji = "⚠️";
            warningText = " - FIRST WARNING (إنذار أول)";
          } else if (c.attendance.warningLevel === "second") {
            emoji = "🔴";
            warningText = " - SECOND WARNING (إنذار ثاني)";
          } else if (c.attendance.warningLevel === "denied") {
            emoji = "❌";
            warningText = " - DENIED (حرمان من الامتحان)";
          } else if (c.attendance.absenceRate === 0) {
            emoji = "✅";
          }

          reply += `${emoji} **${c.courseName}**: ${c.attendance.present}/${c.attendance.totalOccurred} lectures held\n`;
          reply += `      📊 ${c.attendance.absences} absences → ${c.attendance.absenceRate}% of 24 total lectures${warningText}\n`;
        } else {
          reply += `📚 **${c.courseName}**: ⚠️ No lectures have been held yet for this course.\n`;
        }
      });

      if (!hasAnyLectures) {
        return "📊 **No lectures have been held yet** in any of your courses.\n\n📌 Check back after your instructors start the semester! Attendance data will appear here once lectures are held.";
      }

      if (stats.atRiskCount > 0) {
        reply += `\n🚨 **Warning:** You are at risk in ${stats.atRiskCount} course(s)! `;
        reply += `Remember: 15-24% = First Warning, 25% = Second Warning, >25% = Denied from exam.`;
      }
      return reply;
    }

    // Grades
    if (
      lower.includes("grade") ||
      lower.includes("درجة") ||
      lower.includes("grades") ||
      lower.includes("نتيجة")
    ) {
      let reply = "🎓 **Your Grades:**\n\n";
      let hasGrades = false;

      courses.forEach((c) => {
        if (c.grades.total > 0) {
          hasGrades = true;
          const emoji =
            c.grades.total >= 85
              ? "🌟"
              : c.grades.total >= 75
                ? "👍"
                : c.grades.total >= 60
                  ? "📖"
                  : "⚠️";
          reply += `${emoji} **${c.courseName}**: ${c.grades.total}% (${c.grades.status})\n`;
          reply += `   📝 Final: ${c.grades.final}/60, Midterm: ${c.grades.midterm}/10, Practical: ${c.grades.practical}/30\n`;
        } else {
          reply += `📚 **${c.courseName}**: No grades available yet\n`;
        }
      });

      if (stats.avgGrade > 0) {
        reply += `\n📊 **Average**: ${stats.avgGrade}%`;
      }
      return reply;
    }

    // At risk
    if (
      lower.includes("at risk") ||
      lower.includes("warning") ||
      lower.includes("إنذار") ||
      lower.includes("محروم") ||
      lower.includes("denied")
    ) {
      const atRiskCourses = courses.filter(
        (c) => c.attendance.isAtRisk && c.attendance.hasLectures,
      );
      if (atRiskCourses.length === 0) {
        return "✅ You are not at risk in any course! Keep it up!";
      }
      let reply = "🚨 **At-Risk Courses (Based on 24 total lectures):**\n\n";
      atRiskCourses.forEach((c) => {
        let level = "";
        if (c.attendance.warningLevel === "first")
          level = "⚠️ FIRST WARNING (15-24%)";
        else if (c.attendance.warningLevel === "second")
          level = "🔴 SECOND WARNING (25%)";
        else if (c.attendance.warningLevel === "denied")
          level = "❌ DENIED (>25%)";
        reply += `${level}\n`;
        reply += `   **${c.courseName}**: ${c.attendance.absences} absences (${c.attendance.absenceRate}% of 24)\n`;
      });
      reply += "\n💡 Attend remaining lectures to avoid exam ban!";
      return reply;
    }

    // Help
    if (lower.includes("help") || lower.includes("مساعدة")) {
      return `🔍 **What I can help you with:**\n\n📊 Attendance: "Show my attendance" / "Am I at risk?"\n🎓 Grades: "Show my grades" / "My average grade"\n📚 Courses: "List my courses" / "My courses"\n👤 Profile: "My profile" / "Student ID"\n💡 General: "Tell me a joke" / "Study tips"\n\n📌 Attendance Rules (based on 24 total lectures):\n• 15-24% absence → First Warning\n• 25% absence → Second Warning\n• >25% absence → Denied from exam`;
    }

    // Default
    return `🤔 I didn't understand that. Try asking:\n• "Show my attendance"\n• "Show my grades"\n• "Am I at risk?"\n• "List my courses"\n• "Help" for more options`;
  }

  // INSTRUCTOR MODE
  const { profile, courses, stats } = data;

  // List students
  if (
    lower.includes("list") ||
    lower.includes("students") ||
    lower.includes("طلاب") ||
    lower.includes("student")
  ) {
    // Find specific course
    let targetCourse = null;
    for (const c of courses) {
      if (
        lower.includes(c.name.toLowerCase()) ||
        (c.code && lower.includes(c.code.toLowerCase()))
      ) {
        targetCourse = c;
        break;
      }
    }

    if (targetCourse) {
      if (targetCourse.studentCount === 0)
        return `📚 No students enrolled in **${targetCourse.name}** yet.`;
      if (!targetCourse.hasLectures) {
        let reply = `📚 **${targetCourse.name}** - No lectures held yet.\n\n👨‍🎓 **Students enrolled (${targetCourse.studentCount}):**\n\n`;
        targetCourse.students.forEach((s, i) => {
          reply += `${i + 1}. **${s.name}** (${s.code})\n`;
          reply += `      📊 No attendance data yet (no lectures held)\n`;
        });
        return reply;
      }

      let reply = `👨‍🎓 **Students in ${targetCourse.name} (${targetCourse.studentCount}):**\n\n`;
      targetCourse.students.forEach((s, i) => {
        let icon = "📖";
        let warningText = "";
        if (s.warningLevel === "first") {
          icon = "⚠️";
          warningText = " - FIRST WARNING";
        } else if (s.warningLevel === "second") {
          icon = "🔴";
          warningText = " - SECOND WARNING";
        } else if (s.warningLevel === "denied") {
          icon = "❌";
          warningText = " - DENIED";
        } else if (s.absenceRate === 0 && s.totalLectures > 0) {
          icon = "✅";
        }

        reply += `${i + 1}. ${icon} **${s.name}** (${s.code})${warningText}\n`;
        reply += `      📊 Attendance: ${s.present}/${s.totalLectures} held (${s.absences} absences → ${s.absenceRate}% of 24)\n`;
        reply += `      🎓 Grade: ${s.grades.total}% (${s.grades.status})\n`;
      });
      return reply;
    }

    // All students summary
    let reply = `👨‍🎓 **All Students Summary (${stats.totalStudents} total):**\n\n`;
    courses.forEach((c) => {
      if (c.studentCount > 0) {
        reply += `📚 **${c.name}** - ${c.studentCount} students`;
        if (c.hasLectures) {
          reply += `, ${c.totalLectures} lectures held, ${c.atRiskCount} at-risk\n`;
        } else {
          reply += `, ⚠️ No lectures held yet\n`;
        }
        c.students.slice(0, 5).forEach((s) => {
          let icon = s.isAtRisk ? "⚠️" : "✅";
          reply += `   ${icon} ${s.name} (${s.code})\n`;
        });
        if (c.studentCount > 5)
          reply += `   ... and ${c.studentCount - 5} more\n`;
        reply += "\n";
      }
    });
    return reply || "No students enrolled in any course.";
  }

  // At-risk students
  if (
    lower.includes("at risk") ||
    lower.includes("warning") ||
    lower.includes("محروم") ||
    lower.includes("denied") ||
    lower.includes("انذار")
  ) {
    const atRisk = courses.flatMap((c) => c.students.filter((s) => s.isAtRisk));
    if (atRisk.length === 0)
      return "✅ No at-risk students across your courses.";
    let reply =
      "🚨 **At-Risk Students (>15% absence of 24 total lectures):**\n\n";
    atRisk.forEach((s) => {
      let level = "";
      if (s.warningLevel === "first") level = "⚠️ First Warning (15-24%)";
      else if (s.warningLevel === "second") level = "🔴 Second Warning (25%)";
      else if (s.warningLevel === "denied") level = "❌ Denied (>25%)";
      reply += `${level}\n`;
      reply += `   **${s.name}** (${s.code}) - ${s.courseName}: ${s.absences}/${s.totalLectures} absences (${s.absenceRate}% of 24)\n`;
    });
    return reply;
  }

  // Teaching summary
  if (
    lower.includes("summary") ||
    lower.includes("overview") ||
    lower.includes("ملخص") ||
    lower.includes("dashboard")
  ) {
    let reply = `📊 **Teaching Summary for ${profile.name}**\n\n`;
    reply += `• Total Courses: ${stats.totalCourses}\n`;
    reply += `• Total Students: ${stats.totalStudents}\n`;
    reply += `• At-Risk Students: ${stats.totalAtRisk}\n\n`;
    reply += `📚 **Course Breakdown:**\n`;
    courses.forEach((c) => {
      reply += `\n**${c.name}** (${c.code})\n`;
      reply += `  • Students: ${c.studentCount}\n`;
      if (c.hasLectures) {
        reply += `  • Lectures Held: ${c.totalLectures}\n`;
        reply += `  • Avg Grade: ${c.avgGrade}%\n`;
        reply += `  • At-Risk: ${c.atRiskCount}\n`;
      } else {
        reply += `  • ⚠️ No lectures held yet\n`;
      }
    });
    return reply;
  }

  // Courses list
  if (
    lower.includes("course") ||
    lower.includes("subject") ||
    lower.includes("مادة")
  ) {
    let reply = `📚 **Your Courses (${stats.totalCourses}):**\n\n`;
    courses.forEach((c) => {
      reply += `• **${c.name}** (${c.code}) - ${c.studentCount} students`;
      if (c.hasLectures) {
        reply += `, ${c.totalLectures} lectures held\n`;
      } else {
        reply += `, ⚠️ No lectures held yet\n`;
      }
    });
    return reply;
  }

  // Help
  if (lower.includes("help") || lower.includes("مساعدة")) {
    return `🔍 **What I can help you with:**\n\n📚 **Courses**\n• "Show my courses"\n• "How many students in Mechanical 1?"\n\n👨‍🎓 **Students**\n• "List students in Algorithm"\n• "Show at-risk students"\n• "All students"\n\n📊 **Overview**\n• "Teaching summary"\n• "Course overview"\n\n📌 Attendance Rules (for your reference):\n• 15-24% absence → First Warning\n• 25% absence → Second Warning\n• >25% absence → Denied from exam`;
  }

  // Default
  return `🤔 I didn't understand that. Try asking:\n• "List students in Mechanical 1"\n• "Show at-risk students"\n• "Teaching summary"\n• "My courses"\n• "Help" for more options`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
const AIChatPopup = ({ onClose, userRole = "student" }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [appData, setAppData] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // جلب البيانات
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) {
        setLoadingData(false);
        return;
      }

      try {
        setLoadingData(true);
        const data =
          userRole === "student"
            ? await fetchStudentData(user.uid)
            : await fetchInstructorData(user.uid);
        setAppData(data);

        // رسالة ترحيب
        const firstName = data.profile.name.split(" ")[0];

        let welcome = "";
        if (userRole === "student") {
          if (!data.stats.anyLecturesHeld) {
            welcome = `Hi ${firstName}! 👋\n\nI'm your AI academic assistant. 📚\n\n⚠️ **No lectures have been held yet** in any of your courses.\n\n📌 Once your instructors start holding lectures, attendance data will appear here automatically.\n\nIn the meantime, you can ask me about:\n• 🎓 "Show my grades"\n• 📚 "List my courses"\n• 👤 "My profile"\n• 💡 Any general question!`;
          } else {
            welcome = `Hi ${firstName}! 👋\n\nI'm your AI academic assistant. I can see you're taking ${data.stats.totalCourses} course(s).\n\n📌 **Ask me about:**\n• 📊 "Show my attendance"\n• 🎓 "Show my grades"\n• ⚠️ "Am I at risk?"\n• 📚 "My courses"\n• 💡 Any general question!\n\n📌 **Attendance Rules (based on 24 total lectures):**\n• 15-24% absence → First Warning\n• 25% absence → Second Warning\n• >25% absence → Denied from exam`;
          }
        } else {
          if (!data.stats.anyLecturesHeld) {
            welcome = `Hello Professor ${firstName}! 👋\n\nI'm your AI teaching assistant. 📚\n\n⚠️ **No lectures have been held yet** in any of your courses.\n\nYou have ${data.stats.totalCourses} course(s) with ${data.stats.totalStudents} student(s).\n\n📌 Once you start holding lectures, attendance data will appear here.`;
          } else {
            welcome = `Hello Professor ${firstName}! 👋\n\nI'm your AI teaching assistant. You have ${data.stats.totalCourses} course(s) with ${data.stats.totalStudents} student(s).\n\n📌 **Ask me about:**\n• 👨‍🎓 "List students in Mechanical 1"\n• ⚠️ "Who is at risk?"\n• 📊 "Teaching summary"\n• 🎓 "Show grades in Algorithm"\n\n📌 **Attendance Rules (based on 24 total lectures):**\n• 15-24% absence → First Warning\n• 25% absence → Second Warning\n• >25% absence → Denied from exam`;
          }
        }

        setMessages([{ id: "1", role: "assistant", content: welcome }]);
      } catch (error) {
        console.error("Data loading error:", error);
        setMessages([
          {
            id: "1",
            role: "assistant",
            content:
              "⚠️ Error loading your data. Please refresh and try again.",
          },
        ]);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user, userRole]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !appData) return;

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMessage },
    ]);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt(userRole, appData);
      let aiResponse = await callGroqAPI(systemPrompt, userMessage);

      if (!aiResponse) {
        // Fallback to local
        aiResponse = localFallback(userMessage, userRole, appData);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: aiResponse,
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      const fallback = localFallback(userMessage, userRole, appData);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fallback,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const roleColor = userRole === "instructor" ? "#0369a1" : "#7c3aed";
  const roleIcon = userRole === "instructor" ? "🎓" : "📚";

  if (loadingData) {
    return createPortal(
      <div style={styles.overlay}>
        <div style={styles.container}>
          <div
            style={{
              ...styles.header,
              background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}bb 100%)`,
            }}
          >
            <div style={styles.headerLeft}>
              <div style={styles.avatar}>{roleIcon}</div>
              <div>
                <h3 style={styles.title}>AI Assistant</h3>
                <p style={styles.subtitle}>Loading...</p>
              </div>
            </div>
            <button onClick={onClose} style={styles.closeBtn}>
              ✕
            </button>
          </div>
          <div style={styles.loadingCenter}>
            <div style={styles.spinner} />
            <p>Loading your academic data...</p>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            ...styles.header,
            background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}bb 100%)`,
          }}
        >
          <div style={styles.headerLeft}>
            <div style={styles.avatar}>{roleIcon}</div>
            <div>
              <h3 style={styles.title}>AI Assistant</h3>
              <p style={styles.subtitle}>{loading ? "Typing..." : "Ready"}</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {/* Messages */}
        <div style={styles.messagesContainer}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  ...styles.bubble,
                  backgroundColor: msg.role === "user" ? roleColor : "#f1f5f9",
                  color: msg.role === "user" ? "#fff" : "#0f172a",
                  borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                  borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
                }}
              >
                <pre style={styles.bubbleText}>{msg.content}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div style={styles.typingBubble}>
              <span style={styles.dot} />
              <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
              <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask me anything..."
            style={styles.input}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              ...styles.sendBtn,
              backgroundColor: roleColor,
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            ➤
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body,
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
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
    backdropFilter: "blur(6px)",
  },
  container: {
    width: 520,
    maxWidth: "92vw",
    height: 680,
    backgroundColor: "#fff",
    borderRadius: 28,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 30px 60px -10px rgba(0,0,0,0.45)",
    animation: "slideUp 0.3s ease-out",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 22px",
    color: "#fff",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
  },
  subtitle: {
    margin: "2px 0 0",
    fontSize: 11,
    opacity: 0.8,
  },
  closeBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "18px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    backgroundColor: "#fafafa",
  },
  bubble: {
    maxWidth: "82%",
    padding: "10px 14px",
    borderRadius: 20,
    fontSize: 13.5,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  bubbleText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: 1.55,
  },
  typingBubble: {
    padding: "12px 18px",
    backgroundColor: "#e8edf3",
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    display: "flex",
    gap: 5,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor: "#94a3b8",
    display: "inline-block",
    animation: "bounce 1.2s infinite ease-in-out",
  },
  inputContainer: {
    display: "flex",
    padding: "14px 16px",
    borderTop: "1px solid #e8edf3",
    gap: 10,
    backgroundColor: "#f8fafc",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: "11px 18px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 28,
    fontSize: 14,
    outline: "none",
    backgroundColor: "#fff",
    fontFamily: "inherit",
  },
  sendBtn: {
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 44,
    height: 44,
    cursor: "pointer",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "opacity 0.2s",
  },
  loadingCenter: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "3px solid #e2e8f0",
    borderTopColor: "#7c3aed",
    animation: "spin 0.8s linear infinite",
  },
};

export default AIChatPopup;
