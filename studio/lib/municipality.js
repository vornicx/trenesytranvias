export function detectMunicipality(...parts) {
  const blob = parts.filter(Boolean).join(' ').toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '');
  return blob.includes('ayuntamiento');
}
