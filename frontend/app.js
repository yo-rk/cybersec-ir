const API_BASE = "http://127.0.0.1:5050";

let allAlerts = [];

const alertBody = document.getElementById("alert-body");
const countBadge = document.getElementById("count-badge");

// ==========================
// FETCH ALERTS (both active + resolved)
// ==========================
async function loadAlerts() {
  try {
    // Fetch BOTH active and resolved so stats/charts are accurate
    const [activeRes, resolvedRes] = await Promise.all([
      fetch(API_BASE + "/get-active"),
      fetch(API_BASE + "/get-resolved")
    ]);

    const activeData = await activeRes.json();
    const resolvedData = await resolvedRes.json();

    // Combined data for stats and charts
    const allData = [...activeData, ...resolvedData];
    allAlerts = allData;

    // Table shows active alerts only
    renderTable(activeData);
    // Stats and charts use ALL data
    updateStats(activeData, resolvedData);
    renderCharts(allData, activeData.length, resolvedData.length);

  } catch (err) {
    console.error(err);
    alertBody.innerHTML = `<tr><td colspan="9">Error loading data</td></tr>`;
  }
}

// ==========================
// TABLE
// ==========================
function renderTable(data) {
  countBadge.textContent = data.length + " active alert" + (data.length !== 1 ? "s" : "");

  if (data.length === 0) {
    alertBody.innerHTML = `<tr><td colspan="9" class="state-msg">No active alerts</td></tr>`;
    return;
  }

  alertBody.innerHTML = data.map(alert => `
    <tr>
      <td>#${alert.id}</td>
      <td>${alert.ip_address}</td>
      <td>${alert.type}</td>
      <td>${alert.type}</td>
      <td>-</td>
      <td>-</td>
      <td>${alert.severity}</td>
      <td>${alert.status}</td>
      <td>
        <button class="btn btn--sm btn--resolve" onclick="resolveAlert(${alert.id})">Resolve</button>
      </td>
    </tr>
  `).join("");
}

// ==========================
// RESOLVE
// ==========================
async function resolveAlert(id) {
  await fetch(API_BASE + "/resolve/" + id, {
    method: "PUT"
  });
  loadAlerts();
}

// ==========================
// SIMULATE
// ==========================
async function simulateAttack() {
  await fetch(API_BASE + "/simulate-attack", {
    method: "POST"
  });
  loadAlerts();
}

// ==========================
// STATS
// ==========================
function updateStats(activeData, resolvedData) {
  const total = activeData.length + resolvedData.length;

  document.getElementById("stat-total-val").textContent = total;
  document.getElementById("stat-open-val").textContent = activeData.length;
  document.getElementById("stat-resolved-val").textContent = resolvedData.length;

  // High risk = Critical + High severity
  const highRisk = [...activeData, ...resolvedData].filter(
    a => a.severity === "Critical" || a.severity === "High"
  ).length;
  document.getElementById("stat-high-val").textContent = highRisk;
}

// ==========================
// CHARTS
// ==========================
let barChart = null;
let pieChart = null;

function renderCharts(allData, activeCount, resolvedCount) {
  renderTypeChart(allData);
  renderStatusChart(activeCount, resolvedCount);
}

// ---------- TYPE CHART ----------
function renderTypeChart(data) {
  const ctx = document.getElementById("chart-by-type");
  if (!ctx) return;

  const counts = {};
  data.forEach(a => {
    counts[a.type] = (counts[a.type] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const values = Object.values(counts);

  // Update existing chart instead of destroy/recreate (prevents flicker)
  if (barChart) {
    barChart.data.labels = labels;
    barChart.data.datasets[0].data = values;
    barChart.update();
    return;
  }

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Alerts by Type",
        data: values
      }]
    }
  });
}

// ---------- STATUS CHART ----------
function renderStatusChart(activeCount, resolvedCount) {
  const ctx = document.getElementById("chart-status");
  if (!ctx) return;

  // Update existing chart instead of destroy/recreate (prevents flicker)
  if (pieChart) {
    pieChart.data.datasets[0].data = [activeCount, resolvedCount];
    pieChart.update();
    return;
  }

  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Active", "Resolved"],
      datasets: [{
        data: [activeCount, resolvedCount]
      }]
    }
  });
}

// ==========================
// BUTTONS
// ==========================
document.getElementById("btn-simulate").onclick = simulateAttack;

document.getElementById("btn-simulate-5").onclick = async () => {
  for (let i = 0; i < 5; i++) {
    await simulateAttack();
  }
};

// ==========================
// AUTO REFRESH (10s instead of 3s to stop flickering)
// ==========================
setInterval(loadAlerts, 10000);

// ==========================
// INIT
// ==========================
loadAlerts();