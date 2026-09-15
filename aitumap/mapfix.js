(() => {
  "use strict";

  // ---------------------------------------------------------------------
  // 1) STRAIGHTEN THE FLOOR PLAN
  //
  // The source data draws each building's floor plan in its own tilted
  // coordinate system (real building geometry, not aligned to the SVG axes).
  // We don't touch the original coordinates (that would risk breaking room
  // hit-testing / the search feature baked into map.js). Instead we measure
  // the dominant wall angle from the actual room/wall polylines that are
  // already on the page, and apply a CSS rotation - around a shared pivot -
  // to the floor-plan layers only (walls/rooms/stairs), while the "C1.x"
  // watermark label stays upright. We then recompute the SVG viewBox so the
  // rotated plan fits snugly again, instead of being clipped or shrunk.
  // ---------------------------------------------------------------------

  function parsePoints(str) {
    const nums = str.trim().split(/[\s,]+/).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    return pts;
  }

  // Only the structural groups - walls, rooms, voids - carry the building's
  // true grid. The wcs/escapes *-icon groups are little pictograms (a
  // wheelchair, an exit arrow...) full of short diagonal strokes that would
  // otherwise swamp the histogram with noise unrelated to the architecture.
  const STRUCTURAL_SELECTOR = [
    ".map-groups-rooms", ".map-groups-rooms-vk", ".map-groups-walls",
    ".map-groups-techs", ".map-groups-void", ".map-groups-wcs", ".map-groups-escapes",
  ].map((s) => `${s} polyline, ${s} polygon`).join(", ");

  function dominantAngle(root) {
    const bins = new Map();
    const binSize = 0.2;
    root.querySelectorAll(STRUCTURAL_SELECTOR).forEach((el) => {
      if (el.closest('[class*="-icon"]')) return;
      const raw = el.getAttribute("points");
      if (!raw) return;
      const pts = parsePoints(raw);
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 3) continue;
        let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        ang = ((ang % 90) + 90) % 90;
        const bin = Math.round(ang / binSize) * binSize;
        bins.set(bin, (bins.get(bin) || 0) + len);
      }
    });
    let bestAngle = 0, bestWeight = -1;
    bins.forEach((w, a) => {
      if (w > bestWeight) { bestWeight = w; bestAngle = a; }
    });
    // fold into (-45, 45] so we always rotate the short way to the nearest axis
    let a = bestAngle % 90;
    if (a > 45) a -= 90;
    return -a;
  }

  // Real, post-transform bounding box of `el`, expressed in the SVG's own
  // viewBox coordinate system. Unlike getBBox() (which ignores the
  // element's own transform) this reflects however it's actually rendered
  // right now - including both the original attribute transform and any
  // CSS transform we just applied - so it's safe to call after rotating.
  function renderedBBoxInViewBox(svg, el) {
    const rect = el.getBoundingClientRect();
    const ctm = svg.getScreenCTM().inverse();
    const pt = svg.createSVGPoint();
    const corners = [
      [rect.left, rect.top], [rect.right, rect.top],
      [rect.left, rect.bottom], [rect.right, rect.bottom],
    ].map(([x, y]) => {
      pt.x = x; pt.y = y;
      const t = pt.matrixTransform(ctm);
      return [t.x, t.y];
    });
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }

  function unionBoxes(boxes) {
    return boxes.reduce((a, b) => ({
      minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
      maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
    }));
  }

  // A building's outline (path.bg) is identical across its floors - so we
  // key the computed straightening angle off that outline and reuse it for
  // every floor of the same building. Otherwise each floor's own (smaller,
  // noisier) set of walls could yield a slightly different angle and the
  // whole plan would visibly "jump" every time you switch floors.
  const angleCache = new Map();

  function straighten() {
    const svg = document.querySelector("svg.aitu-plan-svg");
    if (!svg) return;
    const bg = svg.querySelector("#WALLPAPER path.bg");
    const stairs = svg.querySelector("#WALLPAPER .map-groups-stairs");
    const label = svg.querySelector("#WALLPAPER path.label-huge");
    const blocksInner = svg.querySelector("#BLOCKS > g");
    if (!bg || !blocksInner) return;

    // Avoid redoing work: tag the element that identifies "this render"
    if (svg.__mapfixDone === blocksInner) return;
    svg.__mapfixDone = blocksInner;

    // Reset any transform we previously added before measuring, in case of re-entry
    [bg, stairs, blocksInner].forEach((el) => {
      if (!el) return;
      el.style.transform = "";
      const t = el.getAttribute("transform");
      if (t && t.startsWith("rotate(")) {
        el.setAttribute("transform", t.replace(/^rotate\([^)]*\)\s*/, ""));
      }
    });

    // blocksInner never carries its own transform attribute, so its bbox is
    // already expressed directly in view-box coordinates - a safe pivot.
    const pivotBox = blocksInner.getBBox();
    const cx = pivotBox.x + pivotBox.width / 2;
    const cy = pivotBox.y + pivotBox.height / 2;

    const buildingKey = bg.getAttribute("d");
    let angle = angleCache.get(buildingKey);
    if (angle === undefined) {
      angle = dominantAngle(blocksInner);
      angleCache.set(buildingKey, angle);
    }

    // Use the SVG "transform" *attribute* (not a CSS transform) so the
    // pivot and composition order follow the SVG spec exactly:
    // rotate(angle, cx, cy) is applied around (cx, cy) in the current user
    // space, then whatever original transform (e.g. path.bg's translate)
    // is applied first/innermost - matching how it already renders today.
    [bg, stairs, blocksInner].forEach((el) => {
      if (!el) return;
      const original = el.getAttribute("transform") || "";
      el.setAttribute("transform", `rotate(${angle} ${cx} ${cy}) ${original}`.trim());
      el.style.transform = "";
    });

    const boxes = [renderedBBoxInViewBox(svg, bg), renderedBBoxInViewBox(svg, blocksInner)];
    if (label) boxes.push(renderedBBoxInViewBox(svg, label));

    const { minX, minY, maxX, maxY } = unionBoxes(boxes);
    const pad = Math.max(6, (maxX - minX) * 0.03);
    const vb = [
      (minX - pad).toFixed(2),
      (minY - pad).toFixed(2),
      (maxX - minX + pad * 2).toFixed(2),
      (maxY - minY + pad * 2).toFixed(2),
    ].join(" ");
    svg.setAttribute("viewBox", vb);
  }

  // Re-run whenever the app swaps in a new floor/building (new DOM nodes),
  // and also right after any click on the floor/building controls for a
  // snappier, flash-free update.
  function schedule() {
    requestAnimationFrame(() => requestAnimationFrame(straighten));
  }

  const observer = new MutationObserver(schedule);
  function boot() {
    const root = document.getElementById("root");
    if (!root) { requestAnimationFrame(boot); return; }
    observer.observe(root, { childList: true, subtree: true });
    document.addEventListener("click", (e) => {
      if (e.target.closest("select, button, .floor-control")) schedule();
    });
    document.addEventListener("change", (e) => {
      if (e.target.closest("select")) schedule();
    });
    schedule();
  }
  boot();

  // ---------------------------------------------------------------------
  // 2) REAL FULLSCREEN TOGGLE
  //
  // Lives outside the React root, so it survives every re-render. Works
  // both when this page is opened directly and when it's embedded in the
  // schedule app's <iframe> (which now has allow="fullscreen").
  // ---------------------------------------------------------------------
  function addFullscreenButton() {
    if (document.querySelector(".aitu-fs-btn")) return;
    const shellReady = document.querySelector(".aitu-shell");
    if (!shellReady) { requestAnimationFrame(addFullscreenButton); return; }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "aitu-fs-btn";
    btn.setAttribute("aria-label", "Toggle fullscreen");
    btn.title = "Toggle fullscreen";
    const iconExpand = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
    const iconCollapse = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v3a2 2 0 0 1-2 2H4M15 3v3a2 2 0 0 0 2 2h3M9 21v-3a2 2 0 0 0-2-2H4M15 21v-3a2 2 0 0 1 2-2h3"/></svg>';
    btn.innerHTML = iconExpand;

    function isFs() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement);
    }
    function sync() { btn.innerHTML = isFs() ? iconCollapse : iconExpand; }

    btn.addEventListener("click", async () => {
      try {
        if (!isFs()) {
          const target = document.documentElement;
          if (target.requestFullscreen) await target.requestFullscreen();
          else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
        } else if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } catch (err) {
        // Fullscreen can be blocked (e.g. iframe without permission) -
        // fall back to opening this same page, with its current state, in a new tab.
        const params = new URLSearchParams(location.search);
        window.open(location.pathname + "?" + params.toString(), "_blank", "noopener");
      }
      sync();
    });
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);

    shellReady.appendChild(btn);
  }
  addFullscreenButton();
})();
