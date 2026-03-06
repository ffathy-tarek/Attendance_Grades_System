// src/services/userService.js
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

// Add a new user with basic validation
export const addUser = async (uid, userData) => {
  try {
    if (!userData.fullName || !userData.code) {
      throw new Error("Full name and code are required");
    }

    const docRef = await addDoc(collection(db, "users"), {
      uid: uid,
      fullName: userData.fullName,
      code: userData.code,
      email: userData.email || "",
      department: userData.department || "",
      academicYear: userData.academicYear || null,
      phone: userData.phone || "",
      role: userData.role || "student",
      status: userData.status || "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("User added successfully - Document ID:", docRef.id);
    return docRef.id; // Return the real generated ID
  } catch (error) {
    console.error("Error adding user:", error.message || error);
    throw error;
  }
};

// Get a single user by ID
export const getUser = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      console.log(`User data retrieved: ${data.fullName} (${data.role})`);
      return data;
    } else {
      console.log(`No user found with ID: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user:", error.message || error);
    return null;
  }
};

// Get all users
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log(`Retrieved ${users.length} users`);
    return users;
  } catch (error) {
    console.error("Error fetching all users:", error.message || error);
    return [];
  }
};

// Update a user
export const updateUser = async (userId, updatedData) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });
    console.log(`User updated successfully: ${userId}`);
  } catch (error) {
    console.error("Error updating user:", error.message || error);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    await deleteDoc(userRef);
    console.log(`User deleted successfully: ${userId}`);
  } catch (error) {
    console.error("Error deleting user:", error.message || error);
    throw error;
  }
};
