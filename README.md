# Liquid Glass Navigation — React + TypeScript

Импорт:
import LiquidGlassNav from "./LiquidGlassNav";
import "./LiquidGlassNav.css";

Компонент рассчитан на мобильные устройства:
- активная вкладка двигается только через transform;
- blur не анимируется;
- нет анимаций width/height/left/top/box-shadow;
- SVG иконки встроены, без тяжёлой icon-библиотеки;
- уменьшен gap между вкладками;
- на небольших touch-экранах дорогой backdrop-filter отключается;
- поддерживается prefers-reduced-motion.
