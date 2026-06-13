# Política de seguridad

## Reportar una vulnerabilidad

Si encuentras un fallo de seguridad en Voxnote, **no abras una issue pública**.
Repórtalo de forma privada por uno de estos canales:

- **GitHub Private Vulnerability Reporting** (recomendado): pestaña **Security → Report a vulnerability**
  del repositorio. Es privado y solo visible para los mantenedores.
- **Email:** cgomezfandino@gmail.com

Intentaremos responder en un plazo razonable (best-effort, es un proyecto open source mantenido por una
persona). Por favor incluye pasos de reproducción y el impacto esperado.

## Versiones soportadas

Solo se da soporte de seguridad a la rama `main` (y al último release publicado). Versiones anteriores
no reciben parches.

## Modelo de seguridad (local-first)

Voxnote está diseñado para ejecutarse **100% en local**. Ten en cuenta:

- **La API escucha en `127.0.0.1` por defecto.** No la expongas a `0.0.0.0` ni a una red pública/WiFi
  compartida sin añadir antes autenticación (la auth por token está en el roadmap, Fase 0.5).
- **`output_dir` contiene tus transcripciones, audios y notas.** Mantenlo en una ubicación privada; los
  archivos se crean con permisos `0o600` y el directorio de audio con `0o700`.
- **Nunca subas tu `.env`** ni claves de proveedor (HuggingFace, OpenAI, Google) al repositorio. Usa
  `.env.example` como plantilla. Si filtras una clave, **revócala y rótala de inmediato**.
- **Modelos de terceros:** la diarización descarga modelos de HuggingFace (gated). Se cargan con
  `torch.load`; usa solo checkpoints de fuentes en las que confíes.

## Buenas prácticas para quien despliega

- Rota periódicamente las claves de los proveedores LLM.
- Mantén las dependencias al día (Dependabot está activo en este repo).
- No proceses audio sensible con proveedores en la nube (OpenAI/Google) si necesitas privacidad total;
  usa Ollama local.
