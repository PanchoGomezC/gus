# Créditos y licencias

## Herramientas realmente utilizadas

| Herramienta | Uso | Licencia |
|---|---|---|
| Remotion 4.0.535 | Composición y render del vídeo | Remotion License: gratuita para personas físicas y empresas de hasta 3 empleados; **empresas mayores necesitan una Company License** (remotion.pro). Verifica el caso de NobleProg si el proyecto se reutiliza dentro de la empresa. |
| React 18, TypeScript | Componentes de animación | MIT / Apache-2.0 |
| Chromium (Playwright) | Navegador de render | BSD |
| FFmpeg 6.1 (libx264, AAC nativo) | Máster, mux, QC | LGPL/GPL (uso como herramienta) |
| numpy, scipy, soundfile | Síntesis y mezcla de audio | BSD |
| fontTools | Métricas tipográficas | MIT |
| ImageMagick | Textura de grano, QC | ImageMagick License |
| Kokoro TTS (kokoro-onnx, modelo v1.0) | **Solo voz guía temporal** | Apache-2.0 |
| ElevenLabs (conector MCP) | 4 tomas de la locución final generadas en tu cuenta (no incorporadas: ver VOICEOVER_ELEVENLABS.txt) | Según tu plan de ElevenLabs; los audios generados con plan de pago admiten uso comercial |

## Recursos de la pieza

| Recurso | Origen | Licencia / derechos |
|---|---|---|
| Tipografía Montserrat (400–800) | `@fontsource/montserrat` 5.1.0 | SIL Open Font License 1.1 (`public/assets/fonts/OFL-Montserrat.txt`) |
| Música original | Compuesta y sintetizada por código (`scripts/audio_design.py`) | Original, creada para esta pieza; sin samples de terceros |
| Efectos de sonido | Sintetizados por código (`scripts/audio_design.py`) | Originales |
| Textura de grano | Generada con ImageMagick (ruido procedural) | Original |
| Gráficos, dashboard, nodos, geometrías | Vectores y CSS 3D programados | Originales |
| Datos del dashboard y la matriz | **Sintéticos e ilustrativos** (rotulados «DATOS ILUSTRATIVOS») | No representan resultados de ninguna empresa |

## Marcas y restricciones

- «Claude», «ChatGPT» y «NobleProg» aparecen **solo como texto** (uso nominativo, para nombrar los temas de las formaciones). No se usan logotipos, interfaces ni elementos gráficos de Anthropic, OpenAI ni de ningún cliente.
- No se usa el logotipo oficial de NobleProg porque no estaba disponible en el entorno. Si se dispone del archivo y de autorización, puede añadirse en `src/scenes/Closing.tsx`.
- No aparecen nombres de participantes, grabaciones ni marcas de clientes.
- La referencia a Apple es solo de calidad de ejecución: no se copian campañas, música, interfaces ni elementos distintivos.
- No se utilizaron imágenes ni vídeo generativos.
