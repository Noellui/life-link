  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Blood Group', 'Count']],
    body: filteredBlood.map(b => [b.bloodGroup, b.count]),
    theme: 'striped', headStyles: { fillColor: [109, 40, 217] },
    margin: { bottom: 30 },
  });