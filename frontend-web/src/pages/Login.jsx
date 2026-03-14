import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // استيراد دوال الفايرستور
import { auth, db } from "../firebase"; // تأكد من استيراد db
import Input from "../components/Input";
import Card from "../components/Card";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // لحالة التحميل

  const handleLogin = async () => {
    if (!email || !password) return alert("Please fill all fields");
    
    setLoading(true);
    try {
      // 1. تسجيل الدخول بالـ Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. جلب بيانات الـ Role من Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;

        // 3. التوجيه الذكي بناءً على الرول
        if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } else {
        alert("User data not found in database.");
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Card>
        <h1 className="title">Welcome Back</h1>
        <p className="subtitle">Login using your University Email</p>

        <Input
          label="Email"
          placeholder="Ex: ---@---.sci.edu.eg"
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
          disabled={loading} // تعطيل الزرار وقت التحميل
          onClick={handleLogin}
          style={{
            padding: "10px 20px",
            backgroundColor: loading ? "#94A3B8" : "#110a96",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
            marginTop: "-10px",
          }}
          onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = "#3730a3")}
          onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = "#110a96")}
        >
          {loading ? "Logging in..." : "Log-in"}
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