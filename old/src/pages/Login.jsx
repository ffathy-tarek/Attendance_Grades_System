import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import Input from "../components/Input";
import Card from "../components/Card";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="container">
      <Card>
        <h1 className="title">Welcome Back</h1>
        <p className="subtitle">Login using your University Email</p>

        <Input
          label="Email"
          placeholder="Ex: ****@std.sci.edu.eg"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password "
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
    <button
          type="button"
          onClick={handleLogin}
          style={{
            padding: "10px 20px",
            backgroundColor: "#110a96",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            width: "100%",
            marginTop: "-10px",
          }}

         onMouseEnter={(e) => (e.target.style.backgroundColor = "#3730a3")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#110a96")}
        
        >
          
          Log-in
        </button>

       
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
          <button
            type="button"
            onClick={() => navigate("/forget-password")}
            style={{
              background: "none",
              border: "none",
              color: "#110a96",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "0.9rem",
            }}
          >
            Forgot Password?
          </button>

          <button
            type="button"
            onClick={() => navigate("/request-email")}
            style={{
              background: "none",
              border: "none",
              color: "#110a96",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "0.9rem",
            }}
          >
            Request Email
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Login;