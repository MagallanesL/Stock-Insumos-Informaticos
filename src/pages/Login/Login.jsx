import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Alert, Button, Card, Container, Form } from "react-bootstrap";
import { auth } from "../../firebase/config";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      setErrorMsg("No se pudo iniciar sesión. Revisá email y contraseña.");
    } finally {
      setLoading(false);
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
              <p className="login-subtitle">
                Gestión simple de stock y movimientos de insumos.
              </p>
            </div>
          </div>

          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

          <Form onSubmit={handleLogin}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="usuario@institucion.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
                required
                autoComplete="username"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                placeholder="Ingresá tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Contraseña"
                required
                autoComplete="current-password"
              />
            </Form.Group>

            <Button type="submit" className="w-100 login-btn" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
