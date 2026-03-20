import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  where,
} from "firebase/firestore";
import { Button, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import { FaCheck } from "react-icons/fa";
import { db } from "../../../firebase/config";
import { useAuth } from "../../../context/Authcontext/useAuth";
import { matchesSearch } from "../../../utils/inventory";

const TODAY = new Date().toISOString().slice(0, 10);

const EntregarInsumo = ({ onSuccess, stock = [] }) => {
  const { user } = useAuth();
  const formRef = useRef(null);

  const [fetchedInsumos, setFetchedInsumos] = useState([]);
  const [search, setSearch] = useState("");
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [servicio, setServicio] = useState("");
  const [persona, setPersona] = useState("");
  const [dni, setDni] = useState("");
  const [fecha, setFecha] = useState(TODAY);
  const [saving, setSaving] = useState(false);
  const [serviceOptions, setServiceOptions] = useState([]);

  useEffect(() => {
    if (stock.length > 0) {
      return;
    }

    let active = true;

    (async () => {
      const stockQuery = query(collection(db, "insumos"), where("cantidad", ">", 0));
      const snap = await getDocs(stockQuery);

      if (active) {
        setFetchedInsumos(snap.docs.map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() })));
      }
    })();

    return () => {
      active = false;
    };
  }, [stock]);

  useEffect(() => {
    let active = true;

    (async () => {
      const snap = await getDocs(collection(db, "movimientos"));
      const recentServices = Array.from(
        new Set(
          snap.docs
            .map((itemDoc) => itemDoc.data()?.servicio)
            .filter(Boolean)
            .slice(0, 10)
        )
      );

      if (active) {
        setServiceOptions(recentServices);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const insumos = stock.length > 0 ? stock : fetchedInsumos;

  const filteredInsumos = useMemo(() => {
    if (!search.trim()) {
      return insumos;
    }

    return insumos.filter((item) => matchesSearch(item, search));
  }, [insumos, search]);

  const selectedInsumo =
    insumos.find((item) => item.id === insumoId) ||
    (filteredInsumos.length === 1 ? filteredInsumos[0] : null);

  const resetForm = () => {
    setSearch("");
    setInsumoId("");
    setCantidad("");
    setServicio("");
    setPersona("");
    setDni("");
    setFecha(TODAY);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedInsumo || !cantidad || !servicio || !persona || !dni || !fecha) {
      Swal.fire("Error", "Completá todos los campos", "error");
      return;
    }

    const cant = Number(cantidad);
    if (Number.isNaN(cant) || cant <= 0 || cant > Number(selectedInsumo.cantidad || 0)) {
      Swal.fire("Error", "La cantidad debe ser válida y no superar el stock disponible", "error");
      return;
    }

    const [year, month, day] = fecha.split("-").map(Number);
    const fechaEntrega = new Date(year, month - 1, day);
    const fechaStr = fechaEntrega.toLocaleDateString("es-AR");

    const confirmResult = await Swal.fire({
      title: "Confirmar entrega",
      html: `
        <div style="text-align:left">
          <p><strong>Insumo:</strong> ${selectedInsumo.type} - ${selectedInsumo.modelo}</p>
          <p><strong>Cantidad:</strong> ${cant}</p>
          <p><strong>Fecha:</strong> ${fechaStr}</p>
          <p><strong>Servicio:</strong> ${servicio}</p>
          <p><strong>Retira:</strong> ${persona} (${dni})</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    setSaving(true);

    try {
      await runTransaction(db, async (transaction) => {
        const insumoRef = doc(db, "insumos", selectedInsumo.id);
        const movimientoRef = doc(collection(db, "movimientos"));
        const insumoSnap = await transaction.get(insumoRef);
        const stockActual = Number(insumoSnap.data()?.cantidad || 0);

        if (cant > stockActual) {
          throw new Error("Stock insuficiente");
        }

        const stockNuevo = stockActual - cant;

        transaction.update(insumoRef, {
          cantidad: stockNuevo,
          updatedAt: Timestamp.now(),
          updatedBy: user?.email || "sistema",
        });

        transaction.set(movimientoRef, {
          tipo: selectedInsumo.type,
          modelo: selectedInsumo.modelo,
          marca: selectedInsumo.marca,
          tipoMovimiento: "SALIDA",
          cantidad: cant,
          stockAnterior: stockActual,
          stockNuevo,
          servicio,
          persona,
          dni,
          fechaEntrega: Timestamp.fromDate(fechaEntrega),
          usuario: user?.email || "sistema",
          createdAt: Timestamp.now(),
        });
      });

      resetForm();
      onSuccess?.("Entrega registrada correctamente");
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo registrar la entrega", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.ctrlKey && e.key === "Enter") {
          e.preventDefault();
          formRef.current?.requestSubmit();
        }
      }}
    >
      <Form.Group className="mb-3">
        <Form.Label>Buscar insumo</Form.Label>
        <Form.Control
          type="text"
          placeholder="Ej: mouse logitech m185"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Insumo</Form.Label>
        <Form.Select
          value={selectedInsumo?.id || ""}
          onChange={(e) => setInsumoId(e.target.value)}
        >
          <option value="">Seleccionar</option>
          {filteredInsumos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.type} - {item.modelo} - {item.marca || "Sin marca"} (Stock: {item.cantidad})
            </option>
          ))}
        </Form.Select>
        <Form.Text className="text-muted">
          {filteredInsumos.length} resultado(s). Atajo: Ctrl + Enter para confirmar.
        </Form.Text>
      </Form.Group>

      {selectedInsumo && (
        <div className="selected-insumo-card mb-3">
          <strong>
            {selectedInsumo.type} - {selectedInsumo.modelo}
          </strong>
          <span>{selectedInsumo.marca || "Sin marca"}</span>
          <span>Stock disponible: {selectedInsumo.cantidad}</span>
        </div>
      )}

      <div className="form-two-columns">
        <Form.Group className="mb-2">
          <Form.Label>Cantidad</Form.Label>
          <Form.Control
            type="number"
            min="1"
            max={selectedInsumo?.cantidad || undefined}
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
      </div>

      <Form.Group className="mb-2">
        <Form.Label>Servicio</Form.Label>
        <Form.Control
          list="servicios-frecuentes"
          value={servicio}
          onChange={(e) => setServicio(e.target.value)}
          placeholder="Ej: Neonatología"
        />
        <datalist id="servicios-frecuentes">
          {serviceOptions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Nombre y apellido</Form.Label>
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

      <Button type="submit" variant="danger" className="w-100 btn-confirm" disabled={saving}>
        <FaCheck className="btn-icon" /> {saving ? "Registrando..." : "Confirmar entrega"}
      </Button>
    </Form>
  );
};

export default EntregarInsumo;
