import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Container, Spinner } from "react-bootstrap";
import Login from "./pages/Login/Login";
import Stock from "./pages/Stock/Stock";
import Movimientos from "./pages/Movimientos/vistaStock/VistaStock";
import ReportEntrega from "./pages/Movimientos/ReportEntrega/ReportEntrega";
import { useAuth } from "./context/Authcontext/useAuth";

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Container className="app-loading">
        <Spinner animation="border" variant="primary" />
        <p className="app-loading-text">Cargando datos de sesión...</p>
      </Container>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login />}
        />

        <Route
          path="/"
          element={user ? <Stock /> : <Navigate to="/login" />}
        />

        <Route
          path="/movimientos"
          element={user ? <Movimientos /> : <Navigate to="/login" />}
        />

        <Route
          path="/reportes/entregas"
          element={user ? <ReportEntrega /> : <Navigate to="/login" />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
