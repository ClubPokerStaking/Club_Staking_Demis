// Muestra ROI estimado menos el sobreprecio que se cobra ("markup"), para
// que se vea de un vistazo si el comprador sigue ganando después de pagar
// el markup, o si el markup se come el ROI esperado.
//
// variant="hero" es el tratamiento destacado (color propio + tipografía
// distinta) para el número que más importa mostrar: la ventaja neta del
// paquete completo. fullWidth lo convierte en un banner de ancho
// completo en vez de una píldora — el tratamiento más notorio.
// variant="inline" es la versión chica para cada torneo dentro del desglose.
export default function EdgeBadge({ edgePercent, variant = 'inline', label, fullWidth = false }) {
  if (edgePercent == null) return null;
  const positive = edgePercent >= 0;

  if (variant === 'hero') {
    const heroCls = ['pk-edge-hero', fullWidth ? 'pk-edge-hero-full' : '', positive ? '' : 'pk-edge-hero-negative'].filter(Boolean).join(' ');
    return (
      <span className={heroCls}>
        <span className={`pk-edge-hero-label ${positive ? 'pk-jade' : 'pk-brick'}`}>{label || 'Ventaja del comprador'}</span>
        <span className={`pk-edge-hero-value ${positive ? 'pk-jade' : 'pk-brick'}`}>{positive ? '+' : ''}{edgePercent}%</span>
      </span>
    );
  }

  const cls = positive ? 'pk-jade pk-bg-jade-soft' : 'pk-brick pk-bg-brick-soft';
  return (
    <span className={`${cls} px-2 py-0.5 text-[10px] rounded-full font-semibold whitespace-nowrap`}>
      {positive ? '+' : ''}{edgePercent}% {positive ? 'a tu favor' : 'en contra'}
    </span>
  );
}
