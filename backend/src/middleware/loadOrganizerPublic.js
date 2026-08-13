import { prisma } from '../prismaClient.js';

// Carga el organizador dueño del slug de la URL y expone SOLO lo que un
// visitante puede necesitar (nombre del sitio, si hay clave de acceso).
// Nunca adjunta etherscanKey, sheetUrl, passwordHash ni buyerPasscodeHash.
export async function loadOrganizerPublic(req, res, next) {
  const organizer = await prisma.organizer.findUnique({ where: { slug: req.params.slug } });
  // Una cuenta bloqueada se trata como inexistente del lado del comprador
  // — no hay forma de distinguir "no existe" de "está suspendida" desde
  // afuera, para no darle pistas a nadie de qué cuentas fueron bloqueadas.
  if (!organizer || organizer.blocked) return res.status(404).json({ error: 'Sitio no encontrado' });
  req.organizerId = organizer.id;
  req.organizerPublic = {
    siteName: organizer.siteName,
    buyerPasscodeHash: organizer.buyerPasscodeHash,
    profileBio: organizer.profileBio,
    profileAchievements: organizer.profileAchievements,
    profilePhotoUrl: organizer.profilePhotoUrl,
    profileSocialLink: organizer.profileSocialLink,
  };
  req.organizerSecrets = {
    etherscanKey: organizer.etherscanKey,
    buyerPasscodeHash: organizer.buyerPasscodeHash,
  };
  next();
}
