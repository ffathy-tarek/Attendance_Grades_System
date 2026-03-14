import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

import Card from "../components/Card";
import Input from "../components/Input";

const RequestEmail = () => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [role, setRole] = useState("student"); // lowercase

  const handleNumbersOnly = (e, setter) => {
    const value = e.target.value.replace(/\D/g, "");
    setter(value);
  };

  const handleLettersOnly = (e, setter) => {
    const value = e.target.value.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, "");
    setter(value);
  };

  const handleSend = async () => {
    if (!name || !email || !nationalId || (role === "student" && !code)) {
      alert("Please fill all required fields");
      return;
    }

    if (nationalId.length !== 14) {
      alert("National ID must be 14 digits");
      return;
    }

    let emailRegex;

    if (role === "student") {
      emailRegex = /^[a-zA-Z0-9._%+-]+@std\.sci\.cu\.edu\.eg$/;
    } else {
      emailRegex = /^[a-zA-Z0-9._%+-]+@sci\.cu\.edu\.eg$/;
    }

    if (!emailRegex.test(email)) {
      alert(
        role === "student"
          ? "Email must be like: name@std.sci.cu.edu.eg"
          : "Email must be like: name@sci.cu.edu.eg"
      );
      return;
    }

    try {
      await addDoc(collection(db, "emailRequests"), {
        name,
        code: role === "student" ? code : "",
        email,
        nationalId,
        role, // student or instructor
        status: "pending", // new field
        createdAt: serverTimestamp(), // server time
      });

      alert("Thank you, Request sent successfully.");

      setName("");
      setCode("");
      setEmail("");
      setNationalId("");
      setRole("student");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        padding: "20px",
      }}
    >
      <Card
        style={{
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h1 style={{ marginBottom: "10px", color: "#110a96" }}>
          Request Email
        </h1>

        <p style={{ marginBottom: "25px", color: "#555" }}>
          Enter your details to request your email
        </p>

        <Input
          label="Name"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => handleLettersOnly(e, setName)}
        />

        {role === "student" && (
          <Input
            label="Code"
            placeholder="Enter your code"
            value={code}
            onChange={(e) => handleNumbersOnly(e, setCode)}
          />
        )}

        <Input
          label="Email"
          placeholder={
            role === "student"
              ? "Ex (***@std.sci.cu.edu.eg)"
              : "Ex (@sci.cu.edu.eg)"
          }
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="National ID - 14 Digits"
          placeholder="Enter your national ID"
          value={nationalId}
          onChange={(e) => handleNumbersOnly(e, setNationalId)}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "15px",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={() => setRole("student")}
            style={{
              flex: 1,
              padding: "12px 20px",
              backgroundColor:
                role === "student" ? "#110a96" : "#e0e0e0",
              color: role === "student" ? "white" : "#555",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Student
          </button>

          <button
            type="button"
            onClick={() => setRole("instructor")}
            style={{
              flex: 1,
              padding: "12px 20px",
              backgroundColor:
              role === "instructor" ? "#110a96" : "#e0e0e0",
              color: role === "instructor" ? "white" : "#555",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Instructor
          </button>
        </div>

        <button
          type="button"
          onClick={handleSend}
          style={{
            padding: "12px 20px",
            backgroundColor: "#110a96",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            width: "100%",
            marginTop: "20px",
            fontWeight: "bold",
          }}
        >
          Send
        </button>
      </Card>
    </div>
  );
};

export default RequestEmail;