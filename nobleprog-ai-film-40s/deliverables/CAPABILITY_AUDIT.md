# Auditoría de capacidades — 13/10/2026

Auditoría hecha **antes** de construir, verificada con comandos y llamadas reales (no supuestas).

## Entorno

| Recurso | Estado verificado | Uso en la producción |
|---|---|---|
| Node.js 22.22 / npm 10.9 | Disponible | Remotion, TypeScript, scripts |
| Remotion 4.0.535 (npm) | Instalable desde registry.npmjs.org | **Motor principal de animación** |
| Chromium (Playwright, headless shell 1194) | Preinstalado | Renderizado de Remotion (no se descargó Chrome) |
| `remotion.media` (descarga de Chrome de Remotion) | **Bloqueado** por la red | Se configuró el Chromium local |
| FFmpeg / FFprobe 6.1.1 | Disponible | Máster de audio, mux, QC técnico, extracción de fotogramas |
| ImageMagick | Disponible | Textura de grano, hojas de contacto de QC |
| Python 3.13 + venv (numpy, scipy, soundfile, fonttools) | Instalable desde PyPI | Síntesis musical, diseño sonoro, mezcla, métricas tipográficas |
| Blender | **No instalado** | No necesario: el 3D se resolvió con CSS 3D + proyección propia en SVG |
| Three.js / React Three Fiber | Instalables | **Descartados**: WebGL por software es lento y no aportaba más que el 3D vectorial nítido |
| Montserrat (OFL) vía `@fontsource/montserrat` | Disponible | Tipografía principal del Design System NobleProg |
| CPU / RAM | 4 núcleos · 15 GB | Render 60 fps ≈ 7 min |

## Conectores e integraciones

| Integración | Resultado real |
|---|---|
| **ElevenLabs (MCP)** | `list_voices` ✔ · `generate_speech` ✔ (4 tomas generadas, ≈2.224 créditos) · **lectura de resultados ✘ 403 Forbidden** (`get_flow_run_status`, `get_flow`, `get_flow_node`, `show_flow_results`, `get_flow_node_types`, `get_model_guide`). Las tomas existen en tu cuenta pero no pudieron descargarse aquí. |
| API ElevenLabs directa | `api.elevenlabs.io` inaccesible desde la red del entorno; no hay `ELEVENLABS_API_KEY` configurada |
| Música / SFX de ElevenLabs | Mismo bloqueo de lectura → no se generaron (se habrían cobrado créditos sin poder recuperar el audio) |
| Skills `music`, `sound-effects`, `speech-engine` | Requieren API key de ElevenLabs → no utilizables aquí |
| Hugging Face | Bloqueado por la red |
| GitHub releases | Accesible → modelo abierto Kokoro TTS para la **voz guía** |
| Generadores de imagen/vídeo (ElevenLabs Creative, Canva, Adobe) | Disponibles en el catálogo pero **no usados a propósito**: el brief limita lo generativo a ≤10 % y prohíbe texto generado por modelos de imagen; todo el material visual es vectorial y programado |

## Fuentes de contenido

| Fuente pedida | Estado |
|---|---|
| CURSO_CLAUDE_EMPRESAS_CONTENIDO_COMPLETO.md | No presente en el entorno |
| NP-2026-004 · Charla GPT — fuente maestra | No presente |
| NOBLEPROG_DESIGN_SYSTEM_GUIA_MAESTRA(1).md / NOBLEPROG_DS_REFERENCIA_VISUAL.pdf | No presentes |
| LOGO NOBLEPROG AZUL.png / BLANCO.png | **No presentes** → no se usa logotipo; firma tipográfica «NOBLEPROG» |
| Archivo en el repositorio | Solo `odyssey-logos-vector_Mesa-de-trabajo-1.png` (logo de *The Odyssey Program Mexico*, ajeno a esta pieza) → **no utilizado** |

Se trabajó con el resumen factual incluido en el brief. No se afirma haber revisado documentos que no estaban disponibles.

## Pipeline elegido (combinación mínima)

```
timeline.ts (fuente única de verdad de tiempos)
  ├─ Remotion + React + SVG + CSS 3D  → imagen 1080×1920 · 60 fps
  └─ export-cues.ts → audio_design.py (numpy) → master_audio.sh (FFmpeg)
                                  └─ FFmpeg mux → MP4 H.264 + AAC 48 kHz
```
