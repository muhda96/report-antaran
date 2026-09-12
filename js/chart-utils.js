/**
 * Chart & Graphical Helpers for POS IND SLA Incoming Dashboard
 */

function drawGaugeChart(canvasId, valuePct, targetPct = 90) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height - 15;
  const radius = Math.min(width / 2, height) - 20;

  // Arc angles (from Math.PI to 2 * Math.PI)
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;

  // Dynamic color zones based on targetPct
  const redPct = Math.max(0, (targetPct - 10) / 100);
  const yellowPct = Math.max(redPct, targetPct / 100);

  const zoneRedEnd = startAngle + (redPct * Math.PI);
  const zoneYellowEnd = startAngle + (yellowPct * Math.PI);

  const arcWidth = 14;

  // 1. Red Zone Arc (0% - (Target-10)%)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, zoneRedEnd);
  ctx.lineWidth = arcWidth;
  ctx.strokeStyle = '#d32f2f';
  ctx.stroke();

  // 2. Yellow Zone Arc ((Target-10)% - Target%)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, zoneRedEnd, zoneYellowEnd);
  ctx.lineWidth = arcWidth;
  ctx.strokeStyle = '#eab308'; // Bright Yellow
  ctx.stroke();

  // 3. Green Zone Arc (Target% - 100%)
  ctx.beginPath();
  ctx.arc(cx, cy, radius, zoneYellowEnd, endAngle);
  ctx.lineWidth = arcWidth;
  ctx.strokeStyle = '#1b8e3e';
  ctx.stroke();

  // Draw Ticks & Labels
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 10px Segoe UI, sans-serif';
  ctx.textAlign = 'center';

  // 0% label
  ctx.fillText('0%', cx - radius + 5, cy + 14);
  // 50% label
  ctx.fillText('50%', cx, cy - radius - 6);
  // 100% label
  ctx.fillText('100%', cx + radius - 5, cy + 14);

  // Calculate Needle Angle
  const pctClamped = Math.max(0, Math.min(100, valuePct));
  const needleAngle = startAngle + ((pctClamped / 100) * Math.PI);

  // Draw Needle
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(needleAngle);

  // Needle Line
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(radius - 8, 0);
  ctx.lineTo(0, 5);
  ctx.closePath();
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.restore();

  // Center Pivot Cap
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

const PRODUCT_COLORS = [
  '#0d47a1', '#e65100', '#2e7d32', '#1565c0', '#6a1b9a', 
  '#c2185b', '#00838f', '#f57f17', '#424242', '#33691e', '#880e4f'
];

function drawDonutChart(canvasId, products, totalTrx) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!products || products.length === 0 || totalTrx === 0) return;

  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 4;
  const innerRadius = outerRadius * 0.58;

  // Enforce a minimum slice angle (0.045 rad ~ 2.6 deg) for visual clarity of small products
  const MIN_ANGLE = 0.045;
  const rawAngles = products.map(p => (p.trx / totalTrx) * 2 * Math.PI);
  const adjustedAngles = rawAngles.map(ang => (ang > 0 && ang < MIN_ANGLE) ? MIN_ANGLE : ang);

  // Normalize angles back to 2 * Math.PI so the donut ring forms a 360-degree circle
  const sumAdjusted = adjustedAngles.reduce((a, b) => a + b, 0);
  const normalizedAngles = adjustedAngles.map(ang => (ang / sumAdjusted) * 2 * Math.PI);

  let currentAngle = -0.5 * Math.PI;

  products.forEach((prod, index) => {
    const sliceAngle = normalizedAngles[index];
    if (sliceAngle <= 0) return;

    const color = PRODUCT_COLORS[index % PRODUCT_COLORS.length];

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, currentAngle, currentAngle + sliceAngle);
    ctx.arc(cx, cy, innerRadius, currentAngle + sliceAngle, currentAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Subtle slice gap border
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    currentAngle += sliceAngle;
  });
}

function renderRankingList(containerId, branches, targetPct = 90) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Sort descending by SLA %
  const sorted = [...branches].sort((a, b) => b.sla - a.sla);

  let html = '';
  sorted.forEach((item, idx) => {
    const rank = idx + 1;
    let rankClass = '';
    if (rank === 1) rankClass = 'top1';
    else if (rank === 2) rankClass = 'top2';
    else if (rank === 3) rankClass = 'top3';

    let barColor = '#16a34a'; // Green (>= Target)
    if (item.sla < (targetPct - 10)) barColor = '#dc2626'; // Red (< Target - 10)
    else if (item.sla < targetPct) barColor = '#eab308'; // Yellow (Target - 10 <= SLA < Target)

    html += `
      <div class="rank-item">
        <span class="rank-num ${rankClass}">${rank}</span>
        <span class="rank-name" title="${item.name}">${item.name}</span>
        <div class="rank-bar-wrap">
          <div class="rank-bar-fill" style="width: ${Math.min(100, item.sla)}%; background: ${barColor};"></div>
        </div>
        <span class="rank-pct" style="color: ${barColor}">${item.sla.toFixed(2)}%</span>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderRegionalTable(containerId, branchesAll, branchesShopee, targetAll = 90, targetShopee = 95) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Combine unique branch names
  const branchMap = {};
  branchesAll.forEach(b => {
    branchMap[b.name] = { name: b.name, slaAll: b.sla, slaShopee: null };
  });
  branchesShopee.forEach(b => {
    if (branchMap[b.name]) {
      branchMap[b.name].slaShopee = b.sla;
    } else {
      branchMap[b.name] = { name: b.name, slaAll: null, slaShopee: b.sla };
    }
  });

  const branchList = Object.values(branchMap);

  let html = `
    <table class="dash-table regional-table">
      <thead>
        <tr>
          <th>WILAYAH</th>
          <th>SLA ALL PRODUCT</th>
          <th>SLA COD SHOPEE</th>
        </tr>
      </thead>
      <tbody>
  `;

  branchList.forEach(item => {
    const allValStr = item.slaAll !== null ? `${item.slaAll.toFixed(2)}%` : '-';
    const shopeeValStr = item.slaShopee !== null ? `${item.slaShopee.toFixed(2)}%` : '-';

    const allColor = getSlaColorClass(item.slaAll, targetAll);
    const shopeeColor = getSlaColorClass(item.slaShopee, targetShopee);

    html += `
      <tr>
        <td style="font-weight: 700;">${item.name}</td>
        <td class="${allColor}">${allValStr}</td>
        <td class="${shopeeColor}">${shopeeValStr}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

function getSlaColorClass(val, target = 90) {
  if (val === null || val === undefined) return '';
  if (val >= target) return 'text-green';
  if (val >= (target - 10)) return 'text-yellow';
  return 'text-red';
}
