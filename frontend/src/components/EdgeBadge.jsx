// Muestra ROI estimado menos el sobreprecio que se cobra ("markup"), para
// que se vea de un vistazo si el comprador sigue ganando después de pagar
// el markup, o si el markup se come el ROI esperado.
export default function EdgeBadge({ edgePercent, size = 'sm' }) {
  if (edgePercent == null) return null;
  const positive = edgePercent >= 0;
  const cls = positive ? 'pk-gold pk-bg-gold-soft' : 'pk-brick pk-bg-brick-soft';
  const pad = size === 'lg' ? 'px-3 py-1.5' : 'px-2 py-0.5';
  const text = size === 'lg' ? 'text-sm' : 'text-[10px]';
  return (
    <span className={`${cls} ${pad} ${text} rounded-full font-semibold whitespace-nowrap`}>
      {positive ? '+' : ''}{edgePercent}% {positive ? 'a tu favor' : 'en contra'}
    </span>
  );
}
