import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from '../../firebase';

// الدوال المساعدة
const calculateAttendancePercent = (present, total) => {
  return Math.round((present / total) * 100);
};

const calculateAbsences = (present, total) => {
  return total - present;
};

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

    // جلب بيانات المدرسين من مجموعة users
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, where('__name__', 'in', instructorIds.slice(0, 30)));
    const usersSnapshot = await getDocs(usersQuery);

    const instructorNames = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      // جلب الاسم - ممكن يكون في حقول مختلفة
      const name = userData.fullName || userData.name || userData.displayName || 'Unknown';
      instructorNames.push(name);
    });

    // إذا ملقيناش أسماء، نرجع IDs كبديل
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
  // التحقق من وجود instructorIds (array)
  if (courseData.instructorIds && Array.isArray(courseData.instructorIds) && courseData.instructorIds.length > 0) {
    const instructorNames = await getInstructorNames(courseData.instructorIds);
    return instructorNames.join(' & ');
  }
  
  // التحقق من وجود instructorId (string)
  if (courseData.instructorId) {
    return await getInstructorName(courseData.instructorId);
  }
  
  // التحقق من وجود instructor
  if (courseData.instructor && typeof courseData.instructor === 'string' && courseData.instructor !== 'Unknown') {
    return courseData.instructor;
  } 
  
  // التحقق من وجود professor
  if (courseData.professor && courseData.professor !== 'Unknown') {
    return courseData.professor;
  }
  
  // التحقق من وجود instructorName
  if (courseData.instructorName) {
    return courseData.instructorName;
  }
  
  // التحقق من وجود professorName
  if (courseData.professorName) {
    return courseData.professorName;
  }
  
  // إذا كان في array of instructors
  if (courseData.instructors && Array.isArray(courseData.instructors) && courseData.instructors.length > 0) {
    return courseData.instructors.join(' & ');
  }
  
  // إذا كان في array of professors
  if (courseData.professors && Array.isArray(courseData.professors) && courseData.professors.length > 0) {
    return courseData.professors.join(' & ');
  }
  
  return 'Unknown';
};

/**
 * الدالة الرئيسية: تجلب جميع المواد لطالب معين
 */
export const getCoursesForStudent = async (studentId) => {
  try {
    if (!studentId) {
      console.error('studentId مطلوب');
      return [];
    }

    // 1. جلب كل التسجيلات الخاصة بهذا الطالب من مجموعة enrollments
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(enrollmentsRef, where('studentId', '==', studentId));
    const enrollmentsSnapshot = await getDocs(q);

    if (enrollmentsSnapshot.empty) {
      console.log('لا يوجد مواد مسجلة لهذا الطالب');
      return [];
    }

    // 2. استخراج قائمة courseIds
    const courseIds = [];
    enrollmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.courseId) {
        courseIds.push(data.courseId);
      }
    });

    if (courseIds.length === 0) {
      return [];
    }

    // 3. جلب تفاصيل المواد من مجموعة courses
    const coursesRef = collection(db, 'courses');
    const coursesQuery = query(coursesRef, where('__name__', 'in', courseIds.slice(0, 30)));
    const coursesSnapshot = await getDocs(coursesQuery);

    // 4. تحويل البيانات إلى الشكل المطلوب
    const coursesList = [];
    
    for (const doc of coursesSnapshot.docs) {
      const courseData = doc.data();
      
      // استخراج اسم الدكتور (مع await لأنها async)
      const professorName = await extractProfessorName(courseData);
      
      // بناء كائن المادة
      coursesList.push({
        id: doc.id,
        name: courseData.name || 'Unknown Course',
        code: courseData.code || '---',
        professor: professorName,
        instructor: professorName,
        icon: courseData.icon || getDefaultIcon(courseData.name),
        hours: courseData.creditHours || courseData.hours || 3,
        progress: courseData.progress || 50,
        
        present: courseData.present || 20,
        total: courseData.total || 24,
        
        grades: courseData.grades || {
          final: courseData.finalGrade || 40,
          midterm: courseData.midtermGrade || 8,
          quiz1: courseData.quiz1 || 8,
          quiz2: courseData.quiz2 || 8,
          quiz3: courseData.quiz3 || 8,
        },
        
        lectures: courseData.lectures || generateDefaultLectures(),
      });
    }

    return coursesList;

  } catch (error) {
    console.error("حدث خطأ أثناء جلب المواد: ", error);
    return [];
  }
};

// دالة مساعدة لجلب أيقونة افتراضية
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

// دالة مساعدة لتوليد محاضرات افتراضية
const generateDefaultLectures = () => {
  return [
    { type: "Theory", topic: "LEC-1", date: "2026-03-01", attended: true },
    { type: "Lab", topic: "LAB-1", date: "2026-03-03", attended: true },
    { type: "Theory", topic: "LEC-2", date: "2026-03-05", attended: false },
    { type: "Lab", topic: "LAB-2", date: "2026-03-08", attended: true },
    { type: "Theory", topic: "LEC-3", date: "2026-03-10", attended: true },
    { type: "Lab", topic: "LAB-3", date: "2026-03-12", attended: true },
  ];
};

// -------------------- الدوال الأخرى --------------------

/**
 * جلب مادة محددة بالـ ID
 */
export const getCourseById = async (courseId) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (courseSnap.exists()) {
      const courseData = courseSnap.data();
      const professorName = await extractProfessorName(courseData);
      
      return {
        id: courseSnap.id,
        ...courseData,
        professor: professorName,
        instructor: professorName,
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting course:", error);
    return null;
  }
};

/**
 * جلب بيانات لوحة التحكم (داشبورد) لطالب معين
 */
export const getCoursesForDashboard = async (studentId) => {
  const courses = await getCoursesForStudent(studentId);
  
  return courses.map(course => {
    const attendancePercent = calculateAttendancePercent(course.present, course.total);
    return {
      id: course.id,
      name: course.name,
      attendance: attendancePercent,  
      professor: course.professor,
      icon: course.icon,
    };
  });
};

/**
 * جلب بيانات صفحة المواد لطالب معين
 */
export const getCoursesForCoursesPage = async (studentId) => {
  const courses = await getCoursesForStudent(studentId);
  
  return courses.map(course => ({
    id: course.id,
    name: course.name,
    code: course.code,
    instructor: course.instructor,
    hours: course.hours,
    progress: course.progress,
  }));
};

/**
 * جلب بيانات الحضور لطالب معين
 */
export const getAttendanceData = async (studentId) => {
  const courses = await getCoursesForStudent(studentId);
  
  return courses.map(course => {
    const attendancePercent = calculateAttendancePercent(course.present, course.total);
    const absences = calculateAbsences(course.present, course.total);
    
    let status = 'Regular';
    if (absences === 0) status = 'Perfect';
    else if (absences <= 15) status = 'انذار اول';
    else if (absences <= 25) status = 'انذار ثاني';
    else status = 'حرمان';
    
    return {
      id: course.id,
      subject: course.name,
      present: course.present,
      total: course.total,
      absences: absences,
      percent: `${attendancePercent}%`,
      status: status,
    };
  });
};

/**
 * جلب بيانات الدرجات لطالب معين
 */
export const getGradesData = async (studentId) => {
  const courses = await getCoursesForStudent(studentId);
  
  return courses.map(course => {
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
      percentage: `${total}%`,
      status: getStatusFromGrade(total),
    };
  });
};

/**
 * جلب تفاصيل درجة مادة محددة لطالب معين
 */
export const getGradeDetails = async (studentId, courseId) => {
  const courses = await getCoursesForStudent(studentId);
  const course = courses.find(c => c.id === courseId);
  
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
};

/**
 * جلب الإحصائيات الكاملة لطالب معين
 */
export const getTotalStats = async (studentId) => {
  const courses = await getCoursesForStudent(studentId);
  
  if (courses.length === 0) {
    return {
      totalCourses: 0,
      totalLectures: 0,
      totalPresent: 0,
      totalAbsences: 0,
      averageAttendance: 0,
      perfectAttendance: 0,
      needingAttention: 0,
      averageGrade: 0,
    };
  }
  
  const totalLectures = courses.reduce((acc, course) => acc + course.total, 0);
  const totalPresent = courses.reduce((acc, course) => acc + course.present, 0);
  const totalAbsences = courses.reduce((acc, course) => acc + (course.total - course.present), 0);
  
  const totalGrades = courses.reduce((acc, course) => {
    return acc + course.grades.final + 
                course.grades.midterm + 
                course.grades.quiz1 + 
                course.grades.quiz2 + 
                course.grades.quiz3;
  }, 0);
  const averageGrade = courses.length > 0 ? (totalGrades / courses.length).toFixed(1) : 0;
  
  const perfectAttendance = courses.filter(c => c.present === c.total).length;
  
  const needingAttention = courses.filter(c => 
    (c.present / c.total) * 100 < 80
  ).length;
  
  return {
    totalCourses: courses.length,
    totalLectures,
    totalPresent,
    totalAbsences,
    averageAttendance: totalLectures > 0 ? ((totalPresent / totalLectures) * 100).toFixed(1) : 0,
    perfectAttendance,
    needingAttention,
    averageGrade,
  };
};

/**
 * جلب إحصائيات الدرجات لطالب معين
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

/**
 * جلب كل المواد (بدون فلترة بطالب) - للإدارة مثلاً
 */
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