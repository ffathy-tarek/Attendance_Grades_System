
import Button from "../components/Button";
import Input from "../components/Input";
import Card from "../components/Card";

const Login = () => {
  return (
    <div className="container">
      <Card>
        <h1 className="title">Welcome Back</h1>
        <p className="subtitle">
          Login using your University ID
        </p>

        <Input
          label="University Code"
          placeholder="Enter your university code"
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
        />

        <Button type="submit">
          Login
        </Button>
      </Card>
    </div>
  );
};

export default Login;