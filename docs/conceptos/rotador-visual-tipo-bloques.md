# Concepto: Rotador Visual Tipo Bloques

## Objetivo general
Crear un módulo rotatorio de información que funcione como un "carrusel" visual basado en bloques geométricos, pensado para dashboards o pantallas informativas donde sea clave mostrar múltiples piezas de contenido sin abrumar al usuario.

## Principios clave
- **Modularidad:** Cada bloque es autosuficiente; puede mostrar métricas, mensajes o elementos multimedia sin depender de los demás.
- **Ritmo visual:** El sistema rota bloques completos con transiciones suaves que mantienen la atención sin distraer.
- **Jerarquía clara:** Tipografías y colores diferenciados para títulos, datos y acciones, garantizando legibilidad inmediata.
- **Adaptabilidad:** Distribución responsive que reorganiza la cuadrícula según el dispositivo, manteniendo la rotación como eje principal.

## Arquitectura visual
1. **Contenedor principal**
   - Ocupa el ancho disponible del módulo o sección.
   - Fondo neutro (#0E1520) con blur ligero (backdrop-filter) para separar el rotador del resto del layout.
   - Paddings generosos (24px desktop, 16px mobile) y esquinas redondeadas (24px).
2. **Header del rotador**
   - Título del conjunto (ej. "Próximas campañas") y acciones rápidas (paginador manual, botón de pausa/play).
   - Indicador de progreso con barras finas que muestran cuántos bloques hay en la rotación.
3. **Zona de bloques**
   - Grid adaptable: 2x2 en desktop, 1x3 o 1x2 en tablet, carrusel lineal en mobile.
   - Cada bloque adopta esquema card con sombra suave y borde de 1px con degradado sutil.
   - Colores base sugeridos para diferenciar categorías: azul profundo (#1F3A93), verde lima (#3AE374), naranja cálido (#FF793F), violeta eléctrico (#6C5CE7).
   - Iconografía minimalista en esquina superior para reconocimiento rápido.
4. **Footer contextual**
   - Timeline o chips de estado relacionados con el contenido mostrado.
   - CTA secundaria (ej. "Ver más detalles").

## Comportamiento e interacción
- **Rotación automática:** Intervalos de 6-8 segundos, con transición de deslizamiento horizontal + fade.
- **Interacción manual:** Controles para avanzar/retroceder bloques. Al interactuar, pausar la rotación durante 15 segundos.
- **Hover/Focus:** Bloques elevan sombra y amplían contenido (ej. mostrar métricas adicionales o mini gráficas).
- **Accesibilidad:** Navegación por teclado con focus visible. Anunciar los cambios de bloque con `aria-live="polite"`.

## Variaciones
- **Modo compacto:** Un solo bloque destacado que rota contenido y muestra thumbnails de los siguientes.
- **Modo storytelling:** Secuencia de bloques conectados que narran un proceso; cada bloque incluye breadcrumbs.
- **Modo comparativo:** Dos columnas sincronizadas que rotan en espejo para contrastar datos.

## Integración con Corp
- Usar componentes existentes de tarjetas y tipografías para mantener coherencia visual.
- Conectar la rotación a la fuente de datos de turnos/campañas (`/src/data`) para mostrar información viva.
- Configurar la animación con Framer Motion o CSS `@keyframes` reutilizando tokens de tiempo definidos en Tailwind config.

## Entregables sugeridos
- Mockups en Figma con breakpoints (mobile, tablet, desktop).
- Librería de componentes (Bloque base, Header, Footer, Controles).
- Prototipo interactivo que muestre la rotación automática y manual.
- Guía de uso que defina tonos, iconografía y espacios recomendados.
