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
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.beginPath();
      ctx.moveTo(chartArea.left, yPos);
      ctx.lineTo(chartArea.right, yPos);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(line.label, chartArea.right - 6, yPos - 4);
      ctx.setLineDash([6, 6]);
    }

    ctx.restore();
  }
};

Chart.register(predictionLinesPlugin);

let chart;

const buildChart = (labels, datasets, predictionLines) => {
  const ctx = el("chart").getContext("2d");
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (context) => {
              const v = context.parsed.y;
              return `${context.dataset.label}: ${fmtUsd.format(v)}`;
            }
          }
        },
        predictionLines: { lines: predictionLines }
      },
      scales: {
        x: { ticks: { maxTicksLimit: 10 } },
        y: {
          beginAtZero: false,
          ticks: { callback: (v) => fmtUsd.format(v) }
        }
      }
    }
  });
};

const setText = (id, value) => { el(id).textContent = value; };

const loadJson = async (path) => {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  return res.json();
};

const computeSeries = ({ series, dates, callDate, investAmount }) => {
  const idx = firstIndexOnOrAfter(dates, callDate);
  if (idx === null) return { idx: null, actualDate: null, shares: null, values: [] };

  const actualDate = dates[idx];
  const priceAt = series[actualDate];
  const shares = investAmount / priceAt;

  const values = dates.map((d) => shares * series[d]);
  return { idx, actualDate, shares, values };
};

const computeReturn = (startValue, endValue) => {
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || startValue === 0) return null;
  return (endValue / startValue) - 1;
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

  const tickerSelect = el("ticker");
  tickerSelect.innerHTML = "";
  for (const t of cfg.tickers || []) {
    const opt = document.createElement("option");
    opt.value = t.symbol;
    opt.textContent = `${t.symbol} — ${t.name}`;
    tickerSelect.appendChild(opt);
  }

  const investAmount = cfg.metrics?.invest_amount_usd ?? 1000;

  const [evAug, evOct] = cfg.events || [];
  const augDate = evAug?.date;
  const octDate = evOct?.date;

  const render = (symbol) => {
    const series = data.series?.[symbol] || {};
    const dates = toSortedDates(series);

    if (dates.length === 0) {
      el("verdicts").innerHTML = "";
      setText("as-of", "No price data yet. Add the Alpha Vantage API key and run the workflow once.");
      setText("chart-note", "Once data is generated, this chart will update automatically on trading days.");
      setText("price-now", "—");
      setText("price-date", "—");
      setText("invest-aug", "—");
      setText("ret-aug", "—");
      setText("invest-oct", "—");
      setText("ret-oct", "—");
      if (chart) chart.destroy();
      return;
    }

    const lastDate = dates[dates.length - 1];
    const lastPrice = series[lastDate];

    // Render verdict banners
    const verdictsEl = el("verdicts");
    verdictsEl.innerHTML = "";
    for (const ev of [evAug, evOct]) {
      if (!ev) continue;
      const idx = firstIndexOnOrAfter(dates, ev.date);
      if (idx === null) continue;
      const callDate = dates[idx];
      const callPrice = series[callDate];
      const change = (lastPrice - callPrice) / callPrice;
      const isDown = lastPrice < callPrice;
      const div = document.createElement("div");
      div.className = `verdict ${isDown ? "verdict--down" : "verdict--up"}`;
      div.innerHTML = `<span class="verdict-arrow">${isDown ? "\u25BC" : "\u25B2"}</span>`
        + `<div class="verdict-text"><div class="verdict-label">${ev.label}: `
        + `${symbol} ${isDown ? "down" : "up"} ${fmtPct.format(Math.abs(change))}</div>`
        + `<div>${fmtUsd.format(callPrice)} on ${callDate} → ${fmtUsd.format(lastPrice)} on ${lastDate}</div></div>`;
      verdictsEl.appendChild(div);
    }

    setText("as-of", `As of ${lastDate} (adjusted close).`);
    setText("price-now", fmtUsd.format(lastPrice));
    setText("price-date", `Date: ${lastDate}`);

    const aug = computeSeries({ series, dates, callDate: augDate, investAmount });
    const oct = computeSeries({ series, dates, callDate: octDate, investAmount });

    const augEnd = aug.values[aug.values.length - 1];
    const octEnd = oct.values[oct.values.length - 1];

    if (aug.actualDate) {
      setText("invest-aug", fmtUsd.format(augEnd));
      const r = computeReturn(investAmount, augEnd);
      setText("ret-aug", `Start: ${aug.actualDate} • Return: ${r === null ? "—" : fmtPct.format(r)}`);
    } else {
      setText("invest-aug", "—");
      setText("ret-aug", "—");
    }

    if (oct.actualDate) {
      setText("invest-oct", fmtUsd.format(octEnd));
      const r = computeReturn(investAmount, octEnd);
      setText("ret-oct", `Start: ${oct.actualDate} • Return: ${r === null ? "—" : fmtPct.format(r)}`);
    } else {
      setText("invest-oct", "—");
      setText("ret-oct", "—");
    }

    const priceValues = dates.map((d) => series[d]);

    const datasets = [
      {
        label: `${symbol} adjusted close`,
        data: priceValues,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15
      }
    ];

    const augIdx = firstIndexOnOrAfter(dates, augDate);
    const octIdx = firstIndexOnOrAfter(dates, octDate);
    const augPrice = augIdx !== null ? series[dates[augIdx]] : null;
    const octPrice = octIdx !== null ? series[dates[octIdx]] : null;

    const predictionLines = [
      { price: augPrice, label: `Aug 8 close: ${fmtUsd.format(augPrice)}`, color: "rgba(220, 38, 38, 0.5)" },
      { price: octPrice, label: `Oct 30 close: ${fmtUsd.format(octPrice)}`, color: "rgba(37, 99, 235, 0.5)" }
    ].filter((x) => typeof x.price === "number");

    buildChart(dates, datasets, predictionLines);

    const noteParts = [];
    if (aug.actualDate && aug.actualDate !== augDate) noteParts.push(`Aug marker uses next trading day (${aug.actualDate}).`);
    if (oct.actualDate && oct.actualDate !== octDate) noteParts.push(`Oct marker uses next trading day (${oct.actualDate}).`);
    setText("chart-note", noteParts.join(" "));
  };

  tickerSelect.addEventListener("change", () => render(tickerSelect.value));

  // default render
  render(tickerSelect.value);
};

document.addEventListener("DOMContentLoaded", () => {
  main().catch((err) => {
    console.error(err);
    setText("as-of", `Error: ${err.message}`);
  });
});
