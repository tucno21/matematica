# Lógica Aleatoria de los Dados - Recta Numérica

Este documento explica cómo funciona la lógica aleatoria de los dados en el juego de Recta Numérica.

---

## 1. Componente DiceFace

El componente `DiceFace` es un componente visual que muestra un dado con sus puntos.

```typescript
interface DiceFaceProps {
    value: number;           // Valor del dado (1-6)
    rolling: boolean;         // Indica si el dado está animándose
    onClick: () => void;       // Función al hacer clic
    disabled: boolean;        // Si está deshabilitado
    color: string;            // Color del dado (azul o rojo)
}
```

### Representación de los puntos del dado

Los puntos del dado se representan en una cuadrícula de 3x3 usando coordenadas [columna, fila]:

```typescript
const DICE_DOTS: Record<number, [number, number][]> = {
    1: [[1, 1]],                    // Centro
    2: [[0, 0], [2, 2]],           // Esquinas opuestas
    3: [[0, 0], [1, 1], [2, 2]],   // Diagonal
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],  // 4 esquinas
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],  // 4 esquinas + centro
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],  // 6 puntos (2 columnas de 3)
};
```

**Coordenadas de la cuadrícula 3x3:**
```
[0,0]  [1,0]  [2,0]
[0,1]  [1,1]  [2,1]
[0,2]  [1,2]  [2,2]
```

### Visualización

El componente renderiza una cuadrícula de 9 celdas y muestra un punto blanco en las posiciones especificadas por `DICE_DOTS[value]`.

---

## 2. Lógica de Lanzamiento de Dados

### Estados del juego relacionados con los dados

```typescript
// Estados para un dado
const [diceValue, setDiceValue] = useState<number>(1);      // Valor real calculado
const [diceFace, setDiceFace] = useState<number>(1);        // Valor visual del primer dado
const [diceRolling, setDiceRolling] = useState<boolean>(false);  // Estado de animación

// Estados adicionales para segundo dado (cuando numberOfDice === 2)
const [dice2Value, setDice2Value] = useState<number>(1);    // Valor del segundo dado
const [dice2Face, setDice2Face] = useState<number>(1);      // Valor visual del segundo dado
```

### Función `rollDice`

Esta es la función principal que controla el lanzamiento de los dados:

```typescript
const rollDice = useCallback((): void => {
    // 1. Validaciones iniciales
    if (diceRolling || turnPhase !== "roll" || gamePhase !== "playing") return;
    
    // 2. Iniciar animación
    setDiceRolling(true);
    setFeedback(null);
    
    let ticks = 0;
    const id = setInterval(() => {
        ticks++;
        
        // 3. Animación: cambiar valores aleatorios cada 80ms
        setDiceFace(Math.ceil(Math.random() * 6));
        
        // Si hay 2 dados, también animar el segundo
        if (numberOfDice === 2) {
            setDice2Face(Math.ceil(Math.random() * 6));
        }
        
        // 4. Después de 14 ticks (1.12 segundos), detener y asignar valores finales
        if (ticks >= 14) {
            clearInterval(id);
            
            // Generar valores finales aleatorios (1-6)
            const final1 = Math.ceil(Math.random() * 6);
            const final2 = numberOfDice === 2 ? Math.ceil(Math.random() * 6) : 1;
            
            // Calcular el valor total
            const totalDiceValue = numberOfDice === 2 ? final1 + final2 : final1;
            
            // Asignar valores a los estados
            setDiceValue(totalDiceValue);
            setDiceFace(final1);
            
            if (numberOfDice === 2) {
                setDice2Face(final2);
                setDice2Value(final2);
            }
            
            // Finalizar animación y pasar a fase de arrastre
            setDiceRolling(false);
            setTurnPhase("drag");
        }
    }, 80);
}, [diceRolling, turnPhase, gamePhase, numberOfDice]);
```

---

## 3. Generación de Números Aleatorios

### Cómo funciona `Math.random()`

JavaScript usa el método `Math.random()` para generar números pseudo-aleatorios.

**Un solo dado (valores 1-6):**
```typescript
const valor = Math.ceil(Math.random() * 6);
```

**Explicación paso a paso:**
1. `Math.random()` → Genera un decimal entre 0.0 y 0.999...
2. `* 6` → Multiplica por 6: rango de 0.0 a 5.999...
3. `Math.ceil()` → Redondea hacia arriba: rango de 1 a 6

**Ejemplos:**
- `0.23 * 6 = 1.38` → `Math.ceil(1.38)` → **1**
- `3.67 * 6 = 22.02` → `Math.ceil(22.02)` → **6**
- `5.99 * 6 = 35.94` → `Math.ceil(35.94)` → **6**

### Distribución de probabilidad

Cada número del 1 al 6 tiene exactamente la misma probabilidad: **16.67%**

```
Número:  1     2     3     4     5     6
Probabilidad: ████ ████ ████ ████ ████ ████  (igual para todos)
```

---

## 4. Caso de 2 Dados

### Generación de valores

```typescript
// Primer dado
const final1 = Math.ceil(Math.random() * 6);  // 1-6

// Segundo dado (solo si numberOfDice === 2)
const final2 = Math.ceil(Math.random() * 6);  // 1-6

// Valor total usado en el juego
const totalDiceValue = final1 + final2;  // 2-12
```

### Rangos posibles

**Un dado:**
- Mínimo: 1
- Máximo: 6
- Posibles: 1, 2, 3, 4, 5, 6

**Dos dados:**
- Mínimo: 1 + 1 = 2
- Máximo: 6 + 6 = 12
- Posibles: 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12

### Distribución de probabilidad con 2 dados

La distribución **NO** es uniforme cuando se suman dos dados. La suma de 7 es la más probable.

```
Suma:    2    3    4    5    6    7    8    9   10   11   12
Probabilidad: █   ███  ████ █████ ██████ ███████ ██████ █████ ████ ███   █

Porcentaje:
2:   2.78% (1 combinación: 1+1)
3:   5.56% (2 combinaciones: 1+2, 2+1)
4:   8.33% (3 combinaciones: 1+3, 2+2, 3+1)
5:  11.11% (4 combinaciones: 1+4, 2+3, 3+2, 4+1)
6:  13.89% (5 combinaciones: 1+5, 2+4, 3+3, 4+2, 5+1)
7:  16.67% (6 combinaciones: 1+6, 2+5, 3+4, 4+3, 5+2, 6+1) ⭐ MÁS FRECUENTE
8:  13.89% (5 combinaciones: 2+6, 3+5, 4+4, 5+3, 6+2)
9:  11.11% (4 combinaciones: 3+6, 4+5, 5+4, 6+3)
10:  8.33% (3 combinaciones: 4+6, 5+5, 6+4)
11:  5.56% (2 combinaciones: 5+6, 6+5)
12:  2.78% (1 combinación: 6+6)
```

---

## 5. Flujo Completo de Animación

### Fase 1: Inicio
```
Usuario hace clic → rollDice() → diceRolling = true
```

### Fase 2: Animación (14 ticks × 80ms = 1.12 segundos)
```
Tick 1:  diceFace = 4, dice2Face = 3  (si 2 dados)
Tick 2:  diceFace = 2, dice2Face = 6
Tick 3:  diceFace = 6, dice2Face = 1
...
Tick 14: diceFace = 3, dice2Face = 4  (valores finales)
```

Durante la animación, el componente `DiceFace` aplica una animación CSS:
```css
@keyframes diceRoll {
  from { transform: rotate(-8deg) scale(0.95); }
  to   { transform: rotate(8deg)  scale(1.05); }
}
```

### Fase 3: Asignación de valores finales
```typescript
// Valores aleatorios finales
const final1 = Math.ceil(Math.random() * 6);  // Ej: 3
const final2 = Math.ceil(Math.random() * 6);  // Ej: 4

// Cálculo del total
const total = final1 + final2;  // Ej: 7

// Actualización de estados
setDiceValue(7);    // Valor usado para movimiento
setDiceFace(3);     // Valor visual primer dado
setDice2Face(4);    // Valor visual segundo dado
setDice2Value(4);   // Valor individual segundo dado
```

### Fase 4: Fin
```
diceRolling = false
turnPhase = "drag"  (usuario debe arrastrar la bolita)
```

---

## 6. Visualización de Mensajes

### Mensaje de feedback (cuando usuario acierta o falla)

**1 dado:**
```typescript
`¡Correcto! +3 → +7`
```

**2 dados:**
```typescript
`¡Correcto! +(3 + 4 = 7) → +7`
```

Código que genera el mensaje:
```typescript
const diceDisplay = numberOfDice === 2
    ? `(${diceFace} + ${dice2Face} = ${diceValue})`  // "(3 + 4 = 7)"
    : `${diceValue}`;                                       // "3"

const msg = `¡Correcto! ${direction}${diceDisplay} → ${expectedPos}`;
```

### Mensaje de instrucción

**1 dado:**
```
Mueve 3 lugares hacia la derecha ▶
```

**2 dados:**
```
Mueve 7 lugares (3 + 4) hacia la derecha ▶
```

---

## 7. Resumen

| Aspecto | 1 Dado | 2 Dados |
|---------|---------|----------|
| **Valores posibles** | 1-6 | 2-12 |
| **Distribución** | Uniforme (16.67% cada uno) | No uniforme (7 = 16.67%, extremos = 2.78%) |
| **Visualización** | 1 dado animado | 2 dados animados simultáneamente |
| **Cálculo** | `Math.random() * 6` | `(Math.random() * 6) + (Math.random() * 6)` |
| **Mensajes** | `+3` | `+(3 + 4 = 7)` |

---

## 8. Puntos Clave de la Implementación

1. **Independencia**: Cada dado se genera independientemente con su propio `Math.random()`
2. **Animación**: Se usan 14 ticks de 80ms cada uno para simular el lanzamiento
3. **Sincronización**: Ambos dados se animan y detienen al mismo tiempo
4. **Probabilidad real**: La implementación respeta la distribución matemática real de los dados
5. **Flexibilidad**: El sistema soporta fácilmente expansión a más de 2 dados
6. **Feedback claro**: Los mensajes siempre muestran los valores individuales y el total

---

## Conclusión

La lógica de los dados en este juego es:
- **Matemáticamente correcta**: Usa el algoritmo estándar de generación de números aleatorios
- **Visualmente atractiva**: Proporciona una animación realista del lanzamiento
- **Pedagógicamente útil**: Muestra claramente cómo se calculan los valores con 1 o 2 dados
- **Flexible**: Permite configurar entre 1 y 2 dados sin cambios en la arquitectura del código