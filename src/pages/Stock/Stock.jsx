import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  Badge,
  Button,
  Container,
  Form,
  InputGroup,
  Modal,
  Toast,
} from "react-bootstrap";
import {
  FaBoxOpen,
  FaClipboardList,
  FaEdit,
  FaPlus,
  FaSearch,
  FaSignOutAlt,
  FaTruck,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import AddStock from "./AddStock";
import EntregarInsumo from "../Movimientos/GiveInsumo/GiveInsumo";
import { auth, db } from "../../firebase/config";
import { useAuth } from "../../context/Authcontext/useAuth";
import {
  groupStockByType,
  LOW_STOCK_THRESHOLD,
  matchesSearch,
} from "../../utils/inventory";
import "../Movimientos/vistaStock/VistaStock.css";

const FILTER_OPTIONS = [
  { id: "all", label: "Todo" },
  { id: "low", label: "Bajo stock" },
  { id: "out", label: "Sin stock" },
  { id: "available", label: "Disponibles" },
];

const formatTimestamp = (value) => {
  if (!value) {
    return "Sin movimientos";
  }

  const date =
    typeof value?.toDate === "function" ? value.toDate() : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin movimientos";
  }

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Stock = () => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showEntrega, setShowEntrega] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editCantidad, setEditCantidad] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [openTypes, setOpenTypes] = useState({});

  const { role, user } = useAuth();
  const navigate = useNavigate();

  const fetchStock = async () => {
    setLoading(true);

    try {
      const stockQuery = query(collection(db, "insumos"), orderBy("type"));
      const snapshot = await getDocs(stockQuery);
      const data = snapshot.docs.map((stockDoc) => ({
        id: stockDoc.id,
        ...stockDoc.data(),
      }));

      setStock(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    (async () => {
      const stockQuery = query(collection(db, "insumos"), orderBy("type"));
      const snapshot = await getDocs(stockQuery);

      if (active) {
        setStock(
          snapshot.docs.map((stockDoc) => ({
            id: stockDoc.id,
            ...stockDoc.data(),
          }))
        );
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setToastMsg("Sesión cerrada");
      setShowToast(true);
      navigate("/login");
    } catch (error) {
      console.error("Error closing session:", error);
      setToastMsg("Error cerrando sesión");
      setShowToast(true);
    }
  };

  const summary = useMemo(() => {
    const totalUnidades = stock.reduce(
      (sum, item) => sum + Number(item.cantidad || 0),
      0
    );
    const lowStockItems = stock.filter(
      (item) =>
        Number(item.cantidad || 0) > 0 &&
        Number(item.cantidad || 0) <= LOW_STOCK_THRESHOLD
    ).length;
    const outOfStockItems = stock.filter(
      (item) => Number(item.cantidad || 0) === 0
    ).length;

    return {
      totalItems: stock.length,
      totalTipos: new Set(stock.map((item) => item.type || "Sin tipo")).size,
      totalUnidades,
      lowStockItems,
      outOfStockItems,
    };
  }, [stock]);

  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      const cantidad = Number(item.cantidad || 0);
      const matchesQuickFilter =
        quickFilter === "all" ||
        (quickFilter === "low" &&
          cantidad > 0 &&
          cantidad <= LOW_STOCK_THRESHOLD) ||
        (quickFilter === "out" && cantidad === 0) ||
        (quickFilter === "available" && cantidad > 0);

      return matchesQuickFilter && matchesSearch(item, search);
    });
  }, [quickFilter, search, stock]);

  const grouped = useMemo(
    () => groupStockByType(filteredStock),
    [filteredStock]
  );

  const types = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditCantidad(String(item.cantidad ?? ""));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCantidad("");
  };

  const toggleType = (type) => {
    setOpenTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const saveEdit = async (item) => {
    const nuevaCantidad = Number(editCantidad);
    if (Number.isNaN(nuevaCantidad) || nuevaCantidad < 0) {
      setToastMsg("Ingresá una cantidad válida");
      setShowToast(true);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const insumoRef = doc(db, "insumos", item.id);
        const movimientoRef = doc(collection(db, "movimientos"));
        const insumoSnap = await transaction.get(insumoRef);
        const cantidadActual = Number(insumoSnap.data()?.cantidad || 0);
        const diferencia = nuevaCantidad - cantidadActual;

        transaction.update(insumoRef, {
          cantidad: nuevaCantidad,
          updatedAt: Timestamp.now(),
          updatedBy: user?.email || "admin",
        });

        transaction.set(movimientoRef, {
          tipo: item.type,
          modelo: item.modelo,
          marca: item.marca,
          tipoMovimiento: "AJUSTE",
          cantidadAnterior: cantidadActual,
          cantidadNueva: nuevaCantidad,
          diferencia,
          motivo: "Ajuste manual de stock",
          usuario: user?.email || "admin",
          fecha: Timestamp.now(),
          createdAt: Timestamp.now(),
        });
      });

      setToastMsg("Stock actualizado correctamente");
      setShowToast(true);
      cancelEdit();
      await fetchStock();
    } catch (error) {
      console.error(error);
      setToastMsg("No se pudo actualizar el stock");
      setShowToast(true);
    }
  };

  return (
    <Container className="mt-4 stock-page">
      <header className="top-navbar">
        <div className="top-navbar-brand">
          <p className="eyebrow">Control de insumos</p>
          
        </div>

        <nav className="header-controls">
          {role === "admin" && (
            <>
              <Button
                className="btn-agregar nav-button"
                onClick={() => setShowAddStock(true)}
              >
                <FaPlus className="btn-icon" /> Agregar insumo
              </Button>
              <Button
                className="btn-entregar nav-button"
                onClick={() => setShowEntrega(true)}
              >
                <FaTruck className="btn-icon" /> Registrar entrega
              </Button>
            </>
          )}

          <Button
            className="btn-reportes nav-button"
            onClick={() => navigate("/reportes/entregas")}
          >
            <FaClipboardList className="btn-icon" /> Ver reportes
          </Button>

          <Button
            className="btn-logout icon-only-button"
            onClick={logout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <FaSignOutAlt />
          </Button>
        </nav>
      </header>

      <div className="stock-summary-grid">
        <article className="summary-card">
          <span>Ítems</span>
          <strong>{summary.totalItems}</strong>
          <small>Registros cargados</small>
        </article>
        <article className="summary-card">
          <span>Tipos</span>
          <strong>{summary.totalTipos}</strong>
          <small>Categorías activas</small>
        </article>
        <article className="summary-card">
          <span>Unidades</span>
          <strong>{summary.totalUnidades}</strong>
          <small>Stock total</small>
        </article>
        <article className="summary-card summary-card-alert">
          <span>Críticos</span>
          <strong>{summary.lowStockItems}</strong>
          <small>{summary.outOfStockItems} sin stock</small>
        </article>
      </div>

      <section className="stock-toolbar">
        <InputGroup className="stock-search">
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>
          <Form.Control
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por tipo, modelo o marca"
          />
        </InputGroup>

        <div className="stock-filter-chips">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`filter-chip ${
                quickFilter === filter.id ? "active" : ""
              }`}
              onClick={() => setQuickFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <div className="stock-results-bar">
        <span>
          {filteredStock.length} resultado(s)
          {search ? ` para "${search}"` : ""}
        </span>
        {(search || quickFilter !== "all") && (
          <button
            type="button"
            className="link-reset"
            onClick={() => {
              setSearch("");
              setQuickFilter("all");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="stock-empty">Cargando stock...</div>
      ) : filteredStock.length === 0 ? (
        <div className="stock-empty">
          No hay insumos que coincidan con la búsqueda o los filtros.
        </div>
      ) : (
        <div className="stock-types">
          {types.map((type) => {
            const items = grouped[type];
            const totalQty = items.reduce(
              (sum, item) => sum + Number(item.cantidad || 0),
              0
            );
            const expanded =
              Boolean(search) ||
              quickFilter !== "all" ||
              Boolean(openTypes[type]);

            return (
              <div key={type} className="stock-type-card mb-3">
                <div className="stock-type-header">
                  <div className="d-flex align-items-center gap-3">
                    <button
                      type="button"
                      className="type-toggle"
                      onClick={() => toggleType(type)}
                      aria-expanded={expanded}
                    >
                      {expanded ? "▾" : "▸"}
                    </button>

                    <div>
                      <h5 className="mb-0">{type}</h5>
                      <small className="text-muted">
                        {items.length} modelos, {totalQty} unidades
                      </small>
                    </div>
                  </div>

                  <div className="stock-type-meta">
                    <span>{items.length} ítems</span>
                    <span>
                      {
                        items.filter(
                          (item) =>
                            Number(item.cantidad || 0) > 0 &&
                            Number(item.cantidad || 0) <= LOW_STOCK_THRESHOLD
                        ).length
                      }{" "}
                      críticos
                    </span>
                  </div>
                </div>

                {expanded && (
                  <div className="stock-type-body p-3">
                    <div className="stock-grid row g-3">
                      {items.map((item) => {
                        const cantidad = Number(item.cantidad || 0);
                        const lowStock =
                          cantidad > 0 && cantidad <= LOW_STOCK_THRESHOLD;
                        const sinStock = cantidad === 0;

                        return (
                          <div
                            key={item.id}
                            className="col-12 col-sm-6 col-xl-4"
                          >
                            <div
                              className={`stock-card p-3 h-100 d-flex flex-column ${
                                lowStock || sinStock ? "stock-card-low" : ""
                              }`}
                            >
                              <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                                <div>
                                  <div className="stock-item-type">
                                    <FaBoxOpen /> {item.type}
                                  </div>
                                  <div className="model fw-600">
                                    {item.modelo}
                                  </div>
                                  <div className="brand text-muted small">
                                    {item.marca || "Sin marca"}
                                  </div>
                                </div>

                                <div className="text-end qty">
                                  {sinStock && (
                                    <Badge bg="dark" className="stock-badge-low">
                                      Sin stock
                                    </Badge>
                                  )}
                                  {lowStock && (
                                    <Badge
                                      bg="danger"
                                      className="stock-badge-low d-block mb-1"
                                    >
                                      Bajo
                                    </Badge>
                                  )}
                                  <div className="fs-4 fw-600">{cantidad}</div>
                                </div>
                              </div>

                              <div className="stock-card-meta">
                                <span>
                                  Última actualización:{" "}
                                  {formatTimestamp(
                                    item.updatedAt || item.createdAt
                                  )}
                                </span>
                              </div>

                              {editingId === item.id ? (
                                <>
                                  <Form.Control
                                    className="mt-3"
                                    type="number"
                                    min="0"
                                    value={editCantidad}
                                    onChange={(e) =>
                                      setEditCantidad(e.target.value)
                                    }
                                  />

                                  <div className="mt-2 d-flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="success"
                                      onClick={() => saveEdit(item)}
                                    >
                                      Guardar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={cancelEdit}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                role === "admin" && (
                                  <div className="mt-3 stock-actions">
                                    <Button
                                      size="sm"
                                      className="btn-editar"
                                      onClick={() => startEdit(item)}
                                    >
                                      <FaEdit className="btn-icon" /> Ajustar
                                    </Button>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Toast
        show={showToast}
        onClose={() => setShowToast(false)}
        delay={2500}
        autohide
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1055,
        }}
      >
        <Toast.Body>{toastMsg}</Toast.Body>
      </Toast>

      <Modal show={showAddStock} onHide={() => setShowAddStock(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaPlus className="modal-title-icon" /> Agregar stock
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AddStock
            onSuccess={async () => {
              await fetchStock();
              setShowAddStock(false);
              setToastMsg("Stock guardado correctamente");
              setShowToast(true);
            }}
          />
        </Modal.Body>
      </Modal>

      <Modal show={showEntrega} onHide={() => setShowEntrega(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaTruck className="modal-title-icon" /> Entrega de insumos
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <EntregarInsumo
            stock={stock.filter((item) => Number(item.cantidad || 0) > 0)}
            onSuccess={async (msg) => {
              await fetchStock();
              setShowEntrega(false);
              setToastMsg(msg || "Entrega registrada correctamente");
              setShowToast(true);
            }}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Stock;
