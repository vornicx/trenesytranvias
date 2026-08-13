export function createMarkInquiryWon({ apiFetch }) {
  return async function markInquiryWon(inquiry, { amountEur, concept } = {}) {
    if (!inquiry?.id) throw new Error('inquiry_required');
    const amount = amountEur === undefined || amountEur === null || amountEur === ''
      ? null
      : Number(amountEur);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) throw new Error('invalid_sale_amount');

    const result = await apiFetch('rpc/tyt_mark_inquiry_won', {
      method: 'POST',
      body: JSON.stringify({
        p_inquiry_id: inquiry.id,
        p_amount_eur: amount,
        p_concept: concept || null
      })
    });
    if (!result?.sale?.id) throw new Error('sale_creation_failed');
    return result;
  };
}
