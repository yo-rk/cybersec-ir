// ============================================================
// CYBERSECURITY IR DASHBOARD — FULL APPLICATION LOGIC
// ============================================================

// ─── Configuration ───────────────────────────────────────────
const API_BASE = "http://127.0.0.1:5000";

// ─── State ───────────────────────────────────────────────────
var allAlerts = [];          // raw data from server
var autoRefreshTimer = null; // setInterval ID
var barChart = null;         // Chart.js instance
var pieChart = null;         // Chart.js instance
var lastUsedIp = "";         // for "Use Same IP" button

// ─── DOM References ──────────────────────────────────────────
var alertBody      = document.getElementById("alert-body");
var countBadge     = document.getElementById("count-badge");
var statusLine     = document.getElementById("status-line");
var refreshBtn     = document.getElementById("btn-refresh");
var autoRefreshBtn = document.getElementById("btn-auto-refresh");
var filterStatus   = document.getElementById("filter-status");
var filterRisk     = document.getElementById("filter-risk");
var simForm        = document.getElementById("sim-form");
var simStatus      = document.getElementById("sim-status");
var ipDropdown     = document.getElementById("sim-ip-dropdown");
var ipTextInput    = document.getElementById("sim-source-ip");
var btnRandomIp    = document.getElementById("btn-random-ip");
var btnSameIp      = document.getElementById("btn-same-ip");
var btnSimulate5   = document.getElementById("btn-simulate-5");

// Stat card values
var statTotal    = document.getElementById("stat-total-val");
var statOpen     = document.getElementById("stat-open-val");
var statResolved = document.getElementById("stat-resolved-val");
var statHigh     = document.getElementById("stat-high-val");

// Data indices from /alerts:
// [0]=alert_id, [1]=alert_type, [2]=threat, [3]=vuln, [4]=action,
// [5]=risk_score, [6]=status, [7]=source_ip
var IDX = {
  ID: 0, TYPE: 1, THREAT: 2, VULN: 3, ACTION: 4,
  RISK: 5, STATUS: 6, IP: 7
};


// ═════════════════════════════════════════════════════════════
// 1. FETCH ALERTS
// ═════════════════════════════════════════════════════════════

async function loadAlerts() {
  refreshBtn.classList.add("is-loading");
  statusLine.textContent = "";

  try {
    var response = await fetch(API_BASE + "/alerts");
    if (!response.ok) {
      throw new Error("Server responded with " + response.status);
    }

    var data = await response.json();

    // Store raw data globally so filters can work without re-fetching
    allAlerts = data;

    // Update everything
    updateStats(data);
    updateCharts(data);
    populateIpDropdown(data);
    applyFiltersAndRender();

    statusLine.textContent = "Last updated: " + new Date().toLocaleTimeString();

  } catch (error) {
    alertBody.innerHTML =
      '<tr><td colspan="9" class="state-msg state-msg--error">' +
      "\u26A0 Cannot reach the server \u2014 is Flask running?" +
      "</td></tr>";
    countBadge.textContent = "Error";
    statusLine.textContent = "";
    console.error("Fetch failed:", error);

  } finally {
    refreshBtn.classList.remove("is-loading");
  }
}


// ═════════════════════════════════════════════════════════════
// 2. RISK SCORE SYSTEM
// ═════════════════════════════════════════════════════════════
// Formula: severity (max 40) + frequency (max 40) + recency (max 20)
// The DB stores a risk_score. We compute a frontend-enhanced score
// using the formula when the DB score is 0, and always for the label.

function computeRiskScore(row, allData) {
  var dbScore = row[IDX.RISK] || 0;

  // If the DB already has a meaningful score, use it
  if (dbScore > 0) return dbScore;

  // Otherwise compute from available data:
  // Severity: based on alert type keywords
  var type = (row[IDX.TYPE] || "").toLowerCase();
  var severity = 20; // default
  if (type.indexOf("brute force") !== -1)        severity = 32;
  if (type.indexOf("sql injection") !== -1)       severity = 36;
  if (type.indexOf("suspicious") !== -1)          severity = 28;
  if (type.indexOf("malware") !== -1)             severity = 38;
  if (type.indexOf("ddos") !== -1)                severity = 34;

  // Frequency: how many alerts of this same type exist
  var sameTypeCount = 0;
  for (var i = 0; i < allData.length; i++) {
    if (allData[i][IDX.TYPE] === row[IDX.TYPE]) sameTypeCount++;
  }
  var frequency = Math.min(40, Math.round((sameTypeCount / Math.max(allData.length, 1)) * 80));

  // Recency: newer alerts (lower index = higher in DESC list) get higher score
  var position = allData.indexOf(row);
  var recency = Math.max(4, 20 - Math.round((position / Math.max(allData.length, 1)) * 20));

  return Math.min(100, severity + frequency + recency);
}

function getRiskLabel(score) {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function getRiskPillClass(label) {
  if (label === "HIGH")   return "pill--risk-high";
  if (label === "MEDIUM") return "pill--risk-medium";
  return "pill--risk-low";
}


// ═════════════════════════════════════════════════════════════
// 3. STATS CARDS
// ═════════════════════════════════════════════════════════════

function updateStats(data) {
  var total    = data.length;
  var open     = 0;
  var resolved = 0;
  var high     = 0;

  for (var i = 0; i < data.length; i++) {
    var status = (data[i][IDX.STATUS] || "OPEN").toUpperCase();
    var score  = computeRiskScore(data[i], data);

    if (status === "OPEN")     open++;
    if (status === "RESOLVED") resolved++;
    if (getRiskLabel(score) === "HIGH") high++;
  }

  statTotal.textContent    = total;
  statOpen.textContent     = open;
  statResolved.textContent = resolved;
  statHigh.textContent     = high;
}


// ═════════════════════════════════════════════════════════════
// 4. FILTERS
// ═════════════════════════════════════════════════════════════

function applyFiltersAndRender() {
  var statusVal = filterStatus.value;
  var riskVal   = filterRisk.value;

  var filtered = allAlerts.filter(function (row) {
    var rowStatus = (row[IDX.STATUS] || "OPEN").toUpperCase();
    var rowRisk   = getRiskLabel(computeRiskScore(row, allAlerts));

    if (statusVal !== "ALL" && rowStatus !== statusVal) return false;
    if (riskVal   !== "ALL" && rowRisk   !== riskVal)   return false;
    return true;
  });

  renderTable(filtered);
}

filterStatus.addEventListener("change", applyFiltersAndRender);
filterRisk.addEventListener("change", applyFiltersAndRender);


// ═════════════════════════════════════════════════════════════
// 5. RENDER TABLE
// ═════════════════════════════════════════════════════════════
// Row: [id, type, threat, vuln, action, risk_score, status, source_ip]

function renderTable(data) {
  var count = data.length;
  countBadge.textContent = count + " alert" + (count !== 1 ? "s" : "");

  if (count === 0) {
    alertBody.innerHTML =
      '<tr><td colspan="9" class="state-msg">No alerts match your filters.</td></tr>';
    return;
  }

  alertBody.innerHTML = data
    .map(function (row) {
      var alertId   = row[IDX.ID];
      var sourceIp  = row[IDX.IP] || "—";
      var alertType = row[IDX.TYPE];
      var threat    = row[IDX.THREAT];
      var vuln      = row[IDX.VULN];
      var action    = row[IDX.ACTION];
      var riskScore = computeRiskScore(row, allAlerts);
      var status    = (row[IDX.STATUS] || "OPEN").toUpperCase();

      var riskLabel     = getRiskLabel(riskScore);
      var riskPillClass = getRiskPillClass(riskLabel);
      var statusPillClass = status === "RESOLVED" ? "pill--resolved" : "pill--open";

      var resolveCell;
      if (status === "RESOLVED") {
        resolveCell = '<span class="btn btn--sm btn--resolved">\u2713 Resolved</span>';
      } else {
        resolveCell =
          '<button class="btn btn--sm btn--resolve" onclick="resolveAlert(' + alertId + ')">' +
          "Mark Resolved</button>";
      }

      return (
        "<tr>" +
          '<td class="cell-id">#' + alertId + "</td>" +
          '<td class="cell-ip">' + escapeHtml(sourceIp) + "</td>" +
          "<td>" + escapeHtml(alertType) + "</td>" +
          '<td><span class="pill pill--threat">' + escapeHtml(threat) + "</span></td>" +
          '<td><span class="pill pill--vuln">' + escapeHtml(vuln) + "</span></td>" +
          '<td><span class="pill pill--action">' + escapeHtml(action) + "</span></td>" +
          "<td>" +
            '<span class="pill ' + riskPillClass + '">' +
            riskScore + " \u00B7 " + riskLabel +
            "</span>" +
          "</td>" +
          '<td><span class="pill ' + statusPillClass + '">' + status + "</span></td>" +
          "<td>" + resolveCell + "</td>" +
        "</tr>"
      );
    })
    .join("");
}


// ═════════════════════════════════════════════════════════════
// 6. RESOLVE ALERT
// ═════════════════════════════════════════════════════════════

async function resolveAlert(alertId) {
  try {
    var response = await fetch(API_BASE + "/resolve_alert/" + alertId, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Server responded with " + response.status);
    }

    showToast("Alert #" + alertId + " marked as resolved", "success");
    await loadAlerts();

  } catch (error) {
    showToast("Failed to resolve alert #" + alertId, "error");
    console.error("Resolve failed:", error);
  }
}


// ═════════════════════════════════════════════════════════════
// 7. IP INPUT SYSTEM
// ═════════════════════════════════════════════════════════════

// Populate the dropdown with unique IPs from existing alerts
function populateIpDropdown(data) {
  var ips = {};
  for (var i = 0; i < data.length; i++) {
    var ip = data[i][IDX.IP];
    if (ip) ips[ip] = true;
  }
  var uniqueIps = Object.keys(ips);

  // Preserve current selection
  var currentVal = ipDropdown.value;

  // Clear all except the first "Known IPs…" option
  while (ipDropdown.options.length > 1) {
    ipDropdown.remove(1);
  }

  // Add unique IPs
  for (var j = 0; j < uniqueIps.length; j++) {
    var opt = document.createElement("option");
    opt.value = uniqueIps[j];
    opt.textContent = uniqueIps[j];
    ipDropdown.appendChild(opt);
  }

  // Restore selection if it still exists
  if (currentVal) ipDropdown.value = currentVal;
}

// When user selects from dropdown, fill the text input
ipDropdown.addEventListener("change", function () {
  if (ipDropdown.value) {
    ipTextInput.value = ipDropdown.value;
  }
});

// Generate a random IP (avoids reserved ranges)
function generateRandomIp() {
  var a = Math.floor(Math.random() * 223) + 1; // 1–223 (avoids 0 and 224+)
  var b = Math.floor(Math.random() * 256);
  var c = Math.floor(Math.random() * 256);
  var d = Math.floor(Math.random() * 254) + 1; // 1–254
  // Avoid loopback (127.x.x.x)
  if (a === 127) a = 128;
  return a + "." + b + "." + c + "." + d;
}

btnRandomIp.addEventListener("click", function () {
  var ip = generateRandomIp();
  ipTextInput.value = ip;
  ipDropdown.value = "";
  showToast("Random IP generated: " + ip, "success");
});

// Re-use the last IP used in a simulation
btnSameIp.addEventListener("click", function () {
  if (lastUsedIp) {
    ipTextInput.value = lastUsedIp;
    showToast("Using previous IP: " + lastUsedIp, "success");
  } else {
    showToast("No previous IP — simulate an attack first", "error");
  }
});


// ═════════════════════════════════════════════════════════════
// 8. ATTACK SIMULATION (Single + Batch)
// ═════════════════════════════════════════════════════════════

// Helper: send one event to /add_event
async function sendOneEvent(sourceIp, eventType, severity) {
  var payload = {
    source_ip: sourceIp,
    destination_ip: "10.0.0.1",
    event_type: eventType,
    severity: severity,
    description: "Simulated " + eventType + " from " + sourceIp
  };

  var response = await fetch(API_BASE + "/add_event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Server responded with " + response.status);
  }
}

// Get the current form values (with validation)
function getSimFormValues() {
  var sourceIp  = ipTextInput.value.trim();
  var eventType = document.getElementById("sim-event-type").value;
  var severity  = document.getElementById("sim-severity").value;

  if (!sourceIp || !eventType || !severity) {
    return null;
  }
  return { sourceIp: sourceIp, eventType: eventType, severity: severity };
}

// Single attack (form submit)
simForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  var vals = getSimFormValues();
  if (!vals) {
    simStatus.textContent = "Please fill all fields";
    simStatus.className = "sim-form__status sim-form__status--error";
    return;
  }

  lastUsedIp = vals.sourceIp;
  simStatus.textContent = "Sending\u2026";
  simStatus.className = "sim-form__status";

  try {
    await sendOneEvent(vals.sourceIp, vals.eventType, vals.severity);

    simStatus.textContent = "\u2713 Event sent successfully!";
    simStatus.className = "sim-form__status sim-form__status--success";
    showToast("Attack simulation event sent", "success");
    await loadAlerts();

    setTimeout(function () { simStatus.textContent = ""; }, 4000);

  } catch (error) {
    simStatus.textContent = "\u2717 Failed \u2014 is Flask running?";
    simStatus.className = "sim-form__status sim-form__status--error";
    showToast("Simulation failed: " + error.message, "error");
    console.error("Simulation error:", error);
  }
});

// Batch: Simulate 5 Attacks (same IP to trigger brute force detection)
btnSimulate5.addEventListener("click", async function () {
  var vals = getSimFormValues();
  if (!vals) {
    simStatus.textContent = "Please fill all fields first";
    simStatus.className = "sim-form__status sim-form__status--error";
    return;
  }

  lastUsedIp = vals.sourceIp;
  simStatus.textContent = "Sending 5 events\u2026";
  simStatus.className = "sim-form__status";

  var successCount = 0;
  var failCount = 0;

  for (var i = 0; i < 5; i++) {
    try {
      await sendOneEvent(vals.sourceIp, vals.eventType, vals.severity);
      successCount++;
      simStatus.textContent = "Sent " + successCount + " of 5\u2026";
    } catch (error) {
      failCount++;
      console.error("Event " + (i + 1) + " failed:", error);
    }
  }

  if (failCount === 0) {
    simStatus.textContent = "\u2713 All 5 events sent!";
    simStatus.className = "sim-form__status sim-form__status--success";
    showToast("5 attack events sent from " + vals.sourceIp, "success");
  } else {
    simStatus.textContent = successCount + " sent, " + failCount + " failed";
    simStatus.className = "sim-form__status sim-form__status--error";
    showToast(failCount + " events failed to send", "error");
  }

  await loadAlerts();
  setTimeout(function () { simStatus.textContent = ""; }, 5000);
});


// ═════════════════════════════════════════════════════════════
// 9. AUTO-REFRESH TOGGLE
// ═════════════════════════════════════════════════════════════

autoRefreshBtn.addEventListener("click", function () {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
    autoRefreshBtn.classList.remove("is-active");
    autoRefreshBtn.innerHTML =
      '<svg class="btn__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
      "Auto-Refresh: OFF";
  } else {
    autoRefreshTimer = setInterval(loadAlerts, 5000);
    autoRefreshBtn.classList.add("is-active");
    autoRefreshBtn.innerHTML =
      '<svg class="btn__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
      "Auto-Refresh: ON";
    loadAlerts();
  }
});


// ═════════════════════════════════════════════════════════════
// 10. CHARTS (Chart.js)
// ═════════════════════════════════════════════════════════════

function updateCharts(data) {
  updateBarChart(data);
  updatePieChart(data);
}

function updateBarChart(data) {
  var typeCounts = {};
  for (var i = 0; i < data.length; i++) {
    var type = data[i][IDX.TYPE] || "Unknown";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }

  var labels = Object.keys(typeCounts);
  var values = Object.values(typeCounts);

  var barColors = [
    "rgba(59, 130, 246, 0.7)",
    "rgba(239, 68, 68, 0.7)",
    "rgba(16, 185, 129, 0.7)",
    "rgba(245, 158, 11, 0.7)",
    "rgba(139, 92, 246, 0.7)",
    "rgba(236, 72, 153, 0.7)",
    "rgba(20, 184, 166, 0.7)",
  ];
  var borderColors = barColors.map(function (c) {
    return c.replace("0.7", "1");
  });

  var ctx = document.getElementById("chart-by-type").getContext("2d");

  if (barChart) {
    barChart.data.labels = labels;
    barChart.data.datasets[0].data = values;
    barChart.data.datasets[0].backgroundColor = barColors.slice(0, labels.length);
    barChart.data.datasets[0].borderColor = borderColors.slice(0, labels.length);
    barChart.update();
    return;
  }

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Count",
        data: values,
        backgroundColor: barColors.slice(0, labels.length),
        borderColor: borderColors.slice(0, labels.length),
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#64748b", font: { size: 11 } },
          grid: { color: "rgba(51,65,85,0.2)" },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#64748b",
            font: { size: 11 },
            stepSize: 1,
          },
          grid: { color: "rgba(51,65,85,0.15)" },
        }
      }
    }
  });
}

function updatePieChart(data) {
  var open = 0;
  var resolved = 0;

  for (var i = 0; i < data.length; i++) {
    var status = (data[i][IDX.STATUS] || "OPEN").toUpperCase();
    if (status === "RESOLVED") resolved++;
    else open++;
  }

  var ctx = document.getElementById("chart-status").getContext("2d");

  if (pieChart) {
    pieChart.data.datasets[0].data = [open, resolved];
    pieChart.update();
    return;
  }

  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Open", "Resolved"],
      datasets: [{
        data: [open, resolved],
        backgroundColor: [
          "rgba(245, 158, 11, 0.7)",
          "rgba(16, 185, 129, 0.7)",
        ],
        borderColor: [
          "rgba(245, 158, 11, 1)",
          "rgba(16, 185, 129, 1)",
        ],
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#94a3b8",
            font: { size: 12 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 8,
          }
        }
      }
    }
  });
}


// ═════════════════════════════════════════════════════════════
// 11. TOAST NOTIFICATIONS
// ═════════════════════════════════════════════════════════════

function showToast(message, type) {
  var container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  var toast = document.createElement("div");
  toast.className = "toast toast--" + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function () {
    toast.classList.add("is-leaving");
    setTimeout(function () {
      toast.remove();
    }, 250);
  }, 3000);
}


// ═════════════════════════════════════════════════════════════
// 12. SECURITY HELPER
// ═════════════════════════════════════════════════════════════

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(String(text)));
  return div.innerHTML;
}


// ═════════════════════════════════════════════════════════════
// 13. BOOT
// ═════════════════════════════════════════════════════════════

refreshBtn.addEventListener("click", loadAlerts);
loadAlerts();
