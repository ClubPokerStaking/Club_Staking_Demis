// Un paquete no guarda su propio precio: se calcula siempre a partir de
// los torneos que lo componen, para que nunca quede desincronizado si se
// edita un torneo incluido.
export function legPricePerPercentMicro(leg) {
  return Math.round((leg.buyInMicro * leg.markup) / 100);
}

export function packagePricePerPercentMicro(legs) {
  return legs.reduce((sum, leg) => sum + legPricePerPercentMicro(leg), 0);
}

export function packageBuyInMicro(legs) {
  return legs.reduce((sum, leg) => sum + leg.buyInMicro, 0);
}

// Inversión total si se usaran todas las balas (re-entries) de cada
// torneo incluido — informativo, no cambia el precio por 1%.
export function packageMaxPossibleMicro(legs) {
  return legs.reduce((sum, leg) => sum + leg.buyInMicro * leg.maxBullets, 0);
}

// Promedio simple del ROI estimado de cada torneo incluido (ignora los
// que no tienen ROI cargado). Es una referencia informativa para el
// comprador, no afecta el precio.
export function packageAvgRoiPercent(legs) {
  const withRoi = legs.filter((l) => l.roiEstimado != null);
  if (withRoi.length === 0) return null;
  const sum = withRoi.reduce((s, l) => s + l.roiEstimado, 0);
  return Math.round((sum / withRoi.length) * 10) / 10;
}

// El markup expresado como % de sobreprecio sobre el valor nominal del
// buy-in (markup 1.20x → 20%, markup 1.00x → 0%).
export function legMarkupPercent(leg) {
  return Math.round((leg.markup - 1) * 1000) / 10;
}

// Cuánto le queda de ventaja al comprador después de pagar el sobreprecio:
// ROI estimado del torneo menos el % de sobreprecio que se le cobra. Si es
// positivo, el comprador sale ganando aun pagando el markup; si es
// negativo, el markup se come (o supera) el ROI esperado.
export function legEdgePercent(leg) {
  if (leg.roiEstimado == null) return null;
  return Math.round((leg.roiEstimado - legMarkupPercent(leg)) * 10) / 10;
}

export function packageAvgEdgePercent(legs) {
  const edges = legs.map(legEdgePercent).filter((e) => e != null);
  if (edges.length === 0) return null;
  return Math.round((edges.reduce((s, e) => s + e, 0) / edges.length) * 10) / 10;
}

export function serializeLeg(leg) {
  return {
    id: leg.id,
    name: leg.name,
    buyInMicro: leg.buyInMicro,
    markup: leg.markup,
    markupPercent: legMarkupPercent(leg),
    roiEstimado: leg.roiEstimado,
    edgePercent: legEdgePercent(leg),
    maxBullets: leg.maxBullets,
    pricePerPercentMicro: legPricePerPercentMicro(leg),
  };
}
