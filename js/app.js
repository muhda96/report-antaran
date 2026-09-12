/**
 * Main Application Logic & Event Controller
 */

let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize default raw sample data
  const defaultRawText = `Dokumen:
INCOMING KC SLA BARU PER PRODUK

Produk Trx % SLA
EC3 8,646 94.9%
PKH 4,796 91.36%
PE 631 67.07%
PJB 32 100%
PPB_SRT 25 75%
PPB_PKT 12 75%
PJE 10 100%
PJM 2 100%
VG 2 100%
DG 1  
PPB_KARTUPOS 1  
      
14,158

Dokumen:
sla all product, tgl 11 september 26, pkl 19.47 wib

TOTAL KIRIMAN 14,158
INPROSES ON GO 9,084
INPROSES DUE DATE 330
DELIVERED DONE 4,391
INPROSES OVERSLA 216
DELIVERED OVERSLA 137
SLA PROSEN INCOMING 91.81%

cibadak % 95.54
tanah sareal % 93.62
sukasari %96.76
ciawi %97.31
leuwiliang %96.05
parung %98.62
parung panjang % 87.98
rumpin %97.56

Dokumen:
sla cod shopee, tgl 11 september 26, pkl 19.47 wib

TOTAL KIRIMAN 1,664
INPROSES ON GO 944
INPROSES DUE DATE 18
DELIVERED DONE 648
INPROSES OVERSLA 35
DELIVERED OVERSLA 19
SLA PROSEN INCOMING 91.05%

cibadak % 94.79
tanah sareal % 96.15
sukasari %100
ciawi %98.26
leuwiliang %94.17
parung %94.17
parung panjang % 95
rumpin %100`;

  const rawInputElem = document.getElementById('raw-data-textarea');
  if (rawInputElem) {
    rawInputElem.value = defaultRawText;
  }

  // Initial parse and render
  parseAndUpdateDashboard();

  // Setup Event Listeners
  document.getElementById('btn-parse')?.addEventListener('click', () => {
    parseAndUpdateDashboard();
  });

  document.getElementById('btn-export-png')?.addEventListener('click', () => {
    exportDashboardToImage();
  });

  // Tab switching inside editor
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const targetTab = e.target.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(tc => {
        tc.style.display = tc.id === targetTab ? 'block' : 'none';
      });
    });
  });

  // Setup manual form input listeners for real-time live preview update
  setupManualFormListeners();
});

function parseAndUpdateDashboard() {
  const rawText = document.getElementById('raw-data-textarea')?.value || '';
  currentReportData = parseRawReportData(rawText);

  // Read target values from manual form inputs if specified
  const targetAllInput = parseFloat(getValue('input-target-all'));
  const targetShopeeInput = parseFloat(getValue('input-target-shopee'));
  if (!isNaN(targetAllInput)) currentReportData.slaAll.target = targetAllInput;
  if (!isNaN(targetShopeeInput)) currentReportData.slaShopee.target = targetShopeeInput;

  // Read header title, KCU name, date time from manual form if available
  const titleInput = getValue('input-title');
  const kcuInput = getValue('input-kcu');
  const datetimeInput = getValue('input-datetime');
  if (titleInput) currentReportData.header.title = titleInput;
  if (kcuInput) currentReportData.header.kcuName = kcuInput;
  if (datetimeInput) currentReportData.header.dateTime = datetimeInput;

  // Re-generate auto insights based on updated target values
  generateAutoInsights(currentReportData);

  populateManualForm(currentReportData);
  renderDashboard(currentReportData);
}

function renderDashboard(data) {
  if (!data) return;

  const targetAll = data.slaAll.target || 90;
  const targetShopee = data.slaShopee.target || 95;

  // 1. Header Information
  document.getElementById('dash-title-text').innerText = data.header.title || "DASHBOARD CAPAIAN KINERJA SLA INCOMING";
  document.getElementById('dash-kcu-name').innerText = data.header.kcuName || "KCU BOGOR 16000";
  document.getElementById('dash-date-text').innerText = data.header.dateTime || "";

  // Target Badges
  const badgeAllElem = document.getElementById('badge-target-all');
  if (badgeAllElem) badgeAllElem.innerText = `TARGET ${targetAll}%`;

  const badgeShopeeElem = document.getElementById('badge-target-shopee');
  if (badgeShopeeElem) badgeShopeeElem.innerText = `TARGET ${targetShopee}%`;

  // 2. SLA ALL PRODUCT
  const slaAllVal = data.slaAll.slaPct || 0;
  document.getElementById('val-sla-all').innerText = `${slaAllVal.toFixed(2)}%`;
  setValColorClass('val-sla-all', slaAllVal, targetAll);
  drawGaugeChart('gauge-sla-all', slaAllVal, targetAll);

  // Update mini gauge legend for All Product
  updateGaugeLegendText('legend-all-red', 'legend-all-yellow', 'legend-all-green', targetAll);

  document.getElementById('metric-all-total').innerText = formatNumber(data.slaAll.totalKiriman);
  document.getElementById('metric-all-ongo').innerText = formatNumber(data.slaAll.inprosesOnGo);
  document.getElementById('metric-all-duedate').innerText = formatNumber(data.slaAll.inprosesDueDate);
  document.getElementById('metric-all-delivered').innerText = formatNumber(data.slaAll.deliveredDone);
  document.getElementById('metric-all-oversla').innerText = formatNumber(data.slaAll.inprosesOversla);
  document.getElementById('metric-all-deloversla').innerText = formatNumber(data.slaAll.deliveredOversla);

  renderRankingList('ranking-list-all', data.slaAll.branches || [], targetAll);

  // 3. SLA COD SHOPEE
  const slaShopeeVal = data.slaShopee.slaPct || 0;
  document.getElementById('val-sla-shopee').innerText = `${slaShopeeVal.toFixed(2)}%`;
  setValColorClass('val-sla-shopee', slaShopeeVal, targetShopee);
  drawGaugeChart('gauge-sla-shopee', slaShopeeVal, targetShopee);

  // Update mini gauge legend for COD Shopee
  updateGaugeLegendText('legend-shopee-red', 'legend-shopee-yellow', 'legend-shopee-green', targetShopee);

  document.getElementById('metric-shopee-total').innerText = formatNumber(data.slaShopee.totalKiriman);
  document.getElementById('metric-shopee-ongo').innerText = formatNumber(data.slaShopee.inprosesOnGo);
  document.getElementById('metric-shopee-duedate').innerText = formatNumber(data.slaShopee.inprosesDueDate);
  document.getElementById('metric-shopee-delivered').innerText = formatNumber(data.slaShopee.deliveredDone);
  document.getElementById('metric-shopee-oversla').innerText = formatNumber(data.slaShopee.inprosesOversla);
  document.getElementById('metric-shopee-deloversla').innerText = formatNumber(data.slaShopee.deliveredOversla);

  renderRankingList('ranking-list-shopee', data.slaShopee.branches || [], targetShopee);

  // 4. Products SLA Table & Donut Chart
  renderProductsTableAndDonut(data.products || [], data.slaAll.totalKiriman, targetAll);

  // 5. Regional Summary Table
  renderRegionalTable('regional-table-container', data.slaAll.branches || [], data.slaShopee.branches || [], targetAll, targetShopee);

  // 6. Insights Section
  renderInsights(data.insights);

  // Update Panel 4 Status Legend Box
  const lowBoundAll = Math.max(0, targetAll - 10);
  const legendGreen = document.getElementById('status-legend-green');
  const legendYellow = document.getElementById('status-legend-yellow');
  const legendRed = document.getElementById('status-legend-red');

  if (legendGreen) legendGreen.innerHTML = `<span class="dot green"></span> &ge; ${targetAll}% <span class="status-desc">(Sangat Baik)</span>`;
  if (legendYellow) legendYellow.innerHTML = `<span class="dot yellow"></span> ${lowBoundAll}% - ${targetAll - 1}% <span class="status-desc">(Perlu Perbaikan)</span>`;
  if (legendRed) legendRed.innerHTML = `<span class="dot red"></span> &lt; ${lowBoundAll}% <span class="status-desc">(Perlu Tindakan)</span>`;

  // 7. Footer text
  document.getElementById('footer-update-text').innerText = `Catatan : Data update per ${data.header.dateTime || ''}`;
  document.getElementById('footer-source-text').innerText = `Sumber : System Monitoring Incoming ${data.header.kcuName || ''}`;
}

function updateGaugeLegendText(redId, yellowId, greenId, targetPct) {
  const elemRed = document.getElementById(redId);
  const elemYellow = document.getElementById(yellowId);
  const elemGreen = document.getElementById(greenId);

  const lowBound = Math.max(0, targetPct - 10);
  if (elemRed) elemRed.innerHTML = `<span class="dot red"></span> &lt; ${lowBound}%`;
  if (elemYellow) elemYellow.innerHTML = `<span class="dot yellow"></span> ${lowBound}%-${targetPct - 1}%`;
  if (elemGreen) elemGreen.innerHTML = `<span class="dot green"></span> &ge; ${targetPct}%`;
}

function renderProductsTableAndDonut(products, totalKiriman, targetPct = 90) {
  const tbody = document.getElementById('products-tbody');
  const legendElem = document.getElementById('donut-legend-container');
  if (!tbody) return;

  let tbodyHtml = '';
  let sumTrx = 0;

  products.forEach((p, idx) => {
    sumTrx += p.trx;

    let slaStr = '-';
    let dotColor = 'gray';

    if (p.sla !== null && p.sla !== undefined) {
      slaStr = `${p.sla}%`;
      if (p.sla >= targetPct) dotColor = 'green';
      else if (p.sla >= (targetPct - 10)) dotColor = 'yellow';
      else dotColor = 'red';
    }

    tbodyHtml += `
      <tr>
        <td>${p.code}</td>
        <td>${formatNumber(p.trx)}</td>
        <td>${slaStr}</td>
        <td style="text-align: center;"><span class="dot ${dotColor}"></span></td>
      </tr>
    `;
  });

  tbodyHtml += `
    <tr class="total-row">
      <td>TOTAL</td>
      <td>${formatNumber(sumTrx || totalKiriman)}</td>
      <td>-</td>
      <td></td>
    </tr>
  `;

  tbody.innerHTML = tbodyHtml;

  // Render Donut Chart
  const donutTotal = totalKiriman > 0 ? totalKiriman : sumTrx;
  document.getElementById('donut-total-num').innerText = formatNumber(donutTotal);
  drawDonutChart('donut-canvas', products, donutTotal);

  // Render Donut Legend
  let legendHtml = '';
  products.forEach((p, idx) => {
    const color = PRODUCT_COLORS[idx % PRODUCT_COLORS.length];
    const pct = donutTotal > 0 ? ((p.trx / donutTotal) * 100).toFixed(1) : 0;

    legendHtml += `
      <div class="legend-row">
        <span class="dot" style="background: ${color};"></span>
        <span class="legend-code">${p.code}</span>
        <span class="legend-val">${formatNumber(p.trx)} (${pct}%)</span>
      </div>
    `;
  });
  if (legendElem) legendElem.innerHTML = legendHtml;
}

function renderInsights(insights) {
  const elemUtama = document.getElementById('insight-list-utama');
  const elemTerbaik = document.getElementById('insight-list-terbaik');
  const elemPerhatian = document.getElementById('insight-list-perhatian');

  if (elemUtama) elemUtama.innerHTML = (insights.performaUtama || []).map(i => `<li>${i}</li>`).join('');
  if (elemTerbaik) elemTerbaik.innerHTML = (insights.performaTerbaik || []).map(i => `<li>${i}</li>`).join('');
  if (elemPerhatian) elemPerhatian.innerHTML = (insights.perluPerhatian || []).map(i => `<li>${i}</li>`).join('');
}

function setValColorClass(elemId, val, targetPct = 90) {
  const elem = document.getElementById(elemId);
  if (!elem) return;
  elem.classList.remove('green', 'orange', 'yellow', 'red');
  if (val >= targetPct) elem.classList.add('green');
  else if (val >= (targetPct - 10)) elem.classList.add('yellow');
  else elem.classList.add('red');
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Live manual form editing logic
function populateManualForm(data) {
  setValue('input-title', data.header.title);
  setValue('input-kcu', data.header.kcuName);
  setValue('input-datetime', data.header.dateTime);
  setValue('input-target-all', data.slaAll.target);
  setValue('input-target-shopee', data.slaShopee.target);
}

function setupManualFormListeners() {
  const inputs = ['input-title', 'input-kcu', 'input-datetime', 'input-target-all', 'input-target-shopee'];
  inputs.forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      if (!currentReportData) return;
      currentReportData.header.title = getValue('input-title');
      currentReportData.header.kcuName = getValue('input-kcu');
      currentReportData.header.dateTime = getValue('input-datetime');
      currentReportData.slaAll.target = parseFloat(getValue('input-target-all')) || 90;
      currentReportData.slaShopee.target = parseFloat(getValue('input-target-shopee')) || 95;

      document.getElementById('badge-target-all').innerText = `TARGET ${currentReportData.slaAll.target}%`;
      document.getElementById('badge-target-shopee').innerText = `TARGET ${currentReportData.slaShopee.target}%`;

      renderDashboard(currentReportData);
    });
  });
}

function getValue(id) {
  return document.getElementById(id)?.value || '';
}
function setValue(id, val) {
  const elem = document.getElementById(id);
  if (elem) elem.value = val || '';
}

// Pre-convert images to Base64 to prevent any CORS taint issues in html2canvas
async function convertImagesToBase64(container) {
  const images = container.querySelectorAll('img');
  for (let img of images) {
    if (img.src && !img.src.startsWith('data:')) {
      try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            img.src = reader.result;
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("Image base64 conversion note:", img.src, e);
      }
    }
  }
}

// Export Dashboard to High Resolution Image PNG
async function exportDashboardToImage() {
  const targetContainer = document.getElementById('dashboard-export-container');
  const btnExport = document.getElementById('btn-export-png');

  if (!targetContainer) return;

  const originalBtnText = btnExport ? btnExport.innerHTML : '';
  if (btnExport) {
    btnExport.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating Image...`;
    btnExport.disabled = true;
  }

  try {
    // Pre-convert images to base64 in memory
    await convertImagesToBase64(targetContainer);

    let dataUrl = null;

    // Strategy 1: Try html2canvas with onclone canvas copier
    if (typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(targetContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#eaeff5',
          logging: false,
          onclone: (clonedDoc) => {
            const origCanvases = targetContainer.querySelectorAll('canvas');
            const clonedCanvases = clonedDoc.querySelectorAll('canvas');

            origCanvases.forEach((origCanvas, i) => {
              const clonedCanvas = clonedCanvases[i];
              if (clonedCanvas) {
                const ctx = clonedCanvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(origCanvas, 0, 0);
                }
              }
            });
          }
        });
        dataUrl = canvas.toDataURL('image/png');
      } catch (err1) {
        console.warn("html2canvas engine note:", err1);
      }
    }

    // Strategy 2: Fallback to htmlToImage if html2canvas failed
    if (!dataUrl && typeof htmlToImage !== 'undefined') {
      try {
        dataUrl = await htmlToImage.toPng(targetContainer, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#eaeff5'
        });
      } catch (err2) {
        console.warn("htmlToImage engine note:", err2);
      }
    }

    if (dataUrl) {
      const kcuName = (currentReportData?.header?.kcuName || 'POS').replace(/\s+/g, '_');
      const filename = `Dashboard_SLA_Incoming_${kcuName}.png`;

      // 1. Attempt direct download link click
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Open interactive preview modal for user guarantee
      showExportPreviewModal(dataUrl, filename);
    } else {
      window.print();
    }

  } catch (err) {
    console.error("Export image error:", err);
    window.print();
  } finally {
    if (btnExport) {
      btnExport.innerHTML = originalBtnText;
      btnExport.disabled = false;
    }
  }
}

function showExportPreviewModal(dataUrl, filename) {
  const modal = document.getElementById('export-preview-modal');
  const imgElem = document.getElementById('modal-preview-img');
  const btnDownload = document.getElementById('btn-modal-download');
  const btnOpenTab = document.getElementById('btn-modal-open-tab');
  const btnClose = document.getElementById('btn-close-modal');

  if (!modal || !imgElem) return;

  imgElem.src = dataUrl;
  
  if (btnDownload) {
    btnDownload.href = dataUrl;
    btnDownload.download = filename;
  }
  
  if (btnOpenTab) {
    btnOpenTab.href = dataUrl;
  }

  modal.style.display = 'flex';

  const closeModal = () => {
    modal.style.display = 'none';
  };

  if (btnClose) btnClose.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
}
