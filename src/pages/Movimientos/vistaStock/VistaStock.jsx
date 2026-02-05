import { useEffect, useState } from "react";
import './VistaStock.css'
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { Container, Table, Badge, Button, Modal, Toast } from "react-bootstrap";
import EntregarInsumo from "../GiveInsumo/GiveInsumo";
import { useAuth } from "../../../context/Authcontext/AuthContex";
import { FaTruck, FaClipboardList, FaSignOutAlt } from "react-icons/fa"; // icons
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { db, auth } from "../../../firebase/config";

const VistaStock = () => {
  const [stock, setStock] = useState([]);
  const [showEntrega, setShowEntrega] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await signOut(auth);
      setToastMsg("Sesión cerrada");
      setShowToast(true);
      navigate("/login");
    } catch (e) {
      console.error("Error closing session:", e);
      setToastMsg("Error cerrando sesión");
      setShowToast(true);
    }
  }; 

  const fetchStock = async () => {
    const q = query(collection(db, "insumos"), orderBy("type"));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setStock(data);
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const [openTypes, setOpenTypes] = useState({});

  const toggleType = (type) => {
    setOpenTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const grouped = stock.reduce((acc, item) => {
    const key = item.type || "Sin Tipo";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const types = Object.keys(grouped).sort();

  return (
    <Container className="mt-4 stock-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Stock disponible</h3>

        <div className="d-flex gap-2 header-controls">
          <Button className="btn-entregar" onClick={() => setShowEntrega(true)}>
            <FaTruck className="btn-icon" /> Entregar insumo
          </Button>

          <Button className="btn-reportes" onClick={() => navigate("/reportes/entregas") }>
            <FaClipboardList className="btn-icon" /> Ver reporte de entregas
          </Button>

          <Button className="btn-logout" onClick={logout}>
            <FaSignOutAlt className="btn-icon" /> Cerrar sesión
          </Button>
        </div>
      </div>

      {stock.length === 0 ? (
        <div className="stock-empty">No hay stock cargado</div>
      ) : (
        <div className="stock-types">
          {types.map((type) => {
            const items = grouped[type];
            const totalQty = items.reduce((s, i) => s + (Number(i.cantidad) || 0), 0);

            return (
              <div key={type} className="stock-type-card mb-3">
                <div className="stock-type-header d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-3">
                    <button
                      className={`type-toggle btn btn-sm btn-light`}
                      onClick={() => toggleType(type)}
                      aria-expanded={!!openTypes[type]}
                    >
                      {openTypes[type] ? '▾' : '▸'}
                    </button>

                    <div>
                      <h5 className="mb-0">{type}</h5>
                      <small className="text-muted">{items.length} modelos — {totalQty} unidades</small>
                    </div>
                  </div>

                  <div className="text-muted">{items.length} items</div>
                </div>

                {openTypes[type] && (
                  <div className="stock-type-body p-3">
                    <div className="stock-grid row g-3">
                      {items.map((item) => (
                        <div key={item.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                          <div className={`stock-card p-3 h-100 d-flex flex-column ${item.cantidad <= 3 ? 'stock-card-low' : ''}`}>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <div className="model fw-600">{item.modelo}</div>
                                <div className="brand text-muted small">{item.marca}</div>
                              </div>

                              <div className="text-end qty">
                                {item.cantidad <= 3 && (
                                  <Badge bg="danger" className="stock-badge-low d-block mb-1">Bajo</Badge>
                                )}
                                <div className="fs-5 fw-600">{item.cantidad}</div>
                              </div>
                            </div>

                            <div className="mt-auto">
                              {/* <small className="text-muted">ID: {item.id}</small> */}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )} 
              </div>
            );
          })}
        </div>
      )}

      {/* TOAST */}
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

      {/* MODAL ENTREGA */}
      <Modal
        show={showEntrega}
        onHide={() => setShowEntrega(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title><FaTruck className="modal-title-icon" /> Entrega de insumos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <EntregarInsumo
            onSuccess={(msg) => {
              fetchStock();
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
