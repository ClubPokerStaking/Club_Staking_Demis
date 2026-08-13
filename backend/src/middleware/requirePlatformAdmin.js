// No hay usuarios/cuentas para el dueño de la plataforma — es una sola
// persona, así que alcanza con una clave compartida (separada de
// REGISTRATION_SECRET) enviada en un header, igual de simple que el resto
// de los secretos de este proyecto.
export function requirePlatformAdmin(req, res, next) {
  const required = process.env.PLATFORM_ADMIN_SECRET;
  if (!required) {
    return res.status(503).json({ error: 'Panel superadmin no configurado (falta PLATFORM_ADMIN_SECRET)' });
  }
  const given = req.get('x-platform-admin-key');
  if (given !== required) {
    return res.status(401).json({ error: 'Clave incorrecta' });
  }
  next();
}
