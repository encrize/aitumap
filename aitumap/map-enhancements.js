/* Accessibility, room matching, directory, zoom/pan and fullscreen enhancements. */
(() => {
  const stage = document.querySelector('.map-stage');
  const shell = document.querySelector('.aitu-shell');
  const input = document.querySelector('#room');
  const select = document.querySelector('#block');
  const floorNav = document.querySelector('.floor-control');
  if (!stage || !shell || !input || !select || !floorNav) return;

  const normalise = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const baseRoom = value => normalise(value).replace(/([0-9])(?:[A-Z]+)$/i, '$1');
  // Directory is generated from the complete official plan catalogue, rather than
  // relying on whichever SVG labels happen to be mounted at a given moment.
  const roomCatalogue = ["C1.1.139","C1.1.140","C1.1.141","C1.1.142","C1.1.143","C1.1.155","C1.1.156","C1.1.163","C1.1.164","C1.1.165","C1.1.168","C1.1.168.1","C1.1.168.2","C1.1.221P","C1.1.222P","C1.1.223P","C1.1.224P","C1.1.225P","C1.1.226P","C1.1.227P","C1.1.228P","C1.1.229P","C1.1.230P","C1.1.231P","C1.1.232P","C1.1.233P","C1.1.234P","C1.1.235P","C1.1.238K","C1.1.239K","C1.1.240K","C1.1.241K","C1.1.242K","C1.1.244K","C1.1.245K","C1.1.246","C1.1.248","C1.1.250","C1.1.251L","C1.1.252L","C1.1.253L","C1.1.254L","C1.1.255P","C1.1.256P","C1.1.260P","C1.1.261","C1.1.262","C1.1.263","C1.1.264","C1.1.265","C1.1.266","C1.1.267","C1.1.268","C1.1.269","C1.1.270","C1.1.271","C1.1.272","C1.1.273","C1.1.318K","C1.1.320","C1.1.321","C1.1.322","C1.1.323","C1.1.324L","C1.1.325","C1.1.326L","C1.1.327","C1.1.328L","C1.1.329","C1.1.330","C1.1.332","C1.1.333","C1.1.334L","C1.1.335","C1.1.336","C1.1.337","C1.1.338","C1.1.341P","C1.1.342P","C1.1.343P","C1.1.344P","C1.1.346P","C1.1.347P","C1.1.348K","C1.1.349P","C1.1.350P","C1.1.352K","C1.1.353P","C1.1.354K","C1.1.355P","C1.1.357K","C1.1.358K","C1.1.360K","C1.1.361K","C1.1.365P","C1.1.366P","C1.1.BG","C1.2.121K","C1.2.122K","C1.2.123K","C1.2.124K","C1.2.129","C1.2.133","C1.2.135","C1.2.136","C1.2.137P","C1.2.138L","C1.2.139","C1.2.221P","C1.2.222P","C1.2.223K","C1.2.224P","C1.2.225P","C1.2.226P","C1.2.227P","C1.2.228P","C1.2.229P","C1.2.230P","C1.2.231K","C1.2.232P","C1.2.233L","C1.2.234K","C1.2.237L","C1.2.239K","C1.2.240K","C1.2.241K","C1.2.242K","C1.2.243K","C1.2.245","C1.2.246","C1.2.248L","C1.2.249L","C1.2.250L","C1.2.251L","C1.2.252K","C1.2.254","C1.2.255","C1.2.319","C1.2.320","C1.2.321","C1.2.323","C1.2.324","C1.2.325","C1.2.326","C1.2.327","C1.2.328","C1.2.329","C1.2.330","C1.2.331","C1.2.332","C1.2.334","C1.2.335","C1.2.336","C1.2.337","C1.2.338","C1.2.339","C1.2.340","C1.2.344","C1.2.346","C1.2.352","C1.2.354","C1.2.358","C1.2.359","C1.2.360","C1.2.362","C1.2.363","C1.2.364","C1.2.365","C1.2.366","C1.2.367","C1.2.368","C1.2.369","C1.2.370","C1.2.371","C1.2.374","C1.2.375","C1.2.376","C1.2.GARDEROB","C1.2.UNKNOWN","C1.2.UNKNOWN-2","C1.3.121","C1.3.125","C1.3.126","C1.3.128","C1.3.129","C1.3.130","C1.3.168","C1.3.187","C1.3.188","C1.3.221K","C1.3.222P","C1.3.223P","C1.3.224P","C1.3.225P","C1.3.226P","C1.3.227P","C1.3.228K","C1.3.229P","C1.3.230P","C1.3.231P","C1.3.232P","C1.3.233P","C1.3.234K","C1.3.235L","C1.3.236P","C1.3.237P","C1.3.240P","C1.3.241P","C1.3.243P","C1.3.244P","C1.3.246","C1.3.247P","C1.3.248P","C1.3.249K","C1.3.250K","C1.3.251K","C1.3.252K","C1.3.253K","C1.3.254L","C1.3.255L","C1.3.257P","C1.3.258P","C1.3.259P","C1.3.260P","C1.3.261P","C1.3.262P","C1.3.263P","C1.3.264L","C1.3.266P","C1.3.267P","C1.3.318P","C1.3.319P","C1.3.321P","C1.3.322P","C1.3.323K","C1.3.324K","C1.3.327K","C1.3.328","C1.3.331P","C1.3.337","C1.3.338","C1.3.339","C1.3.340","C1.3.341","C1.3.342","C1.3.343","C1.3.344","C1.3.345","C1.3.346","C1.3.352","C1.3.353","C1.3.354","C1.3.355","C1.3.356","C1.3.357P","C1.3.358P","C1.3.359P","C1.3.360K","C1.3.361","C1.3.362P","C1.3.365L","C1.3.366L","C1.3.367K","C1.3.370L","C1.3.DININGHALL"];
  const getRooms = () => roomCatalogue;
  const findRoom = value => {
    const wanted = normalise(value), base = baseRoom(wanted);
    return [...document.querySelectorAll('[data-name]')].find(el =>
      el.dataset.name.split('|').map(normalise).some(name => name === wanted || baseRoom(name) === base)
    );
  };
  const selectRoom = value => {
    const match = findRoom(value);
    document.querySelectorAll('[data-name]').forEach(el => el.classList.remove('room-map-group-search-target'));
    if (!match) { input.setAttribute('aria-invalid', 'true'); directoryStatus.textContent = `Cabinet ${value} was not found on this plan.`; return false; }
    input.removeAttribute('aria-invalid');
    match.classList.add('room-map-group-search-target');
    const canonical = normalise(match.dataset.name.split('|')[0]);
    if (normalise(input.value) !== canonical) input.value = canonical;
    const [, block, floor] = canonical.match(/^C1\.([123])\.([123])/);
    if (select.value !== `C1.${block}`) { select.value = `C1.${block}`; select.dispatchEvent(new Event('change', {bubbles:true})); }
    const floorButton = [...floorNav.querySelectorAll('button')].find(b => b.textContent.trim() === floor);
    if (floorButton && !floorButton.classList.contains('active')) floorButton.click();
    requestAnimationFrame(() => { fitMap(); match.scrollIntoView?.({block:'center', inline:'center'}); });
    directoryStatus.textContent = `${canonical} highlighted on the plan.`;
    return true;
  };

  const toolbar = document.querySelector('.aitu-toolbar');
  const tools = document.createElement('div');
  tools.className = 'map-utility';
  tools.innerHTML = `
    <button type="button" data-action="zoom-out" aria-label="Zoom out">−</button>
    <button type="button" data-action="reset" aria-label="Fit map to screen">↺</button>
    <button type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
    <button type="button" data-action="fullscreen" class="fullscreen-button" aria-label="Open full map">⛶ <span>Full map</span></button>`;
  toolbar.append(tools);

  const directory = document.createElement('aside');
  directory.className = 'map-directory';
  directory.innerHTML = `<div class="directory-head"><strong>Rooms on this floor</strong><button type="button" class="directory-toggle" aria-expanded="false">Show list</button></div><p id="directoryStatus" class="directory-status" aria-live="polite">Search any room number - suffixes such as L, P and K are optional.</p><div class="room-list" hidden></div>`;
  shell.append(directory);
  const directoryStatus = directory.querySelector('#directoryStatus');
  const roomList = directory.querySelector('.room-list');
  const listButton = directory.querySelector('.directory-toggle');
  const updateDirectory = () => {
    const prefix = `${select.value}.${[...floorNav.querySelectorAll('button')].find(b => b.classList.contains('active'))?.textContent.trim() || '1'}`;
    const rooms = [...new Set(getRooms().filter(r => r.startsWith(prefix)))].sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
    roomList.innerHTML = rooms.length ? rooms.map(room => `<button type="button" data-room="${room}">${room.replace(/^C1\.[123]\./,'')}</button>`).join('') : '<span>No labelled rooms on this floor.</span>';
  };
  listButton.onclick = () => { const open = roomList.hidden; roomList.hidden = !open; listButton.setAttribute('aria-expanded', String(open)); listButton.textContent = open ? 'Hide list' : 'Show list'; };
  roomList.onclick = e => { const room = e.target.dataset.room; if (room) selectRoom(room); };

  let scale = 1, x = 0, y = 0, drag = null;
  const svg = () => document.querySelector('.aitu-plan-svg');
  const applyTransform = () => { const el = svg(); if (el) el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; };
  const fitMap = () => { scale = 1; x = 0; y = 0; applyTransform(); };
  const zoom = delta => { scale = Math.max(0.7, Math.min(3.2, +(scale + delta).toFixed(2))); applyTransform(); };
  tools.onclick = e => { const action = e.target.closest('button')?.dataset.action; if (action === 'zoom-in') zoom(.2); if (action === 'zoom-out') zoom(-.2); if (action === 'reset') fitMap(); if (action === 'fullscreen') { const target = document.fullscreenElement ? document.exitFullscreen() : shell.requestFullscreen?.(); Promise.resolve(target).catch(()=>window.open(location.href, '_blank', 'noopener')); } };
  stage.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? -.15 : .15); }, {passive:false});
  stage.addEventListener('pointerdown', e => { if (scale <= 1 || e.target.closest('.aitu-toolbar,.map-directory')) return; drag = {x:e.clientX, y:e.clientY, px:x, py:y}; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => { if (!drag) return; x = drag.px + e.clientX - drag.x; y = drag.py + e.clientY - drag.y; applyTransform(); });
  stage.addEventListener('pointerup', () => drag = null);
  stage.addEventListener('click', e => { const room = e.target.closest('[data-name]'); if (room) selectRoom(room.dataset.name.split('|')[0]); });
  stage.addEventListener('keydown', e => { if (e.key === '+' || e.key === '=') zoom(.2); if (e.key === '-') zoom(-.2); if (e.key === '0') fitMap(); });
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', 'Campus floor plan. Use plus and minus to zoom; drag the map when zoomed.');

  input.addEventListener('input', () => { if (input.value.length >= 7) selectRoom(input.value); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); selectRoom(input.value); } });
  [select, floorNav].forEach(el => el.addEventListener('click', () => setTimeout(updateDirectory, 0)));
  select.addEventListener('change', () => setTimeout(updateDirectory, 0));
  new MutationObserver(() => { updateDirectory(); if (input.value) selectRoom(input.value); }).observe(stage, {childList:true, subtree:true});
  setTimeout(() => { updateDirectory(); if (input.value) selectRoom(input.value); }, 80);
})();
