# Cambios de stock y altas

## Qué se modificó

- Se agregó un botón `Ver stock disponible` en la cabecera principal para abrir la vista separada de disponibilidad.
- Se habilitó el alta de insumos nuevos aunque el tipo o el modelo no existan en el catálogo actual.
- Cuando se carga un insumo nuevo fuera de lista, también se actualiza la colección `Type` para que quede disponible en altas futuras.

## Archivos afectados

- `src/pages/Stock/Stock.jsx`
- `src/pages/Stock/AddStock.jsx`

## Cómo probarlo

1. Ingresar con un usuario habilitado.
2. Desde la pantalla principal, hacer clic en `Ver stock disponible` y validar que navega a `/movimientos`.
3. Abrir `Agregar insumo`.
4. Elegir un tipo existente y luego `No está en la lista` en modelo para cargar uno nuevo.
5. Repetir usando `No está en la lista` también en tipo.
6. Confirmar que el insumo se guarda y luego queda disponible en futuras cargas.

## Riesgos o supuestos

- Se asume que la colección `Type` mantiene un único documento principal, como ya lo hacía la implementación existente.
- `src/pages/Stock/Stock.jsx` ya excedía el límite de tamaño antes de este cambio; no se refactorizó para no alterar comportamiento existente en esta entrega.

## Endpoints y variables de entorno

- No aplica: no se modificaron endpoints ni variables de entorno.
