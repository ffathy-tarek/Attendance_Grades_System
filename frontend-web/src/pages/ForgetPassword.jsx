import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

import Card from "../components/Card";
import Input from "../components/Input";

const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

 
  const handleNumbersOnly = (e, setter) => {
    const value = e.target.value.replace(/\D/g, "");
    setter(value);
  };

  const handleSend = async () => {
   
    if (!email || !nationalId || !mobileNumber) {
      alert("Please fill all fields");
      return;
    }

  
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email");
      return;
    }

    try {

      await addDoc(collection(db, "passwordRequests"), {
        email,
        nationalId,
        mobileNumber,
        createdAt: new Date(),
      });

      alert("We will send your new password to your email :)");

    
      setEmail("");
      setNationalId("");
      setMobileNumber("");

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
          Forgot Password
        </h1>

        <p className="subtitle" style={{ marginBottom: "25px", color: "#555" }}>
          Enter your details to reset password
        </p>

        <Input
          label="Email"
          placeholder="Ex: ****@std.sci.edu.eg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="National ID-14 Digits"
          placeholder="Enter your national ID"
          value={nationalId}
          onChange={(e) => handleNumbersOnly(e, setNationalId)}
        />

        <Input
          label="Mobile Number"
          placeholder="Ex:+201*********"
          value={mobileNumber}
          onChange={(e) => handleNumbersOnly(e, setMobileNumber)}
        />

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
            marginTop: "3px",
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

export default ForgetPassword;

