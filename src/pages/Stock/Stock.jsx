import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../firebase/config";
import {
  Table,
  Container,
  Button,
  Modal,
  Form,
  Badge,
  Toast,
} from "react-bootstrap";
import { useAuth } from "../../context/Authcontext/AuthContex";
import { useNavigate } from "react-router-dom";

import AddStock from "./AddStock";
import EntregarInsumo from "../Movimientos/GiveInsumo/GiveInsumo";
import "../Movimientos/vistaStock/VistaStock.css";

import { FaPlus, FaTruck, FaClipboardList, FaSignOutAlt, FaEdit, FaChartBar } from "react-icons/fa"; // icons for buttons

const Stock = () => {
  const [stock, setStock] = useState([]);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showEntrega, setShowEntrega] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editCantidad, setEditCantidad] = useState("");

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const { role, user } = useAuth();
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

  /* =========================
     FETCH STOCK
  ========================= */
  const fetchStock = async () => {
    const q = query(collection(db, "insumos"), orderBy("type"));
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setStock(data);
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const [openTypes, setOpenTypes] = useState({});

  // keep sections closed by default
  useEffect(() => {
    const uniqueTypes = Array.from(
      new Set(stock.map((i) => i.type || "Sin Tipo"))
    ).sort();

    const obj = {};
    uniqueTypes.forEach((t) => (obj[t] = false));
    setOpenTypes(obj);
  }, [stock]);

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

  /* =========================
     EDICIÓN INLINE
  ========================= */
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditCantidad(item.cantidad);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCantidad("");
  };

  const saveEdit = async (item) => {
    const nuevaCantidad = Number(editCantidad);
    if (isNaN(nuevaCantidad) || nuevaCantidad < 0) return;

    const diferencia = nuevaCantidad - item.cantidad;

    // actualizar stock
    await updateDoc(doc(db, "insumos", item.id), {
      cantidad: nuevaCantidad,
      updatedAt: Timestamp.now(),
      updatedBy: user?.email || "admin",
    });

    // registrar movimiento
    await addDoc(collection(db, "movimientos"), {
      tipo: item.type,
      modelo: item.modelo,
      marca: item.marca,
      cantidadAnterior: item.cantidad,
      cantidadNueva: nuevaCantidad,
      diferencia,
      usuario: user?.email || "admin",
      fecha: Timestamp.now(),
    });

    setToastMsg("Stock actualizado correctamente");
    setShowToast(true);

    cancelEdit();
    fetchStock();
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Stock de Insumos</h3>

        <div className="d-flex gap-2 flex-wrap header-controls">
          {role === "admin" && (
            <>
              <Button className="btn-agregar" onClick={() => setShowAddStock(true)}>
                <FaPlus className="btn-icon" /> Agregar Insumo
              </Button>

              <Button className="btn-entregar" onClick={() => setShowEntrega(true)}>
                <FaTruck className="btn-icon" /> Entregar insumo
              </Button>
            </>
          )}

          {user && (
            <Button className="btn-reportes" onClick={() => navigate("/reportes/entregas")}>
              <FaClipboardList className="btn-icon" /> Ver reporte de entregas
            </Button>
          )}

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

                  <div className="d-flex gap-2 align-items-center">
                    <div className="text-muted">{items.length} items</div>
                  </div>
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

                            {editingId === item.id ? (
                              <>
                                <Form.Control
                                  type="number"
                                  min="0"
                                  value={editCantidad}
                                  onChange={(e) => setEditCantidad(e.target.value)}
                                />

                                <div className="mt-2 d-flex gap-2">
                                  <Button size="sm" variant="success" onClick={() => saveEdit(item)}>Guardar</Button>
                                  <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancelar</Button>
                                </div>
                              </>
                            ) : (
                              role === "admin" && (
                                <div className="mt-3 stock-actions">
                                  <Button size="sm" className="btn-editar" onClick={() => startEdit(item)}><FaEdit className="btn-icon" /> Editar</Button>
                                </div>
                              )
                            )}

                            <div className="mt-auto id text-muted"><small>ID: {item.id}</small></div>
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

      {/* MODAL AGREGAR STOCK */}
      <Modal
        show={showAddStock}
        onHide={() => setShowAddStock(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title><FaPlus className="modal-title-icon" /> Agregar stock</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AddStock
            onSuccess={() => {
              fetchStock();
              setShowAddStock(false);
            }}
          />
        </Modal.Body>
      </Modal>

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
            stock={stock.filter((i) => i.cantidad > 0)}
            onSuccess={() => {
              fetchStock();
              setShowEntrega(false);
            }}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Stock;
