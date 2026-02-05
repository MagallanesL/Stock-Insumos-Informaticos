import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { Form, Button } from "react-bootstrap";
import Swal from "sweetalert2";
import { FaSave } from "react-icons/fa";

const AddStock = ({ onSuccess }) => {
  const [types, setTypes] = useState({});
  const [tipo, setTipo] = useState("");
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [cantidad, setCantidad] = useState("");

  /* 🔹 Traer tipos desde Firestore */
  useEffect(() => {
    const fetchTypes = async () => {
      const snapshot = await getDocs(collection(db, "Type"));

      if (!snapshot.empty) {
        setTypes(snapshot.docs[0].data());
      }
    };

    fetchTypes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tipo || !modelo || !cantidad) {
      Swal.fire("Error", "Complete todos los campos", "error");
      return;
    }

    await addDoc(collection(db, "insumos"), {
      type: tipo,
      modelo,
      marca,
      cantidad: Number(cantidad),
      createdAt: new Date(),
    });

    Swal.fire("OK", "Stock agregado correctamente", "success");
    onSuccess();
  };

  return (
    <Form onSubmit={handleSubmit}>
      {/* Tipo */}
      <Form.Group className="mb-3">
        <Form.Label>Tipo</Form.Label>
        <Form.Select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value);
            setModelo("");
          }}
        >
          <option value="">Seleccione tipo</option>
          {Object.keys(types).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      {/* Modelo */}
      {tipo && (
        <Form.Group className="mb-3">
          <Form.Label>Modelo</Form.Label>
          <Form.Select
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
          >
            <option value="">Seleccione modelo</option>
            {types[tipo]?.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      )}

      {/* Marca */}
      <Form.Group className="mb-3">
        <Form.Label>Marca</Form.Label>
        <Form.Control
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
        />
      </Form.Group>

      {/* Cantidad */}
      <Form.Group className="mb-3">
        <Form.Label>Cantidad</Form.Label>
        <Form.Control
          type="number"
          min="0"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
      </Form.Group>

      <Button type="submit" className="btn-save"><FaSave className="btn-icon" /> Guardar</Button>
    </Form>
  );
};

export default AddStock;
