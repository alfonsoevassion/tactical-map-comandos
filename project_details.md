# tactical-map-comandos: Detalles de Implementación

## Resumen del Proyecto

Una aplicación web interactiva que simula un mapa táctico 2D, inspirado en juegos como *Comandos*. Permite posicionar y mover aliados, enemigos y obstáculos, con un sistema de visión dinámico y física de colisiones para los obstáculos.

## Funcionalidades y Procedimientos Implementados

### 1. Sistema de Visión (Raycasting)

*   **Concepto:** Utiliza un algoritmo de raycasting para generar un polígono de visibilidad para cada enemigo.
*   **Procedimiento:**
    *   Se calculan todos los vértculos de los obstáculos visibles desde el origen del enemigo.
    *   Se lanzan rayos desde el enemigo hacia estos vértices (con pequeños offsets para capturar todos los ángulos) y hacia los límites del canvas.
    *   Se calcula la intersección más cercana de cada rayo con los obstáculos o límites.
    *   Estos puntos de intersección, ordenados por ángulo, forman el polígono visible.
    *   La detección de aliados se realiza comprobando si puntos alrededor del aliado caen dentro de este polígono.
*   **Archivos clave:** `src/engine/VisionSystem.ts`, `src/components/TacticalCanvas.tsx`.

### 2. Interacción Drag & Drop

*   **Concepto:** Permite al usuario arrastrar entidades (aliados/enemigos) y obstáculos por el canvas.
*   **Procedimiento:**
    *   En `TacticalCanvas.tsx`, se detecta `onMouseDown` sobre una entidad/obstáculo.
    *   Se calcula el `dragOffset` (la diferencia entre la posición del ratón y el centro del objeto).
    *   Durante `onMouseMove`, se actualiza la posición del objeto arrastrado basándose en la nueva posición del ratón y el `dragOffset`.
    *   `onMouseUp` finaliza el arrastre.

### 3. Rotación de Elementos (Enemigos y Bloques)

*   **Concepto:** Permite rotar la dirección de visión de los enemigos y la orientación de los obstáculos usando la rueda del ratón.
*   **Procedimiento:**
    *   En `TacticalCanvas.tsx`, se implementa el manejador `onWheel`.
    *   Se detecta si el cursor está sobre un enemigo (para rotar su dirección) o un obstáculo (para rotar su orientación).
    *   Se ajusta la `direction` del enemigo o `rotation` del obstáculo basándose en la dirección de la rueda del ratón (`e.deltaY`).
    *   Se utilizan las funciones trigonométricas (`Math.cos`, `Math.sin`, `Math.atan2`) para los cálculos de ángulos.
*   **Archivos clave:** `src/components/TacticalCanvas.tsx`, `src/App.tsx` (para pasar la función de actualización).

### 4. Física de Colisiones (Obstáculos)

*   **Concepto:** Evita que los obstáculos se superpongan entre sí.
*   **Procedimiento:**
    *   Se implementa el algoritmo **Teorema de los Ejes Separadores (SAT)** en `src/engine/VisionSystem.ts` (`areObstaclesColliding`).
    *   Antes de aplicar un movimiento (`updateObstacle`) o una rotación (`updateObstacleRotation`) a un obstáculo, se comprueba si colisionaría con algún otro obstáculo.
    *   Si hay colisión, el movimiento/rotación se cancela.
    *   Al crear un nuevo obstáculo (`confirmAddObstacle`), se busca una posición libre desplazando el nuevo obstáculo hasta que no colisione.
*   **Archivos clave:** `src/engine/VisionSystem.ts`, `src/App.tsx`.

### 5. Creación de Bloques con Dimensiones Personalizadas

*   **Concepto:** Permite al usuario definir el ancho y alto de un nuevo bloque al crearlo.
*   **Procedimiento:**
    *   Al pulsar "+ Bloque", se muestra un modal integrado en la interfaz.
    *   El modal tiene campos de entrada para `width` y `height`.
    *   Al confirmar, se crea el nuevo obstáculo con las dimensiones especificadas. Si se cancela o no se introducen valores válidos, se usan valores por defecto.
*   **Archivos clave:** `src/App.tsx` (estado y lógica del modal), `src/App.css` (estilos del modal).

### 6. Eliminación de Elementos (Doble Clic)

*   **Concepto:** Permite borrar aliados, enemigos u obstáculos.
*   **Procedimiento:**
    *   En `TacticalCanvas.tsx`, se implementa el manejador `onDoubleClick`.
    *   Al hacer doble clic, se detecta sobre qué elemento se hizo clic y se llama a la función de borrado correspondiente (`onRemoveEntity` o `onRemoveObstacle`) pasada desde `App.tsx`.
*   **Archivos clave:** `src/components/TacticalCanvas.tsx`, `src/App.tsx`.

### 7. Persistencia de Estado (LocalStorage)

*   **Concepto:** Guarda la configuración actual del mapa (posiciones, rotaciones, elementos añadidos) en el navegador para que persista entre sesiones.
*   **Procedimiento:**
    *   Se usan los hooks `useState` y `useEffect` en `App.tsx`.
    *   Al cargar la aplicación, se intenta leer el estado de `localStorage` (`'tactical-entities'`, `'tactical-obstacles'`). Si no hay nada guardado, se usan los valores iniciales.
    *   Cada vez que `entities` u `obstacles` cambian (al mover, rotar, añadir o borrar), `useEffect` se ejecuta y guarda el estado actual en `localStorage`.
*   **Archivos clave:** `src/App.tsx`.

---

Este archivo detalla la arquitectura y las decisiones de implementación clave. Si necesitas más detalles sobre alguna sección específica, házmelo saber.
