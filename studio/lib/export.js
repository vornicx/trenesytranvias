export function exportSalesXlsx(rows) {
  const aoa = [['Fecha','Cliente','Concepto','Importe €','Inquiry']].concat(
    rows.map(r => [r.sold_at, r.client_name || '', r.concept || '', r.amount_eur ?? '', r.inquiry_id || ''])
  );
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Ventas');
  XLSX.writeFile(book, `ventas-${new Date().toISOString().slice(0,10)}.xlsx`);
}

export function exportSalesPdf(rows) {
  const doc = new jspdf.jsPDF();
  doc.setFontSize(14);
  doc.text('Ventas — Trenes y Tranvías', 14, 16);
  let y = 28;
  rows.forEach(r => {
    const line = `${r.sold_at} | ${r.client_name || '—'} | ${r.amount_eur ?? '—'} € | ${r.concept || ''}`;
    doc.setFontSize(10);
    doc.text(line.slice(0, 95), 14, y);
    y += 7;
    if (y > 280) { doc.addPage(); y = 20; }
  });
  doc.save(`ventas-${new Date().toISOString().slice(0,10)}.pdf`);
}
