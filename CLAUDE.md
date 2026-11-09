# Castillo de Arena: instrucciones para Claude

## Quién trabaja aquí
Diego es el autor del juego. No es programador: decide el diseño y prueba, Claude escribe el código.
- Habla siempre en español de España.
- Explica los cambios en términos de juego ("ahora los bebés grandes van más lentos"), no de código, salvo que pregunte.
- Si una petición es ambigua o tiene un coste oculto (rendimiento en móvil, romper otra mecánica), dilo antes de hacerla.
- Haz cambios pequeños, uno por petición, y deja un commit por cambio con mensaje en español.

## El juego
Defensa de un castillo de arena en la playa (referencia: el juego simplificado de los anuncios de Kingshot). Un niño en bañador dispara solo bolas de arena a los bebés cercanos. Los bebés se van llorando y sueltan conchas. Las conchas se gastan poniéndose encima de casillas fijas del suelo: las conchas vuelan de la mochila a la casilla.

Documento de diseño (fuente de verdad): https://claude.ai/artifact/4BJxLRwXjnyZ9P7hLfEMyb

## Decisiones cerradas
- 2D dibujado con código en un canvas, sin librerías ni compilación. Nada de 3D.
- Móvil en vertical. La playa es más grande que la pantalla y la cámara sigue al niño; hay que moverse para ver por dónde vienen los bebés.
- Vista fija (la cámara nunca gira): el suelo se ve desde arriba en picado y los personajes de frente. Lo que está más abajo en pantalla tapa a lo que está más arriba.
- Personajes kawaii del elenco (`js/chars.js`): contorno grueso, ojos de punto, 5 aspectos de bebé, niño mayor con sombrero de paja y bañador naranja.
- Construcciones y mejoras en casillas fijas; las mejoras, cerca del castillo. Murallas y agujeros con amigos en sitios predefinidos.
- Pantalla de inicio con botón de empezar, y botón de pausa.
- Destino: web móvil (GitHub Pages) primero; APK/AAB más adelante.

## Estructura
- `index.html`: la página. Un canvas a pantalla completa y capas HTML para textos.
- `css/style.css`: estilos.
- `js/chars.js`: dibujo de los personajes (niño y bebés). Cada función dibuja con los pies en el origen.
- `js/game.js`: el juego.
  - Unidades: "píxeles de playa", 20 px = 1 m. En pantalla se ven al menos 360 x 640.
  - Datos ajustables arriba del archivo: `WORLD`, `SHORE`, `CASTLE`, `KID_SPEED`, `CHAR_SCALE`.
  - `update(dt)` simula, `render()` dibuja. El dibujo ordena por la coordenada y del pie.

## Cómo probar
No hay build. En local: `python3 -m http.server` y abrir `http://localhost:8000`. Se juega arrastrando el dedo (joystick donde tocas) o con WASD/flechas.
Objetivo: que vaya fluido en móvil en vertical.
