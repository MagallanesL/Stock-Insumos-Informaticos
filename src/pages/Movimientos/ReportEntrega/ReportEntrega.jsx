import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import {
  Container,
  Table,
  Badge,
  Spinner,
} from "react-bootstrap";

const ReporteEntregas = () => {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEntregas = async () => {
    const q = query(
      collection(db, "movimientos"),
      orderBy("fechaEntrega", "desc")
    );

    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setEntregas(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntregas();
  }, []);

  const formatFecha = (timestamp) => {
    if (!timestamp?.toDate) return "-";
    const date = timestamp.toDate();

    return {
      fecha: date.toLocaleDateString("es-AR"),
      hora: date.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
        <div className="mt-2 text-muted">
          Cargando reporte de entregas...
        </div>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      {/* Encabezado */}
      <div className="mb-4">
        <h3 className="mb-0">Reporte de Entregas</h3>
        <small className="text-muted">
          Historial de insumos entregados con detalle administrativo
        </small>
      </div>

      <Table
        bordered
        hover
        responsive
        className="align-middle shadow-sm"
      >
        <thead className="table-dark">
          <tr>
            <th>Fecha</th>
            <th>Insumo</th>
            <th>Cantidad</th>
            <th>Servicio</th>
            <th>Retira</th>
            <th>DNI</th>
            <th>Registrado por</th>
          </tr>
        </thead>

        <tbody>
          {entregas.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center text-muted py-4">
                No hay entregas registradas
              </td>
            </tr>
          ) : (
            entregas.map((e) => {
              const fecha = formatFecha(e.fechaEntrega);

              return (
                <tr key={e.id}>
                  {/* Fecha */}
                  <td>
                    <div>
                      <strong>{fecha.fecha}</strong>
                    </div>
                    <small className="text-muted">
                      {fecha.hora}
                    </small>
                  </td>

                  {/* Insumo */}
                  <td>
                    <div className="fw-semibold">{e.tipo}</div>
                    <small className="text-muted">
                      {e.marca} · {e.modelo}
                    </small>
                  </td>

                  {/* Cantidad */}
                  <td>
                    <Badge bg="primary" pill className="px-3 py-2">
                      {e.cantidad}
                    </Badge>
                  </td>

                  {/* Servicio */}
                  <td>{e.servicio}</td>

                  {/* Persona */}
                  <td>{e.persona}</td>

                  {/* DNI */}
                  <td>{e.dni}</td>

                  {/* Usuario */}
                  <td className="text-muted small">
                    {e.usuario}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>
    </Container>
  );
};

export default ReporteEntregas;
