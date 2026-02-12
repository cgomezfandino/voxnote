# 🎨 Preview de Temas - Voxnote

## Opción A: Tema Oscuro (Actual)
```css
Fondo: #0D0D12 (Casi negro)
Cards: #16161F (Gris muy oscuro)
Texto: #FAFAFA (Blanco)
Acento: #9F7AEA (Púrpura neón)
```

**Pros:**
- ✅ Muy moderno, look "techie"
- ✅ Colores brillantes resaltan más
- ✅ Reduce fatiga visual en ambientes oscuros

**Contras:**
- ❌ Puede ser agresivo en ambientes con luz
- ❌ Algunos usuarios prefieren interfaces claras
- ❌ Menos "profesional" para entornos corporativos

---

## Opción B: Tema Claro (Nuevo)
```css
Fondo: #F8FAFC (Gris muy claro)
Cards: #FFFFFF (Blanco puro)
Texto: #0F172A (Gris oscuro, casi negro)
Acento: #7C3AED (Púrpura vibrante)
```

**Pros:**
- ✅ Más profesional, limpio
- ✅ Mejor para uso prolongado (menos fatiga)
- ✅ Se integra mejor con herramientas de oficina
- ✅ Accesible para más usuarios

**Contras:**
- ❌ Menos "diferenciador" visual
- ❌ Parece más "corporativo" que "techie"

---

## 🎯 Recomendación

Para una herramienta de productividad como Voxnote que se usa durante reuniones de trabajo, **recomiendo el tema CLARO** porque:

1. Se integra mejor con Slack, Notion, email, etc.
2. Menos distractor durante llamadas
3. Imprime bien si necesitas las notas en papel
4. Más accesible para usuarios mayores o con problemas de visión

---

## 🚀 Para implementar el tema claro en Streamlit

```python
# En ui.py, cambia la importación:
from voxnote.ui_styles_light import (
    get_custom_css,
    get_header_html,
    get_step_html,
)

# En vez de:
# from voxnote.ui_styles_v2 import ...
```

Y listo. Todo lo demás funciona igual.

---

## 🤔 ¿Qué prefieres?

- **A) Mantener oscuro** (más dramático)
- **B) Cambiar a claro** (más profesional)
- **C) Ambos con toggle** (más trabajo pero mejor UX)

¿Cuál te gusta más?
