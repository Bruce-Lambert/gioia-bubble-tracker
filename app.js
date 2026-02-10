/* global Chart */

const fmtUsd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const fmtPct = new Intl.NumberFormat(undefined, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const el = (id) => document.getElementById(id);

const firstIndexOnOrAfter = (sortedDates, isoDate) => {
  const idx = sortedDates.findIndex((d) => d >= isoDate);
  return idx === -1 ? null : idx;
};

const toSortedDates = (seriesObj) => Object.keys(seriesObj || {}).sort();

const predictionLinesPlugin = {
  id: "predictionLines",
  afterDraw(chart, _args, opts) {
    if (!opts || !Array.isArray(opts.lines) || opts.lines.length === 0) return;

    const { ctx, chartArea } = chart;
    const y = chart.scales.y;
    if (!y) return;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.textBaseline = "bottom";

    for (const line of opts.lines) {
      if (typeof line.price !== "number") continue;
      const yPos = y.getPixelForValue(line.price);
      const color = line.color || "rgba(15, 23, 42, 0.5)";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.beginPath();
      ctx.moveTo(chartArea.left, yPos);
      ctx.lineTo(chartArea.right, yPos);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(line.label, chartArea.right - 4, yPos - 3);
      ctx.setLineDash([6, 6]);
    }

    ctx.restore();
  }
};

Chart.register(predictionLinesPlugin);

const setText = (id, value) => { el(id).textContent = value; };

const charts = {};

const buildSmallChart = (canvasEl, labels, data, predictionLines, color) => {
  return new Chart(canvasEl.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [{
        data,
        borderColor: color,
        backgroundColor: color.replace(")", ", 0.08)").replace("rgb(", "rgba("),
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => fmtUsd.format(context.parsed.y)
          }
        },
        predictionLines: { lines: predictionLines }
      },
      scales: {
        x: { ticks: { maxTicksLimit: 6, font: { size: 10 } } },
        y: {
          beginAtZero: false,
          ticks: { callback: (v) => fmtUsd.format(v), font: { size: 10 } }
        }
      }
    }
  });
};

const main = async () => {
  const cfg = await loadJson("config/predictions.json");
  const data = await loadJson("data/prices.json");

  setText("disclaimer", cfg.disclaimer || "");

  const sources = el("sources");
  sources.innerHTML = "";
  for (const ev of cfg.events || []) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = ev.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = `${ev.date} — ${ev.title}`;
    li.appendChild(a);
    sources.appendChild(li);
  }

  const tickers = cfg.tickers || [];
  const events = cfg.events || [];
  const colors = [
    "rgb(59, 130, 246)",
    "rgb(16, 185, 129)",
    "rgb(139, 92, 246)",
    "rgb(245, 158, 11)"
  ];

  const grid = el("chart-grid");
  grid.innerHTML = "";

  let anyData = false;
  let correctCount = 0;
  let totalCount = 0;
  const correctCases = [];

  for (let ti = 0; ti < tickers.length; ti++) {
    const t = tickers[ti];
    const symbol = t.symbol;
    const series = data.series?.[symbol] || {};
    const dates = toSortedDates(series);

    // Build chart cell
    const cell = document.createElement("div");
    cell.className = "chart-cell";

    const title = document.createElement("div");
    title.className = "chart-title";
    title.textContent = `${symbol} — ${t.name}`;
    cell.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.className = "chart-subtitle";

    if (dates.length === 0) {
      subtitle.textContent = "No data yet";
      cell.appendChild(subtitle);
      grid.appendChild(cell);
      continue;
    }

    anyData = true;
    const lastDate = dates[dates.length - 1];
    const lastPrice = series[lastDate];

    subtitle.textContent = `${fmtUsd.format(lastPrice)} as of ${lastDate}`;
    cell.appendChild(subtitle);

    const wrap = document.createElement("div");
    wrap.className = "chart-canvas-wrap";
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-label", `${symbol} price chart`);
    canvas.setAttribute("role", "img");
    wrap.appendChild(canvas);
    cell.appendChild(wrap);
    grid.appendChild(cell);

    // Compute prediction lines and scorecard
    const priceValues = dates.map((d) => series[d]);
    const predictionLines = [];

    for (const ev of events) {
      const idx = firstIndexOnOrAfter(dates, ev.date);
      if (idx === null) continue;
      const callDate = dates[idx];
      const callPrice = series[callDate];
      const isDown = lastPrice < callPrice;

      const isAug = ev.date === events[0]?.date;
      const dateLabel = isAug ? "Aug 8" : "Oct 30";
      predictionLines.push({
        price: callPrice,
        label: `${dateLabel}: ${fmtUsd.format(callPrice)}`,
        color: isAug ? "rgba(220, 38, 38, 0.5)" : "rgba(37, 99, 235, 0.5)"
      });

      totalCount++;
      if (isDown) {
        correctCount++;
        correctCases.push(`${symbol} ${dateLabel}`);
      }
    }

    // Destroy previous chart instance if re-rendering
    if (charts[symbol]) charts[symbol].destroy();
    charts[symbol] = buildSmallChart(canvas, dates, priceValues, predictionLines, colors[ti % colors.length]);
  }

  // Render scorecard
  const scorecardEl = el("scorecard");
  if (totalCount > 0) {
    const detail = correctCount > 0
      ? ` (${correctCases.join(", ")})`
      : "";
    scorecardEl.innerHTML = `<strong>Scorecard:</strong> Price is below the prediction-date close in <strong>${correctCount} of ${totalCount}</strong> cases${detail}.`;
  } else {
    scorecardEl.textContent = "";
  }

  if (anyData) {
    const sampleSeries = data.series?.[tickers[0]?.symbol] || {};
    const sampleDates = toSortedDates(sampleSeries);
    const lastDate = sampleDates[sampleDates.length - 1] || "—";
    setText("as-of", `As of ${lastDate} (adjusted close).`);
  } else {
    setText("as-of", "No price data yet. Add the Alpha Vantage API key and run the workflow once.");
  }
};

const loadJson = async (path) => {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  return res.json();
};

document.addEventListener("DOMContentLoaded", () => {
  main().catch((err) => {
    console.error(err);
    setText("as-of", `Error: ${err.message}`);
  });
});
