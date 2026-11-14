# Castillo de Arena: instrucciones para Claude

## Quién trabaja aquí
Diego es el autor del juego. No es programador: decide el diseño y prueba, Claude escribe el código.
- Habla siempre en español de España.
- Explica los cambios en términos de juego ("ahora los bebés grandes van más lentos"), no de código, salvo que pregunte.
- Si una petición es ambigua o tiene un coste oculto (rendimiento en móvil, romper otra mecánica), dilo antes de hacerla.
- Haz cambios pequeños, uno por petición, y deja un commit por cambio con mensaje en español.
- En cada commit sube el número y la fecha de `VERSION` (al principio de `js/game.js`): se ve en la portada y en la pausa, y así Diego sabe si tiene abierta la última.
- Sube cada commit directamente a `main`, sin ramas ni pull requests: Diego prefiere no tener que aprobar nada. Si hay que deshacer algo, se hace con un commit de reversión.

## El juego
Defensa de un castillo de arena en la playa (inspirado en Kingshot). Un niño en bañador dispara bolas de arena automáticamente a los bebés que vienen a destrozar el castillo. Los bebés se van llorando y sueltan conchas. Las conchas se gastan en el menú de mejoras, que se abre solo al acabar cada oleada (la siguiente empieza al cerrarlo): cadencia, daño, alcance, imán de conchas, reclutar amigos que disparan desde agujeros, entrenarlos y reparar. Cada amigo reclutado lo coloca el jugador antes de la siguiente oleada: lleva al niño al sitio y pulsa "Cavar aquí" (solo entre el castillo y el mar, fuera de la orilla y a 2,5 m o más de otro amigo). Las conchas hay que recogerlas; al acabar la oleada hay 3 s y las que quedan se pierden. No hay recuadros en el suelo (se probaron y se quitaron). No hay muralla (se quitó a petición de Diego).

## Estructura
- `index.html`: página y capas de interfaz (marcador, carteles, fin de partida).
- `css/style.css`: estilos.
- `js/game.js`: todo el juego, en 2D con Canvas y dibujado con código (sin librerías ni compilación).
  - Todo trabaja en "píxeles de playa" (20 px = 1 m). La playa mide 600x640 y la pantalla enseña 360x640: la cámara (`cam`) sigue al niño solo de lado a lado. Detrás del castillo no hay playa de sobra porque por ahí no vienen bebés. Vista cenital inclinada fija: la altura se dibuja hacia arriba (y - h) y se pinta de atrás adelante ordenando por y.
  - Datos ajustables: `TYPES` (bebés), `UPG` (mejoras), `FRIEND_COST`, `SHOP` (orden del menú de mejoras).
  - `update(dt)` simula, `render(now)` dibuja. El fondo estático se pinta una vez en `buildBg()`.

## Cómo probar
No hay build. Abrir `index.html` en el navegador (en local, mejor con un servidor simple: `python3 -m http.server`). Se juega con el dedo (joystick al arrastrar) o con WASD/flechas.
Objetivo: que funcione fluido en móvil en vertical.
