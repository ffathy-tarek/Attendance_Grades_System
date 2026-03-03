import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

import Card from "../components/Card";
import Input from "../components/Input";

const RequestEmail = () => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [role, setRole] = useState("Student");

  const handleNumbersOnly = (e, setter) => {
    const value = e.target.value.replace(/\D/g, "");
    setter(value);
  };

  const handleLettersOnly = (e, setter) => {
    const value = e.target.value.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, "");
    setter(value);
  };

  const handleSend = async () => {
    if (!name || !email || !nationalId || (role === "Student" && !code)) {
      alert("Please fill all required fields");
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email");
      return;
    }

    try {
      await addDoc(collection(db, "emailRequests"), {
        name,
        code: role === "Student" ? code : "",
        email,
        nationalId,
        role,
        createdAt: new Date(),
      });

      alert("Thank you, we will send your sign-in info to your email soon");

      
      setName("");
      setCode("");
      setEmail("");
      setNationalId("");
      setRole("Student");
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
        <h1 className="title" style={{ marginBottom: "10px", color: "#110a96" }}>
          Request Email
        </h1>
        <p className="subtitle" style={{ marginBottom: "25px", color: "#555" }}>
          Enter your details to request your email
        </p>

        <Input
          label="Name"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => handleLettersOnly(e, setName)}
        />

       
        {role === "Student" && (
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
            role === "Student"
              ? "Ex (***@std.sci.cu.edu.eg)"
              : "Ex (@sci.cu.edu.eg)"
          }
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="National ID-14 Digits"
          placeholder="Enter your national ID"
          value={nationalId}
          onChange={(e) => handleNumbersOnly(e, setNationalId)}
        />

 
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "15px", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setRole("Student")}
            style={{
              flex: 1,
              padding: "12px 20px",
              backgroundColor: role === "Student" ? "#110a96" : "#e0e0e0",
              color: role === "Student" ? "white" : "#555",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) => {
              if (role !== "Student") e.target.style.backgroundColor = "#d1d1d1";
            }}
            onMouseLeave={(e) => {
              if (role !== "Student") e.target.style.backgroundColor = "#e0e0e0";
            }}
          >
            Student
          </button>

          <button
            type="button"
            onClick={() => setRole("Instructor")}
            style={{
              flex: 1,
              padding: "12px 20px",
              backgroundColor: role === "Instructor" ? "#110a96" : "#e0e0e0",
              color: role === "Instructor" ? "white" : "#555",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) => {
              if (role !== "Instructor") e.target.style.backgroundColor = "#d1d1d1";
            }}
            onMouseLeave={(e) => {
              if (role !== "Instructor") e.target.style.backgroundColor = "#e0e0e0";
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
            transition: "background-color 0.3s",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#3730a3")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#110a96")}
        >
          Send
        </button>
      </Card>
    </div>
  );
};

export default RequestEmail;
