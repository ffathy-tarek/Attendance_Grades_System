import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
           
            setUser({ 
              uid: currentUser.uid, 
              email: currentUser.email,
             
              fullName: userData.fullName || userData.name || "User",
              name: userData.fullName || userData.name || "User",
              code: userData.code || userData.studentId || "",
              department: userData.department || "Not Available",
              level: userData.academicYear || userData.level || "",
              academicYear: userData.academicYear || userData.level || "", 
              phone: userData.phone || "",
              profileImage: userData.profileImageUrl || userData.profileImage || null,
              role: userData.role || "student",
             
              ...userData 
            });
          } else {
           
            setUser({ 
              uid: currentUser.uid, 
              email: currentUser.email,
              name: currentUser.displayName || "User",
              role: "student" 
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser({ 
            uid: currentUser.uid, 
            email: currentUser.email,
            name: currentUser.displayName || "User" 
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

 
  const updateUserData = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser(prev => ({
          ...prev,
          ...userData,
          fullName: userData.fullName || userData.name || prev?.name || "User",
          name: userData.fullName || userData.name || prev?.name || "User",
          code: userData.code || userData.studentId || prev?.code || "",
          profileImage: userData.profileImageUrl || userData.profileImage || prev?.profileImage,
        }));
      }
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      updateUserData 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};