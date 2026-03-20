export const LOW_STOCK_THRESHOLD = 3;

export const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const buildInsumoKey = ({ type, modelo, marca }) =>
  [type, modelo, marca].map(normalizeText).join("::");

export const matchesSearch = (item, term) => {
  const normalizedTerm = normalizeText(term);

  if (!normalizedTerm) {
    return true;
  }

  const haystack = [
    item.type,
    item.modelo,
    item.marca,
    item.updatedBy,
    item.createdBy,
  ]
    .map(normalizeText)
    .join(" ");

  return haystack.includes(normalizedTerm);
};

export const groupStockByType = (items) =>
  items.reduce((acc, item) => {
    const key = item.type || "Sin tipo";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
