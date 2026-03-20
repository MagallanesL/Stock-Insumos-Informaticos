import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Button,
  Container,
  Form,
  InputGroup,
  Modal,
  Toast,
} from "react-bootstrap";
import {
  FaClipboardList,
  FaSearch,
  FaSignOutAlt,
  FaTruck,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import EntregarInsumo from "../GiveInsumo/GiveInsumo";
import { auth, db } from "../../../firebase/config";
import {
  groupStockByType,
  LOW_STOCK_THRESHOLD,
  matchesSearch,
} from "../../../utils/inventory";
import "./VistaStock.css";

const VistaStock = () => {
  const [stock, setStock] = useState([]);
  const [showEntrega, setShowEntrega] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [openTypes, setOpenTypes] = useState({});

  const navigate = useNavigate();

  const fetchStock = async () => {
    setLoading(true);

    try {
      const stockQuery = query(collection(db, "insumos"), orderBy("type"));
      const snapshot = await getDocs(stockQuery);
      setStock(snapshot.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() })));
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
        setStock(snapshot.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() })));
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

  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      const cantidad = Number(item.cantidad || 0);
      const matchesLowStock =
        !onlyLowStock ||
        (cantidad > 0 && cantidad <= LOW_STOCK_THRESHOLD) ||
        cantidad === 0;

      return matchesLowStock && matchesSearch(item, search);
    });
  }, [onlyLowStock, search, stock]);

  const grouped = useMemo(
    () => groupStockByType(filteredStock),
    [filteredStock]
  );

  const types = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const toggleType = (type) => {
    setOpenTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <Container className="mt-4 stock-page">
      <header className="top-navbar">
        <div className="top-navbar-brand">
          <p className="eyebrow">Consulta operativa</p>
          <h2 className="stock-title">Stock disponible</h2>
          <p className="stock-subtitle">
            Revisá disponibilidad y registrá entregas con una búsqueda más
            rápida y enfocada en faltantes.
          </p>
        </div>

        <nav className="header-controls">
          <Button
            className="btn-entregar nav-button"
            onClick={() => setShowEntrega(true)}
          >
            <FaTruck className="btn-icon" /> Entregar insumo
          </Button>

          <Button
            className="btn-reportes nav-button"
            onClick={() => navigate("/reportes/entregas")}
          >
            <FaClipboardList className="btn-icon" /> Ver reporte
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

        <label className="filter-check">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
          />
          Mostrar sólo faltantes o bajo stock
        </label>
      </section>

      {loading ? (
        <div className="stock-empty">Cargando stock...</div>
      ) : filteredStock.length === 0 ? (
        <div className="stock-empty">
          No hay insumos que coincidan con la búsqueda actual.
        </div>
      ) : (
        <div className="stock-types">
          {types.map((type) => {
            const items = grouped[type];
            const expanded = Boolean(search) || onlyLowStock || Boolean(openTypes[type]);

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
                        {items.length} modelos
                      </small>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="stock-type-body p-3">
                    <div className="stock-grid row g-3">
                      {items.map((item) => {
                        const cantidad = Number(item.cantidad || 0);
                        const warning =
                          cantidad === 0 ||
                          (cantidad > 0 && cantidad <= LOW_STOCK_THRESHOLD);

                        return (
                          <div key={item.id} className="col-12 col-sm-6 col-xl-4">
                            <div
                              className={`stock-card p-3 h-100 d-flex flex-column ${
                                warning ? "stock-card-low" : ""
                              }`}
                            >
                              <div className="model fw-600">{item.modelo}</div>
                              <div className="brand text-muted small">
                                {item.marca || "Sin marca"}
                              </div>
                              <div className="stock-inline-meta mt-3">
                                <span>Tipo: {item.type}</span>
                                <strong>Stock: {cantidad}</strong>
                              </div>
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

export default VistaStock;
