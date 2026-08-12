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

export function serializeLeg(leg) {
  return {
    id: leg.id,
    name: leg.name,
    buyInMicro: leg.buyInMicro,
    markup: leg.markup,
    roiEstimado: leg.roiEstimado,
    maxBullets: leg.maxBullets,
    pricePerPercentMicro: legPricePerPercentMicro(leg),
  };
}
