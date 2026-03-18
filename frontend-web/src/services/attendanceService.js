import { db } from "../firebase"; 
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  serverTimestamp,
  deleteDoc 
} from "firebase/firestore";

//  Check if student already registered for this session
export const isAlreadyRegistered = async (sessionId, studentId) => {
    const q = query(
        collection(db, "attendance"),
        where("sessionId", "==", sessionId),
        where("studentId", "==", studentId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
};

//  Main Register Function with Validations
export const registerStudentAttendance = async (attendanceData) => {
    try {
        const { sessionId, studentId } = attendanceData;

        // Validation: Prevent Duplicate Attendance
        const duplicated = await isAlreadyRegistered(sessionId, studentId);
        if (duplicated) {
            throw new Error("Attendance already recorded in this session.");
        }

        // Validation: Check Session Status (Must be active)
        const sessionRef = doc(db, "lecture_sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);
        
        if (!sessionSnap.exists()) {
            throw new Error("Lecture session not found.");
        }

        if (sessionSnap.data().status !== "active") {
            throw new Error("This attendance session is no longer active.");
        }

        // Execution: Create record
        const docRef = await addDoc(collection(db, "attendance"), {
            ...attendanceData,
            recordedAt: serverTimestamp(),
        });

        return { success: true, id: docRef.id };

    } catch (error) {
        console.error("Attendance Service Error:", error.message);
        throw error; 
    }
};

//  Delete Attendance (For Instructor)
export const deleteAttendanceRecord = async (recordId) => {
    try {
        const recordRef = doc(db, "attendance", recordId);
        await deleteDoc(recordRef);
        return { success: true };
    } catch (error) {
        console.error("Delete Attendance Error:", error.message);
        throw new Error("Failed to delete attendance record.");
    }
};