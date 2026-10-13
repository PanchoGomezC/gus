# DE RESPONDER A ACTUAR — NobleProg AI Motion Film (40 s)

Film vertical de motion graphics (1080×1920 · 60 fps · 39,6 s) sobre tres experiencias formativas de Francisco Gómez para NobleProg en 2026: **Claude para empresas**, **webinar de agentes de IA** y **ChatGPT Enterprise para liderazgo**.

> **Idea:** la IA evoluciona de responder preguntas a ejecutar trabajo, y la decisión sigue siendo humana.
> **LA IA PROPONE. TÚ DECIDES.**

## Entregables (`deliverables/`)

| Archivo | Contenido |
|---|---|
| `VIDEO_9x16_40s_VOZ_GUIA.mp4` | Vídeo completo con imagen, música y efectos finales. **Usa voz guía temporal** (ver abajo) |
| `VOICEOVER_ELEVENLABS.txt` | Texto exacto, estado de las tomas de ElevenLabs, mapa de tiempos e instrucciones |
| `SUBTITULOS.srt` | Subtítulos sincronizados (el master no lleva subtítulos quemados) |
| `STORYBOARD.md` | Storyboard tal como se construyó, con tiempos reales |
| `CAPABILITY_AUDIT.md` | Auditoría de herramientas, conectores y fuentes |
| `CREDITS_LICENSES.md` | Herramientas, licencias y restricciones |
| `QC_REPORT.md` | Control de calidad técnico y creativo |
| `PREVIEW_01-03.png` | Fotogramas de muestra |
| `stems/` | Pistas separadas: voz, música y efectos (48 kHz, 24 bit) |

## Por qué «VOZ_GUIA»

El conector de ElevenLabs generó 4 tomas de la locución final en la cuenta del usuario, pero sus herramientas de lectura respondieron 403 y la red del entorno bloquea `api.elevenlabs.io`, así que no se pudieron descargar. El vídeo usa una voz guía local (Kokoro TTS, Apache-2.0) que **no es** la voz final. Para cerrar la pieza:

```bash
python scripts/align_vo.py ruta/a/toma_elevenlabs.mp3      # re-sincroniza todo el montaje
VO=public/assets/audio/vo_final.wav bash scripts/render.sh  # → deliverables/VIDEO_FINAL_9x16_40s.mp4
```

## Proyecto

```
src/
  timeline.ts              fuente única de verdad de tiempos (imagen + sonido)
  timing.json              tiempos por frase de la locución
  theme.ts                 paleta, Montserrat, métricas tipográficas
  Film.tsx · Root.tsx      composición (Film = 60 fps, Film30 = borrador)
  components/Background    luz de estudio, halo, haz diagonal, viñeta, grano
  components/Type          sistema tipográfico (etiqueta + palabra monumental)
  scenes/PromptToSystem    actor A · escenas 01–02
  scenes/DataToDashboard   actor B · escenas 03–04
  scenes/AgentsToDecision  actor C · fin de 04, escenas 05–06
  scenes/Convergence       actor D · escenas 07–08 (geometría)
  scenes/Closing           tipografía de cierre
  lib/anim.ts · lib/proj.ts  curvas, resortes, mini motor 3D para SVG
scripts/
  render.sh        pipeline completo → MP4
  remux.sh         rehace solo el audio y lo une a la imagen ya renderizada
  voice_guide.py   voz guía (Kokoro) + timing.json
  align_vo.py      alinea una locución nueva y reescribe timing.json
  export-cues.ts   exporta los cues del timeline para el sonido
  audio_design.py  música original + SFX + mezcla con ducking
  master_audio.sh  -14 LUFS · true peak ≤ -1,5 dBTP
  make_srt.py      subtítulos
  stills.mjs       fotogramas de control
```

### Requisitos

- Node 22+, FFmpeg, Python 3.11+ con `numpy scipy soundfile` (y `kokoro-onnx` solo para regenerar la voz guía).
- `npm install`
- Remotion usa el Chromium indicado en `remotion.config.ts` (variable `REMOTION_BROWSER` para cambiarlo).

### Comandos

```bash
npm run studio                                   # editor visual de Remotion
bash scripts/render.sh                           # render final 60 fps
bash scripts/render.sh Film30 build/draft.mp4    # borrador 30 fps
node scripts/stills.mjs out/ Film30 4 8 13 18    # fotogramas de control
```

Todos los datos visibles (dashboard, matriz) son sintéticos e ilustrativos.
