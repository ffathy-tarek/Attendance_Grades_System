
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

export const coursesData = [
  { 
    id: 1, 
    name: "Software Engineering", 
    code: "CS303", 
    professor: "Dr. Sameh Ayad",
    instructor: "Dr. Sameh Ayad",
    icon: "🗃️",
    hours: 3,
    progress: 75,
    
    present: 22,
    total: 24,
    
    // نظام الدرجات
    grades: {
      final: 40,      // من 60
      midterm: 8,     // من 10
      quiz1: 9,       // من 10
      quiz2: 8,       // من 10
      quiz3: 7,       // من 10
      // total: 80    //هيتحسب تلقائي 
    },
    
    lectures: [
      { type: "Theory", topic: "LEC-1", date: "2026-03-01", attended: true },
      { type: "Lab", topic: "LAB-1", date: "2026-03-03", attended: true },
      { type: "Theory", topic: "LEC-2", date: "2026-03-05", attended: false },
      { type: "Lab", topic: "LAB-2", date: "2026-03-08", attended: true },
      { type: "Theory", topic: "LEC-3", date: "2026-03-10", attended: true },
      { type: "Lab", topic: "LAB-3", date: "2026-03-12", attended: true },
    ],
  },
  { 
    id: 2, 
    name: "Distributed Systems", 
    code: "CS317", 
    professor: "Dr. Hatem",
    instructor: "Dr. Hatem",
    icon: "⚙️",
    hours: 3,
    progress: 60,
    
    present: 23,
    total: 24,
    
    grades: {
      final: 52,
      midterm: 9,
      quiz1: 8,
      quiz2: 9,
      quiz3: 8,
    },
    
    lectures: [
      { type: "Theory", topic: "LEC-1", date: "2026-03-01", attended: true },
      { type: "Lab", topic: "LAB-1", date: "2026-03-03", attended: true },
      { type: "Theory", topic: "LEC-2", date: "2026-03-05", attended: false },
      { type: "Lab", topic: "LAB-2", date: "2026-03-08", attended: true },
      { type: "Theory", topic: "LEC-3", date: "2026-03-10", attended: true },
      { type: "Lab", topic: "LAB-3", date: "2026-03-12", attended: true },
    ],
  },
  { 
    id: 3, 
    name: "Operating Systems", 
    code: "CS306", 
    professor: "Dr. Hatem",
    instructor: "Dr. Hatem",
    icon: "💻",
    hours: 4,
    progress: 45,
    
    present: 24,
    total: 24,
    
    grades: {
      final: 55,
      midterm: 9,
      quiz1: 9,
      quiz2: 8,
      quiz3: 9,
    },
    
    lectures: [
      { type: "Theory", topic: "LEC-1", date: "2026-03-01", attended: true },
      { type: "Lab", topic: "LAB-1", date: "2026-03-03", attended: true },
      { type: "Theory", topic: "LEC-2", date: "2026-03-05", attended: false },
      { type: "Lab", topic: "LAB-2", date: "2026-03-08", attended: true },
      { type: "Theory", topic: "LEC-3", date: "2026-03-10", attended: true },
      { type: "Lab", topic: "LAB-3", date: "2026-03-12", attended: true },
    ],
  },
  { 
    id: 4, 
    name: "Algebra", 
    code: "MT-212", 
    professor: "Dr. Fatma & Dr.Nabila",
    instructor: "Dr. Fatma & Dr.Nabila",
    icon: "🧮",
    hours: 4,
    progress: 30,
    
    present: 20,
    total: 24,
    
    grades: {
      final: 45,
      midterm: 7,
      quiz1: 8,
      quiz2: 7,
      quiz3: 6,
    },
    
    lectures: [
      { type: "Theory", topic: "LEC-1", date: "2026-03-01", attended: true },
      { type: "Lab", topic: "LAB-1", date: "2026-03-03", attended: true },
      { type: "Theory", topic: "LEC-2", date: "2026-03-05", attended: false },
      { type: "Lab", topic: "LAB-2", date: "2026-03-08", attended: true },
      { type: "Theory", topic: "LEC-3", date: "2026-03-10", attended: true },
      { type: "Lab", topic: "LAB-3", date: "2026-03-12", attended: true },
    ],
  },
  { 
    id: 5, 
    name: "Files Structure", 
    code: "CS316", 
    professor: "Dr. Reem Ahmed",
    instructor: "Dr. Reem Ahmed",
    icon: "📁",
    hours: 3,
    progress: 50,
    
    present: 74,
    total: 100,
    
    grades: {
      final: 44,
      midterm: 6,
      quiz1: 7,
      quiz2: 7,
      quiz3: 6,
    },
    
   
    lectures: [
      { type: "Theory", topic: "LEC-1", date: "2026-03-01", attended: true },
      { type: "Lab", topic: "LAB-1", date: "2026-03-03", attended: true },
      { type: "Theory", topic: "LEC-2", date: "2026-03-05", attended: false },
      { type: "Lab", topic: "LAB-2", date: "2026-03-08", attended: true },
      { type: "Theory", topic: "LEC-3", date: "2026-03-10", attended: true },
      { type: "Lab", topic: "LAB-3", date: "2026-03-12", attended: true },
    ],
  },
  { 
    id: 6, 
    name: "Algorithms", 
    code: "CS305", 
    professor: "Dr. Rasha",
    instructor: "Dr. Rasha",
    icon: "🤖",
    hours: 3,
    progress: 65,
    
    present: 20,
    total: 25,
    
    grades: {
      final: 58,
      midterm: 10,
      quiz1: 9,
      quiz2: 9,
      quiz3: 9,
    },
    
   
    lectures: [
      { type: "Theory", topic: "LEC-1", date: "2026-03-01", attended: true },
      { type: "Lab", topic: "LAB-1", date: "2026-03-03", attended: true },
      { type: "Theory", topic: "LEC-2", date: "2026-03-05", attended: false },
      { type: "Lab", topic: "LAB-2", date: "2026-03-08", attended: true },
      { type: "Theory", topic: "LEC-3", date: "2026-03-10", attended: true },
      { type: "Lab", topic: "LAB-3", date: "2026-03-12", attended: true },
    ],
  },
];

export const getCourseById = (id) => {
  return coursesData.find(course => course.id === parseInt(id));
};


export const getCoursesForDashboard = () => {
  return coursesData.map(course => {
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


export const getCoursesForCoursesPage = () => {
  return coursesData.map(course => ({
    id: course.id,
    name: course.name,
    code: course.code,
    instructor: course.instructor,
    hours: course.hours,
    progress: course.progress,
  }));
};


export const getAttendanceData = () => {
  return coursesData.map(course => {
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


export const getGradesData = () => {
  return coursesData.map(course => {
  
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


export const getGradeDetails = (courseId) => {
  const course = getCourseById(courseId);
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


export const getTotalStats = () => {
  const totalLectures = coursesData.reduce((acc, course) => acc + course.total, 0);
  const totalPresent = coursesData.reduce((acc, course) => acc + course.present, 0);
  const totalAbsences = coursesData.reduce((acc, course) => acc + (course.total - course.present), 0);
  

  const totalGrades = coursesData.reduce((acc, course) => {
    return acc + course.grades.final + 
                course.grades.midterm + 
                course.grades.quiz1 + 
                course.grades.quiz2 + 
                course.grades.quiz3;
  }, 0);
  const averageGrade = (totalGrades / coursesData.length).toFixed(1);
  

  const perfectAttendance = coursesData.filter(c => c.present === c.total).length;
  

  const needingAttention = coursesData.filter(c => 
    (c.present / c.total) * 100 < 80
  ).length;
  
  return {
    totalCourses: coursesData.length,
    totalLectures,
    totalPresent,
    totalAbsences,
    averageAttendance: ((totalPresent / totalLectures) * 100).toFixed(1),
    perfectAttendance,
    needingAttention,
    averageGrade,
  };
};


export const getGradesStats = () => {
  const grades = getGradesData();
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


export const getAllCourses = () => {
  return coursesData.map(course => ({
    id: course.id,
    name: course.name,
    code: course.code,
    professor: course.professor,
    hours: course.hours,
  }));
};