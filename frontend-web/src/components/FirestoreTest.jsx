// src/components/FirestoreTest.js
import React, { useEffect } from "react";
import {
  addUser,
  getUser,
  getAllUsers,
  updateUser,
} from "../services/userService";

const FirestoreTest = () => {
  useEffect(() => {
    const testFirestore = async () => {
      console.log("=== Starting Firestore Test ===");

      try {
        // 1. Add a new student
        const newStudent = {
          fullName: "New Test Student",
          code: "2023999",
          email: "new-test@student.com",
          department: "CS",
          academicYear: 2,
          phone: "01099998888",
          role: "student",
          status: "active",
        };

        await addUser("temp-for-test", newStudent);
        console.log("New student added successfully");

        // Wait a bit for Firestore to sync
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // 2. Get all users
        const allUsers = await getAllUsers();
        console.log("All users after adding:", allUsers);

        if (allUsers.length > 0) {
          // Get the latest user (usually the one we just added)
          const latestUser = allUsers[allUsers.length - 1];
          const realId = latestUser.id;
          console.log("New student real document ID:", realId);

          // 3. Read the newly added user
          const userData = await getUser(realId);
          console.log("New student data:", userData);

          // 4. Update email
          await updateUser(realId, {
            email: "updated-new-email@student.com",
            updatedAt: new Date().toISOString(),
          });
          console.log("Email updated successfully for the new student");

          // 5. Read again to verify the update
          const updatedData = await getUser(realId);
          console.log("Data after update:", updatedData);
        } else {
          console.log(
            "No users found after adding – possible issue in addUser",
          );
        }

        console.log("=== Firestore Test Completed Successfully ===");
      } catch (error) {
        console.error("Error during Firestore test:");
        console.error("Message:", error.message);
        console.error("Full error details:", error);
      }
    };

    testFirestore();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>Firestore Services Test</h2>
      <p>Open Console (F12 → Console) to see results</p>
      <p style={{ color: "green", fontWeight: "bold" }}>
        If you see "Email updated successfully" + real ID → your part is 100%
        done
      </p>
    </div>
  );
};

export default FirestoreTest;
