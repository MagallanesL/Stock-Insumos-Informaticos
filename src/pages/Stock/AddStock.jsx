import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { Alert, Button, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import { FaSave } from "react-icons/fa";
import { db } from "../../firebase/config";
import { buildInsumoKey } from "../../utils/inventory";

const AddStock = ({ onSuccess }) => {
  const [types, setTypes] = useState({});
  const [tipo, setTipo] = useState("");
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicateHint, setDuplicateHint] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const snapshot = await getDocs(collection(db, "Type"));

      if (active && !snapshot.empty) {
        setTypes(snapshot.docs[0].data());
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!tipo || !modelo) {
      setDuplicateHint(null);
      return;
    }

    let active = true;

    (async () => {
      const snapshot = await getDocs(collection(db, "insumos"));
      const currentKey = buildInsumoKey({ type: tipo, modelo, marca });
      const duplicate = snapshot.docs
        .map((stockDoc) => ({ id: stockDoc.id, ...stockDoc.data() }))
        .find((item) => buildInsumoKey(item) === currentKey);

      if (active) {
        setDuplicateHint(duplicate || null);
      }
    })();

    return () => {
      active = false;
    };
  }, [tipo, modelo, marca]);

  const resetForm = () => {
    setTipo("");
    setModelo("");
    setMarca("");
    setCantidad("");
    setDuplicateHint(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tipo || !modelo || !cantidad) {
      Swal.fire("Error", "Completá todos los campos obligatorios", "error");
      return;
    }

    const cantidadNueva = Number(cantidad);
    if (Number.isNaN(cantidadNueva) || cantidadNueva <= 0) {
      Swal.fire("Error", "La cantidad debe ser mayor a cero", "error");
      return;
    }

    setSaving(true);

    try {
      const snapshot = await getDocs(collection(db, "insumos"));
      const currentKey = buildInsumoKey({ type: tipo, modelo, marca });
      const duplicate = snapshot.docs
        .map((stockDoc) => ({ id: stockDoc.id, ...stockDoc.data() }))
        .find((item) => buildInsumoKey(item) === currentKey);

      if (duplicate) {
        await runTransaction(db, async (transaction) => {
          const insumoRef = doc(db, "insumos", duplicate.id);
          const insumoSnap = await transaction.get(insumoRef);
          const stockActual = Number(insumoSnap.data()?.cantidad || 0);

          transaction.update(insumoRef, {
            cantidad: stockActual + cantidadNueva,
            updatedAt: Timestamp.now(),
          });
        });

        Swal.fire(
          "Stock actualizado",
          "El insumo ya existía y la nueva cantidad se sumó al stock actual.",
          "success"
        );
      } else {
        await addDoc(collection(db, "insumos"), {
          type: tipo,
          modelo,
          marca,
          cantidad: cantidadNueva,
          createdAt: Timestamp.now(),
        });

        Swal.fire("OK", "Stock agregado correctamente", "success");
      }

      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo guardar el stock", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Tipo</Form.Label>
        <Form.Select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            setModelo("");
          }}
        >
          <option value="">Seleccioná un tipo</option>
          {Object.keys(types).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {tipo && (
        <Form.Group className="mb-3">
          <Form.Label>Modelo</Form.Label>
          <Form.Select
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
          >
            <option value="">Seleccioná un modelo</option>
            {types[tipo]?.map((itemModel) => (
              <option key={itemModel} value={itemModel}>
                {itemModel}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      )}

      {duplicateHint && (
        <Alert variant="warning" className="py-2">
          Ya existe este insumo con stock {duplicateHint.cantidad}. Si seguís,
          se sumará al registro actual en vez de crear un duplicado.
        </Alert>
      )}

      <Form.Group className="mb-3">
        <Form.Label>Marca</Form.Label>
        <Form.Control
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          placeholder="Ej: Logitech"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Cantidad</Form.Label>
        <Form.Control
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </Form.Group>

      <Button type="submit" className="btn-save" disabled={saving}>
        <FaSave className="btn-icon" /> {saving ? "Guardando..." : "Guardar"}
      </Button>
    </Form>
  );
};

export default AddStock;
