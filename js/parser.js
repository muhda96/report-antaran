/**
 * Parser for Pos Indonesia SLA Incoming Raw Text Data
 */

function parseRawReportData(rawText) {
  // Default data fallback structure matching user's sample
  const data = {
    header: {
      title: "DASHBOARD CAPAIAN KINERJA SLA INCOMING",
      kcuName: "KCU BOGOR 16000",
      dateTime: "11 SEPTEMBER 2026 PKL 19.47 WIB"
    },
    slaAll: {
      target: 90,
      slaPct: 91.81,
      totalKiriman: 14158,
      inprosesOnGo: 9084,
      inprosesDueDate: 330,
      deliveredDone: 4391,
      inprosesOversla: 216,
      deliveredOversla: 137,
      branches: [
        { name: "Cibadak", sla: 95.54 },
        { name: "Tanah Sareal", sla: 93.62 },
        { name: "Sukasari", sla: 96.76 },
        { name: "Ciawi", sla: 97.31 },
        { name: "Leuwiliang", sla: 96.05 },
        { name: "Parung", sla: 98.62 },
        { name: "Parung Panjang", sla: 87.98 },
        { name: "Rumpin", sla: 97.56 }
      ]
    },
    slaShopee: {
      target: 95,
      slaPct: 91.05,
      totalKiriman: 1664,
      inprosesOnGo: 944,
      inprosesDueDate: 18,
      deliveredDone: 648,
      inprosesOversla: 35,
      deliveredOversla: 19,
      branches: [
        { name: "Cibadak", sla: 94.79 },
        { name: "Tanah Sareal", sla: 96.15 },
        { name: "Sukasari", sla: 100 },
        { name: "Ciawi", sla: 98.26 },
        { name: "Leuwiliang", sla: 94.17 },
        { name: "Parung", sla: 94.17 },
        { name: "Parung Panjang", sla: 95 },
        { name: "Rumpin", sla: 100 }
      ]
    },
    products: [
      { code: "EC3", trx: 8646, sla: 94.9 },
      { code: "PKH", trx: 4796, sla: 91.36 },
      { code: "PE", trx: 631, sla: 67.07 },
      { code: "PJB", trx: 32, sla: 100 },
      { code: "PPB_SRT", trx: 25, sla: 75 },
      { code: "PPB_PKT", trx: 12, sla: 75 },
      { code: "PJE", trx: 10, sla: 100 },
      { code: "PJM", trx: 2, sla: 100 },
      { code: "VG", trx: 2, sla: 100 },
      { code: "DG", trx: 1, sla: null },
      { code: "PPB_KARTUPOS", trx: 1, sla: null }
    ],
    insights: {
      performaUtama: [
        "SLA All Product : 91.81%",
        "SLA Shopee COD : 91.05%"
      ],
      performaTerbaik: [
        "Rumpin : 100.00% (COD Shopee) & 97.56% (All Product)",
        "Ciawi : 98.26% (COD Shopee) & 97.31% (All Product)",
        "Sukasari : 100.00% (COD Shopee)"
      ],
      perluPerhatian: [
        "Parung Panjang SLA All Product masih rendah (87.98%).",
        "Produk PE (67.07%), PPB_SRT (75%), PPB_PKT (75%) di bawah target SLA 90%.",
        "DG & PPB_KARTUPOS belum ada data SLA (N/A)."
      ]
    }
  };

  if (!rawText || !rawText.trim()) {
    return data;
  }

  try {
    const text = rawText.replace(/\r/g, '');

    // 1. Extract Date / Time if available
    const dateMatch = text.match(/tgl\s+([0-9]+\s+[a-zA-Z]+\s+[0-9]+)[,\s]+pkl\s+([0-9.]+\s*wib)/i);
    if (dateMatch) {
      data.header.dateTime = `${dateMatch[1].toUpperCase()} PKL ${dateMatch[2].toUpperCase()}`;
    }

    // Split document into blocks by "Dokumen:" or title sections
    const blocks = text.split(/Dokumen:/i);

    blocks.forEach(block => {
      const lower = block.toLowerCase();

      // --- BLOCK 1: INCOMING KC SLA BARU PER PRODUK ---
      if (lower.includes("incoming kc sla baru per produk") || lower.includes("produk") && lower.includes("% sla")) {
        const lines = block.split('\n');
        const parsedProducts = [];

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.toLowerCase().includes("produk") || trimmed.toLowerCase().includes("incoming")) return;

          // Match line like: EC3 8,646 94.9%  or DG 1
          const match = trimmed.match(/^([A-Z0-9_]+)\s+([0-9.,]+)\s*([0-9.,]+%?)?/i);
          if (match) {
            const code = match[1].trim().toUpperCase();
            // Skip total numbers row
            if (code === 'TOTAL' || !isNaN(Number(code))) return;

            const trx = parseInt(match[2].replace(/,/g, '').replace(/\./g, ''), 10);
            let sla = null;
            if (match[3]) {
              const slaClean = match[3].replace('%', '').replace(',', '.').trim();
              if (slaClean && !isNaN(parseFloat(slaClean))) {
                sla = parseFloat(slaClean);
              }
            }

            if (!isNaN(trx)) {
              parsedProducts.push({ code, trx, sla });
            }
          }
        });

        if (parsedProducts.length > 0) {
          data.products = parsedProducts;
        }
      }

      // --- BLOCK 2: SLA ALL PRODUCT ---
      if (lower.includes("sla all product")) {
        parseSlaMetricsAndBranches(block, data.slaAll);
      }

      // --- BLOCK 3: SLA COD SHOPEE ---
      if (lower.includes("sla cod shopee")) {
        parseSlaMetricsAndBranches(block, data.slaShopee);
      }
    });

    // Re-generate auto insights based on parsed data
    generateAutoInsights(data);

  } catch (err) {
    console.warn("Error parsing raw text:", err);
  }

  return data;
}

function parseSlaMetricsAndBranches(blockText, targetObj) {
  const lines = blockText.split('\n').map(l => l.trim()).filter(l => l);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/TOTAL KIRIMAN/i)) {
      const num = findNextNumber(lines, i);
      if (num !== null) targetObj.totalKiriman = num;
    } else if (line.match(/INPROSES ON GO/i)) {
      const num = findNextNumber(lines, i);
      if (num !== null) targetObj.inprosesOnGo = num;
    } else if (line.match(/INPROSES DUE DATE/i)) {
      const num = findNextNumber(lines, i);
      if (num !== null) targetObj.inprosesDueDate = num;
    } else if (line.match(/DELIVERED DONE/i)) {
      const num = findNextNumber(lines, i);
      if (num !== null) targetObj.deliveredDone = num;
    } else if (line.match(/INPROSES OVERSLA/i)) {
      const num = findNextNumber(lines, i);
      if (num !== null) targetObj.inprosesOversla = num;
    } else if (line.match(/DELIVERED OVERSLA/i)) {
      const num = findNextNumber(lines, i);
      if (num !== null) targetObj.deliveredOversla = num;
    } else if (line.match(/SLA PROSEN INCOMING/i)) {
      const num = findNextPercentage(lines, i);
      if (num !== null) targetObj.slaPct = num;
    }
  }

  // Branch offices parser: e.g. "cibadak % 95.54" or "tanah sareal % 93.62"
  const branchList = [];
  const branchRegex = /([a-zA-Z\s]+)\s*%\s*([0-9.,]+)/g;
  let match;

  while ((match = branchRegex.exec(blockText)) !== null) {
    const bName = capitalizeWords(match[1].trim());
    const bSla = parseFloat(match[2].replace(',', '.'));
    if (bName && !isNaN(bSla) && !bName.toLowerCase().includes("prosen")) {
      branchList.push({ name: bName, sla: bSla });
    }
  }

  if (branchList.length > 0) {
    targetObj.branches = branchList;
  }
}

function findNextNumber(lines, startIndex) {
  for (let j = startIndex + 1; j < Math.min(startIndex + 4, lines.length); j++) {
    const val = lines[j].replace(/,/g, '').replace(/\./g, '').trim();
    if (/^\d+$/.test(val)) {
      return parseInt(val, 10);
    }
  }
  return null;
}

function findNextPercentage(lines, startIndex) {
  for (let j = startIndex + 1; j < Math.min(startIndex + 4, lines.length); j++) {
    const val = lines[j].replace('%', '').replace(',', '.').trim();
    if (!isNaN(parseFloat(val)) && parseFloat(val) > 0) {
      return parseFloat(val);
    }
  }
  return null;
}

function capitalizeWords(str) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function generateAutoInsights(data) {
  const targetAll = data.slaAll.target || 90;
  const targetShopee = data.slaShopee.target || 95;

  const perfUtama = [
    `SLA All Product : ${data.slaAll.slaPct.toFixed(2)}% (Target ${targetAll}%)`,
    `SLA Shopee COD : ${data.slaShopee.slaPct.toFixed(2)}% (Target ${targetShopee}%)`
  ];

  // Best performing branches
  const sortedAll = [...(data.slaAll.branches || [])].sort((a, b) => b.sla - a.sla);
  const bestBranches = [];
  sortedAll.forEach(b => {
    if (b.sla >= targetAll && bestBranches.length < 3) {
      bestBranches.push(`${b.name} : ${b.sla.toFixed(2)}% (All Product)`);
    }
  });

  // Warnings / low SLA branches (< target)
  const warnings = [];
  const lowAllBranches = sortedAll.filter(b => b.sla < targetAll);
  if (lowAllBranches.length > 0) {
    lowAllBranches.forEach(b => {
      warnings.push(`${b.name} (${b.sla.toFixed(2)}%) di bawah target SLA All Product (${targetAll}%).`);
    });
  }

  const sortedShopee = [...(data.slaShopee.branches || [])].sort((a, b) => b.sla - a.sla);
  const lowShopeeBranches = sortedShopee.filter(b => b.sla < targetShopee);
  if (lowShopeeBranches.length > 0) {
    lowShopeeBranches.forEach(b => {
      warnings.push(`${b.name} (${b.sla.toFixed(2)}%) di bawah target SLA COD Shopee (${targetShopee}%).`);
    });
  }

  const lowProducts = (data.products || []).filter(p => p.sla !== null && p.sla < targetAll);
  if (lowProducts.length > 0) {
    const pStr = lowProducts.map(p => `${p.code} (${p.sla}%)`).join(", ");
    warnings.push(`Produk ${pStr} di bawah target SLA ${targetAll}%.`);
  }

  const nullProducts = (data.products || []).filter(p => p.sla === null);
  if (nullProducts.length > 0) {
    const pStr = nullProducts.map(p => p.code).join(", ");
    warnings.push(`${pStr} belum ada data SLA.`);
  }

  data.insights = {
    performaUtama: perfUtama,
    performaTerbaik: bestBranches.length > 0 ? bestBranches : ["Semua kantor berkinerja di atas target."],
    perluPerhatian: warnings.length > 0 ? warnings : ["Tidak ada catatan kritis saat ini. Performa mencapai target."]
  };
}
