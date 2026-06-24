---
name: autonomous-builder
description: "Flujo completo de construccion autonoma: Interrogatorio -> Research -> Construccion -> Verificacion Adversarial."
origin: GAME-MASTER
---

# Autonomous Builder Workflow

Este es el flujo principal para construir cualquier cosa desde cero o arreglar features grandes. Reemplaza el prompting manual por un proceso de ingenieria de producto riguroso.

## FASE 1: Interrogatorio (Intake Loop)

Agente a usar: `interrogator`

REGLA DE ORO: NUNCA construyas nada si no existe un archivo `SPEC.md` en el proyecto.
Si no existe, invoca al agente `interrogator` para que extraiga el objetivo del usuario.
El `interrogator` usara `AskUserQuestion` para hacer preguntas en bloque.
El interrogatorio NO PARA hasta que el `interrogator` tiene suficiente profundidad para que el producto no sea "AI slop" generico.
El resultado de esta fase es la creacion de `SPEC.md`.

## FASE 2: Research & Planning

Agente a usar: `researcher`

Una vez existe `SPEC.md`, invoca al agente `researcher`.
Su trabajo es usar herramientas de busqueda (Tavily) para encontrar productos similares exitosos.
Analiza por que funcionan y que decisiones de diseno/arquitectura tomaron.
El resultado de esta fase es la creacion de `PLAN.md`, que divide la construccion en pasos atomicos e incluye los referentes de calidad.

## FASE 3: Construccion (Execution Loop)

Agente a usar: `coder` (o el especialista correspondiente)

El orquestador genera un HYPER-PROMPT basado en `SPEC.md` y el paso actual de `PLAN.md`.
El constructor ejecuta el codigo.

PROTOCOLO DE ENTREGA OBLIGATORIO:
Antes de pasar el codigo al verificador, el constructor DEBE responder a estas dos preguntas y escribirlas en un archivo `delivery_notes.md`:
1. "Enumera en orden de menor a mayor confianza todo lo que acabas de construir. Que partes asumiste o pueden estar mal?"
2. "Cual es la cosa mas importante que no entiendes de este problema o que podria hacer que todo esto este mal enfocado?"

## FASE 4: Verificacion Adversarial

Agente a usar: `adversarial-verifier`

El verificador recibe: el codigo, `delivery_notes.md`, `SPEC.md` y los referentes.
Tiene dos puertas de rechazo:
1. Tests automaticos: Si los tests fallan, captura el error y devuelve el control al constructor.
2. Criterio de calidad: Compara contra los referentes reales y el SPEC. Si es generico, feo o no cumple, lo rechaza.

Si rechaza, el verificador genera un nuevo HYPER-PROMPT de correccion detallando exactamente que esta mal y por que.
El bucle FASE 3 -> FASE 4 se repite hasta que el verificador aprueba sin objeciones.

Solo cuando aprueba, se marca el paso como completado en `PLAN.md` y se pasa al siguiente.
