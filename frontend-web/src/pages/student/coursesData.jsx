import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from '../../firebase';

// الدوال المساعدة
const getStatusFromGrade = (total) => {
  if (total >= 90) return "Excellent";
  if (total >= 80) return "Very Good";
  if (total >= 70) return "Good";
  if (total >= 60) return "Pass";
  return "Fail";
};

/**
 * جلب أسماء المدرسين من مجموعة users باستخدام instructorIds
 */
const getInstructorNames = async (instructorIds) => {
  try {
    if (!instructorIds || !Array.isArray(instructorIds) || instructorIds.length === 0) {
      return ['Unknown'];
    }

    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('__name__', 'in', instructorIds.slice(0, 30)));
    const usersSnapshot = await getDocs(usersQuery);

    const instructorNames = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const name = userData.fullName || userData.name || userData.displayName || 'Unknown';
      instructorNames.push(name);
    });

    if (instructorNames.length === 0) {
      return instructorIds.map(id => `Instructor (${id.slice(0, 5)}...)`);
    }

    return instructorNames;
  } catch (error) {
    console.error("Error fetching instructor names:", error);
    return ['Unknown'];
  }
};

/**
 * جلب اسم مدرس واحد من مجموعة users
 */
const getInstructorName = async (instructorId) => {
  try {
    if (!instructorId) return 'Unknown';

    const userRef = doc(db, 'users', instructorId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.fullName || userData.name || userData.displayName || 'Unknown';
    } else {
      return `Instructor (${instructorId.slice(0, 5)}...)`;
    }
  } catch (error) {
    console.error("Error fetching instructor name:", error);
    return 'Unknown';
  }
};

/**
 * استخراج اسم الدكتور من بيانات المادة
 */
const extractProfessorName = async (courseData) => {
  if (courseData.instructorIds && Array.isArray(courseData.instructorIds) && courseData.instructorIds.length > 0) {
    const instructorNames = await getInstructorNames(courseData.instructorIds);
    return instructorNames.join(' & ');
  }
  
  if (courseData.instructorId) {
    return await getInstructorName(courseData.instructorId);
  }
  
  if (courseData.instructor && typeof courseData.instructor === 'string' && courseData.instructor !== 'Unknown') {
    return courseData.instructor;
  } 
  
  if (courseData.professor && courseData.professor !== 'Unknown') {
    return courseData.professor;
  }
  
  if (courseData.instructorName) {
    return courseData.instructorName;
  }
  
  if (courseData.professorName) {
    return courseData.professorName;
  }
  
  if (courseData.instructors && Array.isArray(courseData.instructors) && courseData.instructors.length > 0) {
    return courseData.instructors.join(' & ');
  }
  
  if (courseData.professors && Array.isArray(courseData.professors) && courseData.professors.length > 0) {
    return courseData.professors.join(' & ');
  }
  
  return 'Unknown';
};

const getDefaultIcon = (courseName) => {
  const name = courseName?.toLowerCase() || '';
  if (name.includes('software')) return '🗃️';
  if (name.includes('distributed')) return '⚙️';
  if (name.includes('operating')) return '💻';
  if (name.includes('algebra')) return '🧮';
  if (name.includes('files')) return '📁';
  if (name.includes('algorithm')) return '🤖';
  if (name.includes('mechanical')) return '⚙️';
  return '📚';
};

// ==================== دوال الموقع الجغرافي ====================

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Broswer Does not support Location'));
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = '';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'please Approve Location permission And try Again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location Data Does not exist';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location permission time out';
            break;
          default:
            errorMessage = 'try Again';
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

export const checkLocationProximity = async (sessionId, studentLocation) => {
  try {
    const sessionRef = doc(db, 'lecture_sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      return { 
        success: false, 
        message: 'session does not exist' 
      };
    }
    
    const session = sessionSnap.data();
    
    if (session.attendanceOpen !== true) {
      return { 
        success: false, 
        message: '⚠️ The instructor closed the Attendence for this lecture' 
      };
    }
    
    const instructorLocation = session.instructorLocation || session.location;
    
    if (!instructorLocation || !instructorLocation.latitude || !instructorLocation.longitude) {
      return { 
        success: false, 
        message: '📍 Can not get the instructoe location try again later' 
      };
    }
    
    const allowedDistance = session.allowedDistance || 100;
    
    const distance = calculateDistance(
      studentLocation.lat,
      studentLocation.lng,
      instructorLocation.latitude,
      instructorLocation.longitude
    );
    
    if (distance <= allowedDistance) {
      return { 
        success: true, 
        message: `✅ you are close to correct location(${Math.round(distance)} Meter)`,
        distance: Math.round(distance)
      };
    } else {
      return { 
        success: false, 
        message: `❌ you are far away for lecture location\ndistance: ${Math.round(distance)} meter\nApproved : ${allowedDistance} meter\nyou have to be around ${allowedDistance} meter from instructor location.`,
        distance: Math.round(distance),
        allowedDistance: allowedDistance,
        instructorLocation: instructorLocation
      };
    }
  } catch (error) {
    console.error('Error checking location proximity:', error);
    return { 
      success: false, 
      message: 'can not git the location try again' 
    };
  }
};

export const openMapToLocation = (lat, lng) => {
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  window.open(url, '_blank');
};

// ==================== دوال الحضور الأساسية ====================

/**
 * جلب بيانات الحضور لطالب معين
 */
export const getAttendanceData = async (studentId) => {
  try {
    if (!studentId) return [];

    // جلب كل تسجيلات الحضور للطالب (يجب أن يكون status = present)
    const attendanceRef = collection(db, 'attendance');
    const attendanceQuery = query(
      attendanceRef,
      where('studentId', '==', studentId),
      where('status', '==', 'present')
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);
    
    // تجميع عدد مرات الحضور حسب المادة
    const presentByCourse = {};
    attendanceSnapshot.forEach((doc) => {
      const data = doc.data();
      const courseId = data.courseId;
      presentByCourse[courseId] = (presentByCourse[courseId] || 0) + 1;
    });

    // جلب المواد المسجل فيها الطالب
    const enrollmentsRef = collection(db, 'enrollments');
    const enrollmentsQuery = query(
      enrollmentsRef,
      where('studentId', '==', studentId)
    );
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    
    const coursesList = [];
    
    for (const enrollmentDoc of enrollmentsSnapshot.docs) {
      const enrollment = enrollmentDoc.data();
      const courseId = enrollment.courseId;
      
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await getDoc(courseRef);
      
      if (courseSnap.exists()) {
        const courseData = courseSnap.data();
        const professorName = await extractProfessorName(courseData);
        
        const sessionsRef = collection(db, 'lecture_sessions');
        const sessionsQuery = query(
          sessionsRef,
          where('courseId', '==', courseId)
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        
        const totalLectures = sessionsSnapshot.size;
        const presentCount = presentByCourse[courseId] || 0;
        const absencesCount = totalLectures - presentCount;
        
        const absencePercent = totalLectures > 0 
          ? ((absencesCount / totalLectures) * 100).toFixed(1)
          : 0;
        
        let status = 'Regular';
        const absenceValue = parseFloat(absencePercent);
        if (absencesCount === 0) status = 'Perfect';
        else if (absenceValue > 25) status = 'Denied';
        else if (absenceValue == 25) status = 'Second warning';
        else if (absenceValue >= 15) status = 'First warning';
        
        coursesList.push({
          id: courseId,
          subject: courseData.name || 'Unknown Course',
          present: presentCount,
          total: totalLectures,
          absences: absencesCount,
          absencePercent: parseFloat(absencePercent),
          status: status,
          professor: professorName,
          code: courseData.code || '---'
        });
      }
    }
    
    return coursesList;
    
  } catch (error) {
    console.error('Error getting attendance data:', error);
    return [];
  }
};

/**
 * جلب بيانات الحضور لـ Dashboard
 */
export const getCoursesForDashboard = async (studentId) => {
  const data = await getAttendanceData(studentId);
  return data.map(course => ({
    id: course.id,
    name: course.subject,
    absencePercent: course.absencePercent,
    professor: course.professor,
    icon: getDefaultIcon(course.subject),
  }));
};

/**
 * جلب بيانات صفحة المواد
 */
export const getCoursesForCoursesPage = async (studentId) => {
  const data = await getAttendanceData(studentId);
  return data.map(course => ({
    id: course.id,
    name: course.subject,
    code: course.code,
    instructor: course.professor,
    hours: 3,
    progress: course.absencePercent,
  }));
};

/**
 * جلب الإحصائيات الكاملة
 */
export const getTotalStats = async (studentId) => {
  const data = await getAttendanceData(studentId);
  
  if (data.length === 0) {
    return {
      totalCourses: 0,
      totalLectures: 0,
      totalPresent: 0,
      totalAbsences: 0,
      averageAbsence: 0,
      perfectAttendance: 0,
      needingAttention: 0,
      averageGrade: 0,
    };
  }
  
  const totalLectures = data.reduce((acc, course) => acc + course.total, 0);
  const totalPresent = data.reduce((acc, course) => acc + course.present, 0);
  const totalAbsences = data.reduce((acc, course) => acc + course.absences, 0);
  
  const averageAbsence = totalLectures > 0 
    ? ((totalAbsences / totalLectures) * 100).toFixed(1) 
    : 0;
  
  const perfectAttendance = data.filter(c => c.absences === 0).length;
  const needingAttention = data.filter(c => c.absencePercent >= 10).length;
  
  let totalGrades = 0;
  let gradesCount = 0;
  
  for (const course of data) {
    const courseRef = doc(db, 'courses', course.id);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      const grades = courseSnap.data().grades;
      if (grades) {
        const total = (grades.final || 0) + (grades.midterm || 0) + 
                      (grades.quiz1 || 0) + (grades.quiz2 || 0) + (grades.quiz3 || 0);
        totalGrades += total;
        gradesCount++;
      }
    }
  }
  
  const averageGrade = gradesCount > 0 ? (totalGrades / gradesCount).toFixed(1) : 0;
  
  return {
    totalCourses: data.length,
    totalLectures,
    totalPresent,
    totalAbsences,
    averageAbsence,
    perfectAttendance,
    needingAttention,
    averageGrade,
  };
};

/**
 * جلب مادة محددة مع تفاصيل المحاضرات
 */
export const getCourseById = async (courseId, studentId) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) return null;
    
    const courseData = courseSnap.data();
    const professorName = await extractProfessorName(courseData);
    
    const sessionsRef = collection(db, 'lecture_sessions');
    const sessionsQuery = query(
      sessionsRef,
      where('courseId', '==', courseId)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);
    
    let studentAttendance = {};
    if (studentId) {
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('courseId', '==', courseId),
        where('studentId', '==', studentId)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();
        studentAttendance[data.sessionId] = data.status;
      });
    }
    
    const lectures = [];
    sessionsSnapshot.forEach((doc) => {
      const session = doc.data();
      const status = studentAttendance[doc.id];
      lectures.push({
        id: doc.id,
        type: session.type || 'Lecture',
        topic: session.topic || `Session ${lectures.length + 1}`,
        date: session.timestamp?.toDate?.() || session.startTime || new Date(),
        attended: status === 'present',
        missed: status === 'absent',
        attendanceOpen: session.attendanceOpen !== false,
        instructorLocation: session.instructorLocation || session.location,
        allowedDistance: session.allowedDistance || 100
      });
    });
    
    lectures.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const totalLectures = lectures.length;
    const attendedLectures = lectures.filter(l => l.attended).length;
    const attendanceRate = totalLectures > 0 ? (attendedLectures / totalLectures) * 100 : 0;
    
    return {
      id: courseSnap.id,
      name: courseData.name,
      code: courseData.code,
      instructor: professorName,
      professor: professorName,
      hours: courseData.creditHours || courseData.hours || 3,
      lectures: lectures,
      attendance: attendanceRate,
      present: attendedLectures,
      total: totalLectures,
      grades: courseData.grades || {
        final: 0,
        midterm: 0,
        quiz1: 0,
        quiz2: 0,
        quiz3: 0,
      }
    };
    
  } catch (error) {
    console.error('Error getting course by id:', error);
    return null;
  }
};

/**
 * جلب تفاصيل درجة مادة محددة
 */
export const getGradeDetails = async (studentId, courseId) => {
  try {
    const course = await getCourseById(courseId, studentId);
    if (!course) return null;
    
    const total = course.grades.final + 
                  course.grades.midterm + 
                  course.grades.quiz1 + 
                  course.grades.quiz2 + 
                  course.grades.quiz3;
    
    return {
      id: course.id,
      subject: course.name,
      code: course.code,
      final: course.grades.final,
      midterm: course.grades.midterm,
      quiz1: course.grades.quiz1,
      quiz2: course.grades.quiz2,
      quiz3: course.grades.quiz3,
      total: total,
      maxFinal: 60,
      maxMidterm: 10,
      maxQuiz: 10,
      status: getStatusFromGrade(total),
    };
  } catch (error) {
    console.error('Error getting grade details:', error);
    return null;
  }
};

/**
 * جلب بيانات الدرجات لطالب معين
 */
export const getGradesData = async (studentId) => {
  try {
    const attendanceData = await getAttendanceData(studentId);
    const gradesList = [];
    
    for (const course of attendanceData) {
      const courseRef = doc(db, 'courses', course.id);
      const courseSnap = await getDoc(courseRef);
      
      if (courseSnap.exists()) {
        const grades = courseSnap.data().grades || {};
        const total = (grades.final || 0) + (grades.midterm || 0) + 
                      (grades.quiz1 || 0) + (grades.quiz2 || 0) + (grades.quiz3 || 0);
        
        gradesList.push({
          id: course.id,
          subject: course.subject,
          code: course.code,
          final: grades.final || 0,
          midterm: grades.midterm || 0,
          quiz1: grades.quiz1 || 0,
          quiz2: grades.quiz2 || 0,
          quiz3: grades.quiz3 || 0,
          total: total,
          percentage: `${total}%`,
          status: getStatusFromGrade(total),
        });
      }
    }
    
    return gradesList;
  } catch (error) {
    console.error('Error getting grades data:', error);
    return [];
  }
};

/**
 * جلب إحصائيات الدرجات
 */
export const getGradesStats = async (studentId) => {
  const grades = await getGradesData(studentId);
  
  if (grades.length === 0) {
    return {
      highest: 0,
      lowest: 0,
      average: 0,
      passed: 0,
      excellent: 0,
      veryGood: 0,
      good: 0,
      pass: 0,
      fail: 0,
    };
  }
  
  const percentages = grades.map(g => g.total);
  
  return {
    highest: Math.max(...percentages),
    lowest: Math.min(...percentages),
    average: (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1),
    passed: grades.filter(g => g.total >= 60).length,
    excellent: grades.filter(g => g.total >= 90).length,
    veryGood: grades.filter(g => g.total >= 80 && g.total < 90).length,
    good: grades.filter(g => g.total >= 70 && g.total < 80).length,
    pass: grades.filter(g => g.total >= 60 && g.total < 70).length,
    fail: grades.filter(g => g.total < 60).length,
  };
};

// ==================== دوال تسجيل الحضور ====================

export const checkActiveSession = async (courseId) => {
  try {
    const sessionsRef = collection(db, 'lecture_sessions');
    const q = query(
      sessionsRef,
      where('courseId', '==', courseId),
      where('status', '==', 'active')
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const session = querySnapshot.docs[0];
      return {
        id: session.id,
        ...session.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error checking active session:', error);
    return null;
  }
};

// ✅ استخدام ID مخصص للتحقق (sessionId_studentId)
export const checkExistingAttendance = async (sessionId, studentId) => {
  try {
    const customId = `${sessionId}_${studentId}`;
    const attendanceDoc = await getDoc(doc(db, 'attendance', customId));
    return attendanceDoc.exists();
  } catch (error) {
    console.error('Error checking existing attendance:', error);
    return false;
  }
};

export const checkEnrollment = async (studentId, courseId) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(
      enrollmentsRef,
      where('studentId', '==', studentId),
      where('courseId', '==', courseId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return false;
  }
};

// ✅ دالة تسجيل الحضور للطالب (مع موقع)
export const markStudentPresent = async (studentId, courseId, sessionId, studentLocation, distance) => {
  try {
    const customId = `${sessionId}_${studentId}`;
    await setDoc(doc(db, 'attendance', customId), {
      sessionId: sessionId,
      studentId: studentId,
      courseId: courseId,
      status: 'present',
      method: 'manual',
      timestamp: Timestamp.now(),
      markedBy: 'student',
      distanceFromDoctor: distance || null
    });
    return { success: true, message: '✅ تم تسجيل الحضور بنجاح' };
  } catch (error) {
    console.error('Error marking present:', error);
    return { success: false, message: '❌ حدث خطأ أثناء تسجيل الحضور' };
  }
};

// ✅ دالة تسجيل الحضور للدكتور (يدوياً) - مع إضافة status
export const markStudentPresentByDoctor = async (studentId, courseId, sessionId) => {
  try {
    const customId = `${sessionId}_${studentId}`;
    console.log('📝 Doctor marking attendance:', { studentId, courseId, sessionId, customId });
    
    await setDoc(doc(db, 'attendance', customId), {
      sessionId: sessionId,
      studentId: studentId,
      courseId: courseId,
      status: 'present',        // ✅ لازم يكون موجود
      method: 'manual',
      timestamp: Timestamp.now(),
      markedBy: 'doctor'
    });
    console.log('✅ Attendance marked successfully by doctor');
    return { success: true, message: '✅ تم تسجيل الحضور بنجاح' };
  } catch (error) {
    console.error('Error marking present by doctor:', error);
    return { success: false, message: '❌ حدث خطأ أثناء تسجيل الحضور' };
  }
};

// ✅ دالة متكاملة لتسجيل الحضور للطالب
export const takeAttendance = async (studentId, courseId) => {
  try {
    const activeSession = await checkActiveSession(courseId);
    if (!activeSession) {
      return { 
        success: false, 
        message: '⚠️ لا توجد جلسة مفتوحة حالياً لهذه المادة' 
      };
    }

    const isEnrolled = await checkEnrollment(studentId, courseId);
    if (!isEnrolled) {
      return { 
        success: false, 
        message: '❌ أنت غير مقيد في هذه المادة' 
      };
    }

    const hasAttendance = await checkExistingAttendance(activeSession.id, studentId);
    if (hasAttendance) {
      return { 
        success: false, 
        message: '⚠️ تم تسجيل حضورك بالفعل لهذه الجلسة' 
      };
    }

    let studentLocation = null;
    let locationError = null;
    
    try {
      studentLocation = await getCurrentLocation();
    } catch (error) {
      locationError = error.message;
    }
    
    if (!studentLocation) {
      return { 
        success: false, 
        message: `📍 ${locationError || 'لا يمكن الحصول على موقعك الحالي. تأكد من تشغيل خدمات الموقع.'}`,
        requiresLocation: true
      };
    }
    
    const proximityCheck = await checkLocationProximity(activeSession.id, studentLocation);
    
    if (!proximityCheck.success) {
      return { 
        success: false, 
        message: proximityCheck.message,
        distance: proximityCheck.distance,
        allowedDistance: proximityCheck.allowedDistance,
        instructorLocation: proximityCheck.instructorLocation
      };
    }
    
    const result = await markStudentPresent(
      studentId, 
      courseId, 
      activeSession.id, 
      studentLocation,
      proximityCheck.distance
    );
    
    if (result.success) {
      result.message = `✅ تم تسجيل الحضور بنجاح (المسافة: ${proximityCheck.distance || 'غير محسوبة'} متر)`;
    }
    
    return result;

  } catch (error) {
    console.error('Error in takeAttendance:', error);
    return { 
      success: false, 
      message: '❌ حدث خطأ أثناء تسجيل الحضور، حاول مرة أخرى' 
    };
  }
};

export const getCoursesForStudent = async (studentId) => {
  const data = await getAttendanceData(studentId);
  return data.map(course => ({
    id: course.id,
    name: course.subject,
    code: course.code,
    professor: course.professor,
    instructor: course.professor,
    icon: getDefaultIcon(course.subject),
    hours: 3,
    progress: course.absencePercent,
    present: course.present,
    total: course.total,
    grades: {},
    lectures: [],
  }));
};

export const getAllCourses = async () => {
  try {
    const coursesRef = collection(db, 'courses');
    const coursesSnapshot = await getDocs(coursesRef);
    
    const coursesList = [];
    
    for (const doc of coursesSnapshot.docs) {
      const courseData = doc.data();
      const professorName = await extractProfessorName(courseData);
      
      coursesList.push({
        id: doc.id,
        ...courseData,
        professor: professorName,
        instructor: professorName,
      });
    }
    
    return coursesList.map(course => ({
      id: course.id,
      name: course.name || 'Unknown',
      code: course.code || '---',
      professor: course.professor,
      hours: course.creditHours || course.hours || 3,
    }));
    
  } catch (error) {
    console.error("Error getting all courses:", error);
    return [];
  }
};