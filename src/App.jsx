import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/Login";
import Stock from "./pages/Stock/Stock";
import Movimientos from "./pages/Movimientos/vistaStock/VistaStock";
import ReportEntrega from "./pages/Movimientos/ReportEntrega/ReportEntrega";
import { useAuth } from "./context/Authcontext/AuthContex";

const App = () => {
  const { user, loading, role } = useAuth();

  if (loading) {
    return null; // o spinner
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
