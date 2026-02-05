import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/config";
import { Container, Form, Button, Card } from "react-bootstrap";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Error de autenticación");
    }
  };

  return (
    <Container className="login-wrapper">
      <Card className="login-card">
        <Card.Body>
          <div className="login-header">
            <div className="login-logo">CS</div>
            <div>
              <h2 className="login-title">Maternidad Villa Mercedes</h2>
              
            </div>
          </div>

          <Form onSubmit={handleLogin}>
            <Form.Group className="mb-3">
              <Form.Control
                type="email"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
                required
                autoComplete="username"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Control
                type="password"
                placeholder="Contraseña"
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Contraseña"
                required
                autoComplete="current-password"
              />
            </Form.Group>

            <Button type="submit" className="w-100 login-btn">
              Ingresar
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
