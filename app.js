const $ = id => document.getElementById(id);
let latest = {outer:null, inner:null};
let selected = "outer";
let plotMeta = {};

function options(arr, suffix=" mm") {
  return arr.map(v => `<option value="${v}">${v}${suffix}</option>`).join("");
}

function liteFields(p) {
  return `
    <div class="grid2">
      <label>Construction
        <select id="${p}kind">
          <option value="mono">Monolithic</option>
          <option value="lam">Laminated PVB</option>
        </select>
      </label>
      <label id="${p}monoBox">Nominal thickness
        <select id="${p}th">${options([2,2.5,2.7,3,4,5,6,8,10,12,16,19,22,25])}</select>
      </label>
    </div>
    <div id="${p}lamBox" class="hidden">
      <div class="grid3">
        <label>Ply 1<select id="${p}p1">${options([2.5,3,4,5,6,8,10,12])}</select></label>
        <label>PVB<select id="${p}pvb">${options([.38,.76,1.14,1.52,2.28])}</select></label>
        <label>Ply 2<select id="${p}p2">${options([2.5,3,4,5,6,8,10,12])}</select></label>
      </div>
      <div class="derived">ASTM designation: <b id="${p}des">—</b></div>
    </div>`;
}

async function init() {
  $("outerFields").innerHTML = liteFields("o");
  $("innerFields").innerHTML = liteFields("i");

  for (const p of ["o","i"]) {
    $(`${p}th`).value = 6;
    $(`${p}p1`).value = 6;
    $(`${p}p2`).value = 6;
    $(`${p}pvb`).value = .76;

    [`${p}kind`,`${p}th`,`${p}p1`,`${p}p2`,`${p}pvb`]
      .forEach(id => $(id).addEventListener("change", () => liteUI(p)));

    liteUI(p);
  }

  $("assembly").addEventListener("change", assemblyUI);
  $("support").addEventListener("change", supportUI);
  $("supportedEdges").addEventListener("change", () => {
    if (!$("results").classList.contains("hidden")) calculateAll();
  });
  $("oneSupportedEdge").addEventListener("change", () => {
    if (!$("results").classList.contains("hidden")) calculateAll();
  });

  $("calc").addEventListener("click", calculateAll);
  $("showOuter").addEventListener("click", () => selectLite("outer"));
  $("showInner").addEventListener("click", () => selectLite("inner"));

  $("example1").addEventListener("click", () => {
    $("assembly").value = "single";
    $("width").value = 1200;
    $("height").value = 1500;
    $("support").value = "4";
    $("ikind").value = "mono";
    $("ith").value = 6;
    assemblyUI(); supportUI(); liteUI("i");
    calculateAll(); selectLite("inner");
  });

  $("example2").addEventListener("click", () => {
    $("assembly").value = "igu";
    $("width").value = 2000;
    $("height").value = 2800;
    $("support").value = "4";
    for (const p of ["o","i"]) {
      $(`${p}kind`).value = "mono";
      $(`${p}th`).value = 6;
      liteUI(p);
    }
    assemblyUI(); supportUI();
    calculateAll(); selectLite("outer");
  });

  try {
    plotMeta = await fetch("plot-meta.json").then(r => r.json());
  } catch (e) {
    console.warn("plot-meta.json not loaded", e);
  }

  assemblyUI();
  supportUI();
}

function lamDesignationDetail(p) {
  const p1 = Number($(`${p}p1`).value);
  const p2 = Number($(`${p}p2`).value);
  const pvb = Number($(`${p}pvb`).value);

  const t1 = ASTM.min[p1] || p1;
  const t2 = ASTM.min[p2] || p2;
  const interlayer = Math.min(pvb, 1.52);
  const total = t1 + interlayer + t2;

  return {
    p1, p2, pvb,
    t1, t2, interlayer, total
  };
}

function liteUI(p) {
  const lam = $(`${p}kind`).value === "lam";
  $(`${p}monoBox`).classList.toggle("hidden", lam);
  $(`${p}lamBox`).classList.toggle("hidden", !lam);

  if (lam) {
    const d = NFLEngine.lamDesignation(
      $(`${p}p1`).value,
      $(`${p}pvb`).value,
      $(`${p}p2`).value
    );

    const info = lamDesignationDetail(p);
    $(`${p}des`).textContent = d ? `${d} mm` : "Not covered";

    const calcId = `${p}desCalc`;
    let calc = $(calcId);

    if (!calc) {
      calc = document.createElement("div");
      calc.id = calcId;
      calc.className = "designationCalc";
      $(`${p}des`).parentElement.appendChild(calc);
    }

    calc.innerHTML =
      `<span>ASTM minimum-thickness calculation:</span><br>` +
      `${info.p1} mm nominal → <b>${info.t1.toFixed(2)} mm min</b>` +
      ` &nbsp;+&nbsp; PVB <b>${info.interlayer.toFixed(2)} mm</b>` +
      ` &nbsp;+&nbsp; ${info.p2} mm nominal → <b>${info.t2.toFixed(2)} mm min</b>` +
      `<br>Total used for designation = <b>${info.total.toFixed(2)} mm</b>`;

    // ASTM special-case note
    if (
      (info.p1 === 6 && info.p2 === 6 && (Math.abs(info.pvb - 0.38) < 0.02 || Math.abs(info.pvb - 0.76) < 0.02)) ||
      (info.p1 === 2.5 && info.p2 === 2.5 && Math.abs(info.pvb - 1.52) < 0.02) ||
      (info.p1 === 4 && info.p2 === 4)
    ) {
      calc.innerHTML += `<br><em>ASTM special designation rule applied.</em>`;
    }
  }
}

function supportUI() {
  const s = $("support").value;
  $("edgeBox").classList.toggle("hidden", s !== "2");
  $("oneEdgeBox").classList.toggle("hidden", s !== "1");
}

function assemblyUI() {
  const single = $("assembly").value === "single";
  $("outerCard").classList.toggle("hidden", single);
  $("showOuter").classList.toggle("hidden", single);
  if (single) selected = "inner";
}

function liteInput(p) {
  const kind = $(`${p}kind`).value;
  const designation = kind === "mono"
    ? Number($(`${p}th`).value)
    : NFLEngine.lamDesignation($(`${p}p1`).value, $(`${p}pvb`).value, $(`${p}p2`).value);

  return {kind, designation};
}

function calculateOne(p, name) {
  const x = liteInput(p);

  const r = NFLEngine.calculate({
    kind:x.kind,
    support:$("support").value,
    designation:x.designation,
    width:Number($("width").value),
    height:Number($("height").value),
    supportedEdges:$("supportedEdges").value,
    oneSupportedEdge:$("oneSupportedEdge").value
  });

  r.name = name;
  r.desc = x.kind === "mono"
    ? `${x.designation} mm monolithic`
    : `${x.designation} mm laminated designation`;

  return r;
}

function calculateAll() {
  latest.inner = calculateOne("i", "Inner");
  latest.outer = $("assembly").value === "single" ? null : calculateOne("o", "Outer");

  const arr = [latest.outer, latest.inner].filter(Boolean);

  $("resultCards").innerHTML = arr.map(r => `
    <div class="resultCard" data-name="${r.name.toLowerCase()}">
      <b>${r.name} Lite</b>
      <div class="kpi">${
        r.ok ? r.nfl.toFixed(2) + " kPa"
        : r.outsideRange ? (r.direction==="below" ? `< ${r.qmin.toFixed(2)} kPa` : `> ${r.qmax.toFixed(2)} kPa`)
        : r.chartUnsupported ? "NOT COVERED"
        : r.outsideDimension ? "OUTSIDE RANGE"
        : "MANUAL"
      }</div>
      <div class="row"><span>Glass</span><b>${r.desc}</b></div>
      <div class="row"><span>ASTM chart</span><b>Fig. A1.${r.figure}</b></div>
      <div class="row"><span>Long × Short</span><b>${Math.round(r.geom.long)} × ${Math.round(r.geom.short)} mm</b></div>
      <div class="row"><span>AR</span><b>${r.geom.ar.toFixed(2)}</b></div>
      ${(r.twoSide || r.oneEdge) ? `<div class="row"><span>Unsupported edge</span><b>${Math.round(r.unsupported)} mm</b></div>` : ""}
      ${r.oneEdge ? `<div class="row"><span>Supported edge</span><b>${({left:"Left",right:"Right",top:"Top",bottom:"Bottom"})[r.oneSupportedEdge]}</b></div>` : ""}
    </div>`).join("");

  $("results").classList.remove("hidden");
  $("viewer").classList.remove("hidden");

  if ($("assembly").value === "single") selected = "inner";
  showChart();
}

function selectLite(v) {
  selected = v;
  showChart();
}

function showChart() {
  const r = latest[selected];
  if (!r) return;

  document.querySelectorAll(".resultCard")
    .forEach(x => x.classList.toggle("active", x.dataset.name === selected));

  const img = $("chartImg");
  img.onload = () => drawOverlay(r, img);
  img.src = `A1_${String(r.figure).padStart(2, "0")}.png`;

  $("chartSubtitle").textContent =
    `${r.name} · ${r.desc} · ASTM Fig. A1.${r.figure}`;

  if (r.chartUnsupported) {
    $("chartNote").innerHTML =
      `<b>NOT COVERED BY ASTM FIG. A1.${r.figure}</b>. ${r.designation} mm does not have a thickness/designation line on this chart.`;
  } else if (r.outsideDimension) {
    $("chartNote").innerHTML =
      `<b>OUTSIDE ASTM FIG. A1.${r.figure} DIMENSION RANGE</b>. Unsupported-edge length = ${Math.round(r.unsupported)} mm; printed chart range = ${r.Lmin}–${r.Lmax} mm.`;
  } else if (r.outsideRange) {
    const edgeText = r.supportedEdges === "tb" ? "Top / Bottom supported" : "Left / Right supported";
    const limitText = r.direction === "below"
      ? `NFL < ${r.qmin.toFixed(2)} kPa`
      : `NFL > ${r.qmax.toFixed(2)} kPa`;
    $("chartNote").innerHTML =
      `<b>${limitText}</b>. ${edgeText}; unsupported-edge length = ${Math.round(r.unsupported)} mm. ` +
      `The selected thickness line is highlighted, but the actual intersection lies outside the printed ASTM chart range, so no precise ASTM chart value is reported.`;
  } else if (!r.ok) {
    $("chartNote").innerHTML =
      `<b>${r.error}</b> Original ASTM figure shown for manual review.`;
  } else if (r.oneEdge) {
    const edgeName = ({left:"Left",right:"Right",top:"Top",bottom:"Bottom"})[r.oneSupportedEdge];
    $("chartNote").innerHTML =
      `<b>NFL = ${r.nfl.toFixed(2)} kPa</b>. ${edgeName} edge supported; cantilever / unsupported-edge length = ${Math.round(r.unsupported)} mm. ` +
      `Green = selected thickness line; blue = dimension/load guide; red = NFL intersection.`;
  } else if (r.twoSide) {
    const edgeText = r.supportedEdges === "tb"
      ? "Top / Bottom supported"
      : "Left / Right supported";
    $("chartNote").innerHTML =
      `<b>NFL = ${r.nfl.toFixed(2)} kPa</b>. ${edgeText}; unsupported-edge length = ${Math.round(r.unsupported)} mm. ` +
      `Green = selected thickness line; blue = dimension/load guide; red = NFL intersection.`;
  } else {
    $("chartNote").innerHTML =
      `<b>NFL = ${r.nfl.toFixed(2)} kPa</b>. Red = panel point; blue = AR line; green = highlighted NFL contour.`;
  }
}

function drawOverlay(r, img) {
  const c = $("overlay");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;

  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);

  if (!r.ok && !r.outsideRange && !r.outsideDimension) return;

  if (r.oneEdge) {
    // Fig. A1.28 / A1.44 are log-log charts: x = load (kPa),
    // y = unsupported-edge length (mm), selected thickness line q = C/L^2.
    const isMono = r.figure === 28;
    const b = isMono ? [81,656,61,464] : [99,655,70,460];
    const qmin = isMono ? 0.25 : 0.20;
    const qmax = 10.0;
    const Lmin = isMono ? 260 : 200;
    const Lmax = 3000;
    const [x0,x1,y0,y1] = b;

    const X = q => x0 +
      (Math.log10(q)-Math.log10(qmin)) /
      (Math.log10(qmax)-Math.log10(qmin)) * (x1-x0);

    const Y = L => y1 -
      (Math.log10(L)-Math.log10(Lmin)) /
      (Math.log10(Lmax)-Math.log10(Lmin)) * (y1-y0);

    // Green: selected ASTM thickness/designation line.
    ctx.save();
    ctx.strokeStyle = "#067647";
    ctx.lineWidth = 7;
    ctx.shadowColor = "rgba(6,118,71,.25)";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    let started = false;

    for (let L=Lmin; L<=Lmax; L*=1.008) {
      const q = r.C / Math.pow(L,2);
      if (q >= qmin && q <= qmax) {
        if (!started) {
          ctx.moveTo(X(q),Y(L));
          started = true;
        } else {
          ctx.lineTo(X(q),Y(L));
        }
      }
    }
    if (started) ctx.stroke();
    ctx.restore();

    // If unsupported length itself is outside printed y-range, do not fake a point.
    if (r.outsideDimension) return;

    // If load intersection lies outside printed x-range, show only the dimension guide.
    if (r.outsideRange) {
      ctx.save();
      ctx.strokeStyle = "#175cd3";
      ctx.lineWidth = 3;
      ctx.setLineDash([10,7]);
      ctx.beginPath();
      ctx.moveTo(x0,Y(r.unsupported));
      ctx.lineTo(x1,Y(r.unsupported));
      ctx.stroke();
      ctx.restore();

      const label = r.direction === "below"
        ? `< ${r.qmin.toFixed(2)} kPa`
        : `> ${r.qmax.toFixed(2)} kPa`;

      ctx.font = "bold 22px system-ui";
      const tw = ctx.measureText(label).width;
      const xx = 12;
      const yy = Math.max(32,Y(r.unsupported)-12);

      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.fillRect(xx-7,yy-23,tw+14,31);
      ctx.strokeStyle = "#d92d20";
      ctx.lineWidth = 2;
      ctx.strokeRect(xx-7,yy-23,tw+14,31);
      ctx.fillStyle = "#d92d20";
      ctx.fillText(label,xx,yy);
      return;
    }

    // Blue guides to intersection.
    ctx.save();
    ctx.strokeStyle = "#175cd3";
    ctx.lineWidth = 3;
    ctx.setLineDash([10,7]);
    ctx.beginPath();
    ctx.moveTo(x0,Y(r.unsupported));
    ctx.lineTo(X(r.raw),Y(r.unsupported));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(r.raw),y1);
    ctx.lineTo(X(r.raw),Y(r.unsupported));
    ctx.stroke();
    ctx.restore();

    // Red intersection.
    ctx.beginPath();
    ctx.arc(X(r.raw),Y(r.unsupported),10,0,Math.PI*2);
    ctx.fillStyle = "#d92d20";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    const label = `${r.nfl.toFixed(2)} kPa`;
    ctx.font = "bold 22px system-ui";
    const tw = ctx.measureText(label).width;
    const xx = Math.min(c.width-tw-24,X(r.raw)+12);
    const yy = Math.max(30,Y(r.unsupported)-12);

    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillRect(xx-7,yy-23,tw+14,31);
    ctx.strokeStyle = "#d92d20";
    ctx.lineWidth = 2;
    ctx.strokeRect(xx-7,yy-23,tw+14,31);
    ctx.fillStyle = "#d92d20";
    ctx.fillText(label,xx,yy);
    return;
  }

  if (r.twoSide) {
    const b = r.figure === 27 ? [78,654,61,463] : [87,657,69,469];
    const qmin = r.figure === 27 ? .25 : .20;
    const qmax = r.figure === 27 ? 10 : 8;
    const Lmin = r.figure === 27 ? 260 : 200;
    const Lmax = r.figure === 27 ? 3500 : 3000;

    const [x0,x1,y0,y1] = b;

    const X = q => x0 +
      (Math.log10(q)-Math.log10(qmin)) /
      (Math.log10(qmax)-Math.log10(qmin)) * (x1-x0);

    const Y = L => y1 -
      (Math.log10(L)-Math.log10(Lmin)) /
      (Math.log10(Lmax)-Math.log10(Lmin)) * (y1-y0);

    // Green: selected thickness line
    ctx.save();
    ctx.strokeStyle = "#067647";
    ctx.lineWidth = 7;
    ctx.shadowColor = "rgba(6,118,71,.25)";
    ctx.shadowBlur = 5;
    ctx.beginPath();

    let started = false;
    for (let L=Lmin; L<=Lmax; L*=1.01) {
      const q = r.C / Math.pow(L,4);
      if (q >= qmin && q <= qmax) {
        if (!started) {
          ctx.moveTo(X(q),Y(L));
          started = true;
        } else {
          ctx.lineTo(X(q),Y(L));
        }
      }
    }
    if (started) ctx.stroke();
    ctx.restore();

    // For an out-of-range point, keep the selected thickness line highlighted,
    // but do not draw a fake ASTM intersection beyond the printed chart.
    if (r.outsideRange) {
      ctx.save();
      ctx.strokeStyle = "#175cd3";
      ctx.lineWidth = 3;
      ctx.setLineDash([10,7]);
      ctx.beginPath();
      ctx.moveTo(x0, Y(r.unsupported));
      ctx.lineTo(x1, Y(r.unsupported));
      ctx.stroke();
      ctx.restore();

      const label = r.direction === "below"
        ? `< ${r.qmin.toFixed(2)} kPa`
        : `> ${r.qmax.toFixed(2)} kPa`;

      ctx.font = "bold 22px system-ui";
      const tw = ctx.measureText(label).width;
      const xx = 12;
      const yy = Math.max(32, Y(r.unsupported) - 12);

      ctx.fillStyle = "rgba(255,255,255,.95)";
      ctx.fillRect(xx-7,yy-23,tw+14,31);
      ctx.strokeStyle = "#d92d20";
      ctx.lineWidth = 2;
      ctx.strokeRect(xx-7,yy-23,tw+14,31);
      ctx.fillStyle = "#d92d20";
      ctx.fillText(label,xx,yy);
      return;
    }

    // Blue guides
    ctx.save();
    ctx.strokeStyle = "#175cd3";
    ctx.lineWidth = 3;
    ctx.setLineDash([10,7]);

    ctx.beginPath();
    ctx.moveTo(x0,Y(r.unsupported));
    ctx.lineTo(X(r.raw),Y(r.unsupported));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(X(r.raw),y1);
    ctx.lineTo(X(r.raw),Y(r.unsupported));
    ctx.stroke();
    ctx.restore();

    // Red intersection
    ctx.beginPath();
    ctx.arc(X(r.raw),Y(r.unsupported),10,0,Math.PI*2);
    ctx.fillStyle = "#d92d20";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    // Label
    const label = `${r.nfl.toFixed(2)} kPa`;
    ctx.font = "bold 22px system-ui";
    const tw = ctx.measureText(label).width;

    const xx = Math.min(c.width - tw - 24, X(r.raw) + 12);
    const yy = Math.max(30, Y(r.unsupported) - 12);

    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillRect(xx-7,yy-23,tw+14,31);
    ctx.strokeStyle = "#d92d20";
    ctx.lineWidth = 2;
    ctx.strokeRect(xx-7,yy-23,tw+14,31);
    ctx.fillStyle = "#d92d20";
    ctx.fillText(label,xx,yy);
    return;
  }

  const meta = plotMeta[`A1.${r.figure}`];
  if (!meta || !meta.bounds || !meta.xmax || !meta.ymax) return;

  const [x0,x1,y0,y1] = meta.bounds;
  const W=x1-x0, H=y1-y0;
  const sx=x=>x0+x/meta.xmax*W;
  const sy=y=>y1-y/meta.ymax*H;

  const long=r.geom.long, short=r.geom.short;

  ctx.save();
  ctx.strokeStyle="#175cd3";
  ctx.lineWidth=4;
  ctx.setLineDash([12,8]);
  ctx.beginPath();
  const maxx=Math.min(meta.xmax,r.geom.ar*meta.ymax);
  ctx.moveTo(sx(0),sy(0));
  ctx.lineTo(sx(maxx),sy(maxx/r.geom.ar));
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle="#067647";
  ctx.lineWidth=6;
  ctx.beginPath();
  let started=false;

  for(let x=Math.max(50,meta.xmax*.015);x<=meta.xmax;x+=meta.xmax/260){
    const y=NFLEngine.contourY(r.kind,r.designation,r.nfl,x);
    if(isFinite(y)&&y>=0&&y<=meta.ymax&&y<=x){
      if(!started){ctx.moveTo(sx(x),sy(y));started=true}
      else ctx.lineTo(sx(x),sy(y));
    }
  }

  if(started)ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(sx(long),sy(short),10,0,Math.PI*2);
  ctx.fillStyle="#d92d20";
  ctx.fill();
  ctx.lineWidth=4;
  ctx.strokeStyle="#fff";
  ctx.stroke();
}

init();
