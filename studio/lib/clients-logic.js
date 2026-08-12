export function shouldCreateClientFiche(salesCount, threshold = 3) {
  return Number(salesCount) >= Number(threshold);
}
export function normalizeContactKey({ email, phone, name, company }) {
  if (email) return `email:${String(email).trim().toLowerCase()}`;
  if (phone) return `phone:${String(phone).replace(/\D/g, '')}`;
  return `name:${String(name || '').trim().toLowerCase()}|${String(company || '').trim().toLowerCase()}`;
}
