import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { Form, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import { useAuth } from "../../../context/Authcontext/AuthContex";
import { FaCheck } from "react-icons/fa";

const EntregarInsumo = ({ onSuccess }) => {
  const { user } = useAuth();

  const [insumos, setInsumos] = useState([]);
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [servicio, setServicio] = useState("");
  const [persona, setPersona] = useState("");
  const [dni, setDni] = useState("");
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const q = query(
        collection(db, "insumos"),
        where("cantidad", ">", 0)
      );
      const snap = await getDocs(q);

      setInsumos(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    };

    fetch();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !insumoId ||
      !cantidad ||
      !servicio ||
      !persona ||
      !dni ||
      !fecha
    ) {
      Swal.fire("Error", "Completa todos los campos", "error");
      return;
    }

    const insumo = insumos.find((i) => i.id === insumoId);
    const cant = Number(cantidad);

    if (cant <= 0 || cant > insumo.cantidad) {
      Swal.fire("Error", "Cantidad inválida", "error");
      return;
    }

    const nuevoStock = insumo.cantidad - cant;

    try {
      // actualizar stock
      await updateDoc(doc(db, "insumos", insumoId), {
        cantidad: nuevoStock,
        updatedAt: Timestamp.now(),
        updatedBy: user?.email,
      });

      // registrar movimiento
      await addDoc(collection(db, "movimientos"), {
        tipo: insumo.type,
        modelo: insumo.modelo,
        marca: insumo.marca,
        tipoMovimiento: "SALIDA",
        cantidad: cant,
        stockAnterior: insumo.cantidad,
        stockNuevo: nuevoStock,
        servicio,
        persona,
        dni,
        fechaEntrega: Timestamp.fromDate(new Date(fecha)),
        usuario: user?.email,
        createdAt: Timestamp.now(),
      });

      onSuccess?.("Entrega registrada correctamente");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo registrar la entrega", "error");
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-2">
        <Form.Label>Insumo</Form.Label>
        <Form.Select
          value={insumoId}
          onChange={(e) => setInsumoId(e.target.value)}
        >
          <option value="">Seleccionar</option>
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.type} - {i.modelo} (Stock: {i.cantidad})
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Cantidad</Form.Label>
        <Form.Control
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Fecha de entrega</Form.Label>
        <Form.Control
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Servicio</Form.Label>
        <Form.Control
          value={servicio}
          onChange={(e) => setServicio(e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Nombre y Apellido</Form.Label>
        <Form.Control
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>DNI</Form.Label>
        <Form.Control
          value={dni}
          onChange={(e) => setDni(e.target.value)}
        />
      </Form.Group>

      <Button type="submit" variant="danger" className="w-100 btn-confirm">
        <FaCheck className="btn-icon" /> Confirmar entrega
      </Button>
    </Form>
  );
};

export default EntregarInsumo;
