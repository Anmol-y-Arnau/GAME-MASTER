# Permissions (Permisos de Accion Autonoma)

Este archivo lista las acciones que el agente tiene permiso para realizar SIN PREGUNTAR al usuario.
Si una accion es irreversible (pagos, enviar emails a clientes, publicar en redes) y NO esta en esta lista, el agente DEBE preguntar primero.

| Accion | Nivel de autonomia |
|---|---|
| Leer correos de Gmail | Autonomo |
| Leer mensajes de WhatsApp | Autonomo |
| Navegar por internet y extraer informacion | Autonomo |
| Modificar archivos locales en el directorio del proyecto | Autonomo |
| Hacer commits en git locales | Autonomo |
| Enviar mensajes de WhatsApp | PREGUNTAR ANTES |
| Enviar emails | PREGUNTAR ANTES |
| Realizar pagos o compras | PREGUNTAR ANTES |
| Publicar en redes sociales | PREGUNTAR ANTES |
| Hacer git push a origin | PREGUNTAR ANTES |
