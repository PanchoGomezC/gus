# QC REPORT — VIDEO_9x16_40s_VOZ_GUIA.mp4

Medido sobre el archivo exportado con FFprobe/FFmpeg (`scripts/qc.sh`), no sobre lo que informó el renderizador.

## Parámetros técnicos

| Parámetro | Requisito | Medido | Estado |
|---|---|---|---|
| Duración | ≤ 40,00 s (objetivo 39,6) | **39,600 s** (vídeo y audio) | ✅ |
| Resolución | 1080 × 1920 | 1080 × 1920 · DAR 9:16 | ✅ |
| FPS | 60 (30 de respaldo) | **60/1 constante**, 2.376 fotogramas | ✅ |
| Códec de vídeo | H.264 | H.264 High · CRF 16 · preset slow · ≈ 3,2 Mb/s | ✅ |
| Pixel format | yuv420p | yuv420p · BT.709 | ✅ |
| Audio | AAC estéreo 48 kHz | AAC-LC · 2 canales · 48.000 Hz · ≈ 290 kb/s | ✅ |
| Loudness integrada | adecuada para redes | **−14,2 LUFS** (LRA 1,7 LU) | ✅ |
| True peak | ≈ −1 dBTP o menos | **−1,7 dBTP** | ✅ |
| Contenedor | MP4 | MP4 con `faststart` (17,5 MB) | ✅ |

## Detecciones automáticas

| Prueba | Resultado |
|---|---|
| Fotogramas negros (`blackdetect`, ≥ 0,05 s) | Ninguno. El fotograma 0 muestra el cursor de forma intencionada |
| Fotogramas congelados (`freezedetect`, ≥ 1 s) | Ninguno (el plano final mantiene una deriva de cámara casi imperceptible) |
| Silencios de audio (≥ 0,8 s, −55 dB) | Ninguno. La suspensión previa al cierre dura ≈ 0,3 s, a propósito |
| Clipping | No: pico de muestra −1,9 dBFS, true peak −1,7 dBTP |
| Espectrograma | Sin clics ni artefactos. El subgrave se filtró: pads con HPF a 90 Hz y máster con HPF a 32 Hz |

## Inspección visual (fotogramas extraídos del MP4)

Segundos 0, 4, 8, 13, 18, 24, 30, 35 y 39 (`build/qc_frames/`), más hojas de contacto a 2 fps de toda la pieza y recortes a resolución completa.

| s | Contenido | Observación |
|---|---|---|
| 0 | Cursor sobre negro profundo | Intencionado: no es un fotograma negro |
| 4 | ANTES · RESPUESTAS + conversación | Texto completo, sin cortes |
| 8 | CLAUDE · documento y hoja nacen de la línea | OK |
| 13 | CONTEXTO · láminas de vidrio sobre el dashboard | Etiquetas legibles, KPIs atenuados a propósito |
| 18 | AGENTES · anillo desplegado | Nodo central limpio (corregido un punto residual del trazo) |
| 24 | CHATGPT · tres tarjetas | OK |
| 30 | La tarjeta se compacta mientras entra «TRES EXPERIENCIAS» | Fotograma de transición, en movimiento |
| 35 | LA IA PROPONE. + geometría | OK |
| 39 | LA IA PROPONE. / TÚ DECIDES. / firma | «TÚ DECIDES.» está en pantalla 3,45 s antes del final |

**Legibilidad en móvil:** palabra monumental de 118–124 px, etiquetas de capítulo de 30 px, rótulos de nodos de 27 px, ejes de matriz de 24 px y firma de 33 px. Todo el texto principal queda entre y = 310 y y = 1.530 (zona segura de Reels, TikTok y Shorts). La única letra pequeña es el rótulo «DATOS ILUSTRATIVOS» (17 px), aviso secundario.

**Ortografía:** revisada en todos los textos en pantalla (tildes en VERIFICACIÓN, INSTRUCCIÓN, PLANIFICACIÓN, ACCIÓN, EVOLUCIÓN, TÚ, GÓMEZ; signos «¿…?»; formato numérico es-ES «+12,4 %», «1.284»).

**Continuidad:** no hay cortes. Cada actor visual entrega su geometría al siguiente en la misma posición de pantalla (línea → horizonte → línea base; insignia → nodo central; nodos → tarjetas; tarjeta → triángulo; figuras → anillos).

## Control de calidad creativa

| Dimensión | Evaluación |
|---|---|
| Impacto visual | Paleta contenida, vidrio, luz de estudio y transformaciones continuas. Sin efectos de plantilla ni destellos para ocultar transiciones |
| Continuidad | Ocho escenas y una sola toma aparente; el movimiento cuenta la historia sin sonido (respuesta → sistema → datos → verificación → ciclo → decisión) |
| Claridad narrativa | Una idea por momento; el texto en pantalla resume, no repite la locución |
| Profesionalismo | Una tipografía, una familia de materiales, un sistema de cámara y un tempo musical (108 BPM) |
| Diferenciación | 100 % diseñado y programado. Sin imágenes generativas, robots, cerebros ni código cayendo |

## Correcciones aplicadas durante el QC

1. Las palabras se solapaban durante el cambio de título → empuje por máscara sincronizado.
2. Las etiquetas de las láminas de vidrio chocaban con los KPIs → separación en profundidad y KPIs atenuados.
3. Formato de miles («1284» → «1.284»).
4. Textos secundarios agrandados para lectura en teléfono.
5. Transición tarjeta → triángulo rediseñada (compactar y luego viajar) en lugar de una forma intermedia torpe.
6. Anillos 3D: trazos segmentados con «cuentas» → trazados continuos agrupados por profundidad.
7. Trazos de longitud cero con extremo redondeado dejaban puntos residuales → eliminados.
8. Mezcla: música +10 dB, efectos +12 dB, compresión de voz, recorte del subgrave para no saturar altavoces de teléfono.

## Pendientes y limitaciones

| # | Pendiente | Motivo | Cómo cerrarlo |
|---|---|---|---|
| 1 | **Voz final de ElevenLabs no incorporada** | Las 4 tomas existen en tu cuenta (flow `pUnhGJwdeoLV4uhUelsU`), pero el conector devolvió 403 al leerlas y la red bloquea `api.elevenlabs.io` | Descarga la mejor toma → `python scripts/align_vo.py toma.mp3` → `VO=public/assets/audio/vo_final.wav bash scripts/render.sh` |
| 2 | Comparación de las dos interpretaciones | No pude escucharlas por el mismo bloqueo | Escúchalas en el flow (criterios en VOICEOVER_ELEVENLABS.txt) |
| 3 | Logotipo oficial NobleProg | No estaba disponible en el entorno | Añadir el PNG autorizado en `src/scenes/Closing.tsx` |
| 4 | Fuentes originales de los cursos y Design System | No estaban en el entorno; se trabajó con el resumen del brief | Facilitar los archivos si se desea ajustar el contenido |
| 5 | Pronunciación de la voz guía | Kokoro pronuncia de forma aproximada algunas palabras («dashboards», «ChatGPT») | Se resuelve con la voz final |
| 6 | Licencia de Remotion | Gratuita para personas y empresas de hasta 3 empleados | Si NobleProg reutiliza el proyecto internamente, revisar si necesita Company License |
