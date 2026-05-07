import { useEffect, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  runTransaction,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { Alert, Button, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import { FaSave } from "react-icons/fa";
import { db } from "../../firebase/config";
import { buildInsumoKey } from "../../utils/inventory";

const CUSTOM_OPTION = "__custom__";

const AddStock = ({ onSuccess }) => {
  const [types, setTypes] = useState({});
  const [typeDocId, setTypeDocId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");
  const [selectedModelo, setSelectedModelo] = useState("");
  const [customModelo, setCustomModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [saving, setSaving] = useState(false);
  const [duplicateHint, setDuplicateHint] = useState(null);

  const tipo =
    selectedType === CUSTOM_OPTION ? customType.trim() : selectedType.trim();
  const modelo =
    selectedType === CUSTOM_OPTION || selectedModelo === CUSTOM_OPTION
      ? customModelo.trim()
      : selectedModelo.trim();

  useEffect(() => {
    let active = true;

    (async () => {
      const snapshot = await getDocs(collection(db, "Type"));

      if (active && !snapshot.empty) {
        setTypeDocId(snapshot.docs[0].id);
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
    setSelectedType("");
    setCustomType("");
    setSelectedModelo("");
    setCustomModelo("");
    setMarca("");
    setCantidad("");
    setDuplicateHint(null);
  };

  const syncTypeCatalog = async (nextType, nextModel) => {
    if (!nextType || !nextModel) {
      return;
    }

    if (typeDocId) {
      await setDoc(
        doc(db, "Type", typeDocId),
        { [nextType]: arrayUnion(nextModel) },
        { merge: true }
      );
    } else {
      const newDocRef = await addDoc(collection(db, "Type"), {
        [nextType]: [nextModel],
      });
      setTypeDocId(newDocRef.id);
    }

    setTypes((prev) => {
      const currentModels = Array.isArray(prev[nextType]) ? prev[nextType] : [];
      if (currentModels.includes(nextModel)) {
        return prev;
      }

      return {
        ...prev,
        [nextType]: [...currentModels, nextModel].sort((a, b) =>
          a.localeCompare(b)
        ),
      };
    });
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
        await syncTypeCatalog(tipo, modelo);

        await addDoc(collection(db, "insumos"), {
          type: tipo,
          modelo,
          marca: marca.trim(),
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
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setSelectedModelo("");
            setCustomModelo("");
          }}
        >
          <option value="">Seleccioná un tipo</option>
          {Object.keys(types)
            .sort((a, b) => a.localeCompare(b))
            .map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          <option value={CUSTOM_OPTION}>No está en la lista</option>
        </Form.Select>
      </Form.Group>

      {selectedType === CUSTOM_OPTION && (
        <Form.Group className="mb-3">
          <Form.Label>Nuevo tipo</Form.Label>
          <Form.Control
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="Ej: Adaptadores"
          />
        </Form.Group>
      )}

      {selectedType && selectedType !== CUSTOM_OPTION && (
        <Form.Group className="mb-3">
          <Form.Label>Modelo</Form.Label>
          <Form.Select
            value={selectedModelo}
            onChange={(e) => setSelectedModelo(e.target.value)}
          >
            <option value="">Seleccioná un modelo</option>
            {types[selectedType]?.map((itemModel) => (
              <option key={itemModel} value={itemModel}>
                {itemModel}
              </option>
            ))}
            <option value={CUSTOM_OPTION}>No está en la lista</option>
          </Form.Select>
        </Form.Group>
      )}

      {(selectedType === CUSTOM_OPTION || selectedModelo === CUSTOM_OPTION) && (
        <Form.Group className="mb-3">
          <Form.Label>Nuevo modelo</Form.Label>
          <Form.Control
            value={customModelo}
            onChange={(e) => setCustomModelo(e.target.value)}
            placeholder="Ej: M185"
          />
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
