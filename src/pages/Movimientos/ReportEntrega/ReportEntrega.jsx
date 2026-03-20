import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Badge,
  Button,
  Container,
  Form,
  InputGroup,
  Spinner,
  Table,
} from "react-bootstrap";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { db } from "../../../firebase/config";

const formatTimestamp = (timestamp) => {
  if (!timestamp) {
    return { fecha: "-", hora: "-" };
  }

  const date =
    typeof timestamp?.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return { fecha: "-", hora: "-" };
  }

  return {
    fecha: date.toLocaleDateString("es-AR"),
    hora: date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const matchesDateRange = (timestamp, from, to) => {
  if (!from && !to) {
    return true;
  }

  const date =
    typeof timestamp?.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T00:00:00`) : null;

  if (fromDate && dateOnly < fromDate) {
    return false;
  }

  if (toDate && dateOnly > toDate) {
    return false;
  }

  return true;
};

const ReporteEntregas = () => {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    (async () => {
      const reportQuery = query(
        collection(db, "movimientos"),
        orderBy("fechaEntrega", "desc")
      );
      const snapshot = await getDocs(reportQuery);

      if (active) {
        setEntregas(
          snapshot.docs.map((itemDoc) => ({
            id: itemDoc.id,
            ...itemDoc.data(),
          }))
        );
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const serviceOptions = useMemo(() => {
    return Array.from(
      new Set(entregas.map((item) => item.servicio).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [entregas]);

  const filteredEntregas = useMemo(() => {
    const term = search.trim().toLowerCase();

    return entregas.filter((item) => {
      const text =
        `${item.tipo} ${item.modelo} ${item.marca} ${item.servicio} ${item.persona} ${item.dni} ${item.usuario}`.toLowerCase();
      const matchesText = !term || text.includes(term);
      const matchesService = !serviceFilter || item.servicio === serviceFilter;
      const matchesDates = matchesDateRange(
        item.fechaEntrega || item.fecha,
        fromDate,
        toDate
      );

      return matchesText && matchesService && matchesDates;
    });
  }, [entregas, fromDate, search, serviceFilter, toDate]);

  const summary = useMemo(() => {
    return filteredEntregas.reduce(
      (acc, item) => {
        acc.totalMovimientos += 1;
        acc.totalUnidades += Number(item.cantidad || 0);
        return acc;
      },
      { totalMovimientos: 0, totalUnidades: 0 }
    );
  }, [filteredEntregas]);

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
        <div className="mt-2 text-muted">Cargando reporte de entregas...</div>
      </Container>
    );
  }

  return (
    <Container className="mt-4 report-page">
      <div className="report-header">
        <div>
          <p className="eyebrow">Seguimiento administrativo</p>
          <h2 className="stock-title">Reporte de movimientos</h2>
          <p className="stock-subtitle">
            Filtrá por fecha, servicio o persona para controlar entregas más
            rápido.
          </p>
        </div>

        <Button className="btn-reportes" onClick={() => navigate(-1)}>
          <FaArrowLeft className="btn-icon" /> Volver
        </Button>
      </div>

      <div className="stock-summary-grid report-summary-grid">
        <article className="summary-card">
          <span>Movimientos</span>
          <strong>{summary.totalMovimientos}</strong>
          <small>Filtrados</small>
        </article>
        <article className="summary-card">
          <span>Unidades</span>
          <strong>{summary.totalUnidades}</strong>
          <small>Entregadas</small>
        </article>
      </div>

      <section className="report-filters">
        <InputGroup className="stock-search">
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>
          <Form.Control
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por insumo, persona, DNI o usuario"
          />
        </InputGroup>

        <div className="report-filter-grid">
          <Form.Select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="">Todos los servicios</option>
            {serviceOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Form.Select>

          <Form.Control
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <Form.Control
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </section>

      <Table bordered hover responsive className="align-middle shadow-sm report-table">
        <thead className="table-dark">
          <tr>
            <th>Fecha</th>
            <th>Movimiento</th>
            <th>Insumo</th>
            <th>Cantidad</th>
            <th>Servicio</th>
            <th>Retira</th>
            <th>DNI</th>
            <th>Usuario</th>
          </tr>
        </thead>

        <tbody>
          {filteredEntregas.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center text-muted py-4">
                No hay movimientos con los filtros seleccionados.
              </td>
            </tr>
          ) : (
            filteredEntregas.map((item) => {
              const fecha = formatTimestamp(item.fechaEntrega || item.fecha);
              const movementType = item.tipoMovimiento || "SALIDA";

              return (
                <tr key={item.id}>
                  <td>
                    <div>
                      <strong>{fecha.fecha}</strong>
                    </div>
                    <small className="text-muted">{fecha.hora}</small>
                  </td>

                  <td>
                    <Badge
                      bg={movementType === "AJUSTE" ? "warning" : "primary"}
                      text={movementType === "AJUSTE" ? "dark" : undefined}
                    >
                      {movementType}
                    </Badge>
                  </td>

                  <td>
                    <div className="fw-semibold">{item.tipo}</div>
                    <small className="text-muted">
                      {item.marca || "Sin marca"} · {item.modelo}
                    </small>
                  </td>

                  <td>
                    <Badge bg="primary" pill className="px-3 py-2">
                      {item.cantidad ?? item.diferencia ?? 0}
                    </Badge>
                  </td>

                  <td>{item.servicio || "-"}</td>
                  <td>{item.persona || "-"}</td>
                  <td>{item.dni || "-"}</td>
                  <td className="text-muted small">{item.usuario || "-"}</td>
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
