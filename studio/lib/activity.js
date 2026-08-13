export async function logInquiryStatusChange(apiFetch, {
  inquiryId,
  previousStatus,
  nextStatus,
  actorEmail = null
}) {
  if (!inquiryId || !nextStatus || previousStatus === nextStatus) return null;
  return apiFetch('tyt_activity_log', {
    method: 'POST',
    body: JSON.stringify({
      entity_type: 'inquiry',
      entity_id: inquiryId,
      action: 'status_changed',
      actor_email: actorEmail || null,
      meta: { from: previousStatus || null, to: nextStatus }
    })
  });
}

export async function loadInquiryActivity(apiFetch, inquiryId, limit = 10) {
  const rows = await apiFetch(
    `tyt_activity_log?entity_type=eq.inquiry&entity_id=eq.${encodeURIComponent(inquiryId)}&select=*&order=created_at.desc&limit=${limit}`
  );
  return Array.isArray(rows) ? rows : [];
}
