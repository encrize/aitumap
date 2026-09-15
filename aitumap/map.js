(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const state = { block: 'all', floor: '1', query: '', selected: '', scale: 1, x: 0, y: 0, dragging: false, px: 0, py: 0 };
  const plansEl = $('#plans'), canvas = $('#canvas'), layer = $('#transformLayer'), input = $('#roomSearch'), suggestions = $('#suggestions');
  const planData = window.MAP_PLANS || {}, rooms = window.ROOM_INDEX || [];
  const normalize = v => v.trim().toUpperCase().replace(/\s+/g, '').replace(/,/g, '.');
  const roomParts = room => { const m = normalize(room).match(/^C1\.([123])\.([123])/); return m ? { block: `C1.${m[1]}`, floor: m[2] } : null; };
  const setPressed = () => { $$('.seg-btn').forEach(b => { const on = b.dataset.block === state.block; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); }); $$('.floor-btn').forEach(b => { const on = b.dataset.floor === state.floor; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); }); };
  function renderPlans() {
    const blocks = state.block === 'all' ? ['C1.1','C1.2','C1.3'] : [state.block];
    plansEl.className = `plans ${state.block === 'all' ? 'full' : 'single'}`;
    canvas.classList.toggle('full-mode', state.block === 'all' && innerWidth <= 800);
    plansEl.innerHTML = blocks.map(block => `<article class="plan-card"><span class="plan-label">${block} · ${state.floor} этаж</span><div class="plan-host" data-plan="${block}-${state.floor}">${planData[`${block}-${state.floor}`] || '<p>План недоступен</p>'}</div></article>`).join('');
    $$('.plan-host svg').forEach(svg => { svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('preserveAspectRatio','xMidYMid meet'); neutralizeBlackAreas(svg); });
    $$('.plan-host [data-name]').forEach(el => { el.setAttribute('tabindex','0'); el.setAttribute('role','button'); const room = el.dataset.room || el.getAttribute('data-name').split('|')[0]; el.setAttribute('aria-label',`Кабинет ${room}`); el.addEventListener('click', e => { e.stopPropagation(); chooseRoom(room, false); }); el.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseRoom(room,false);} }); });
    setPressed(); highlight(); resetTransform(); updateStatus();
  }
  function neutralizeBlackAreas(svg) {
    const geometry = svg.querySelectorAll('path,polygon,polyline,rect,line,circle,ellipse');
    geometry.forEach(el => {
      const style = getComputedStyle(el);
      const fill = style.fill.replace(/\s/g, '');
      if (fill === 'rgb(0,0,0)' || fill === '#000000' || fill === '#000') {
        el.style.setProperty('fill', '#5b6066', 'important');
        el.style.setProperty('stroke', '#7f878f', 'important');
      }
    });
  }
  function highlight() {
    const target = normalize(state.selected || state.query);
    $$('.room-map-group-search-target').forEach(el => el.classList.remove('room-map-group-search-target'));
    if (!target) return;
    $$('.plan-host [data-name]').forEach(el => { const aliases=(el.getAttribute('data-name')||'').split('|').map(normalize); if (aliases.some(a => a === target || a.endsWith('.'+target))) el.classList.add('room-map-group-search-target'); });
  }
  function chooseRoom(room, move = true) {
    const canonical = normalize(room), parts = roomParts(canonical); if(!parts) return;
    state.selected = canonical; state.query = canonical; input.value = canonical; $('#clearSearch').style.display='block'; closeSuggestions();
    if(move){ state.block=parts.block; state.floor=parts.floor; renderPlans(); } else { highlight(); updateStatus(); }
    const card=$('#mobileRoomCard'); card.innerHTML=`<span><strong>${canonical}</strong><br><span>${parts.block} · ${parts.floor} этаж</span></span><button class="icon-btn" type="button" aria-label="Закрыть">×</button>`; card.classList.add('show'); $('button',card).onclick=()=>card.classList.remove('show');
    const url=new URL(location.href); url.searchParams.set('room',canonical); history.replaceState(null,'',url);
  }
  function resultsFor(q) {
    const n=normalize(q); if(!n) return [];
    return rooms.filter(r => r.name.includes(n) || r.aliases.some(a => normalize(a).includes(n))).sort((a,b) => (a.name===n?-2:0)-(b.name===n?-2:0) || a.name.localeCompare(b.name)).slice(0,12);
  }
  function showSuggestions() {
    const found=resultsFor(input.value); if(!input.value.trim()){ closeSuggestions(); return; }
    suggestions.innerHTML=found.length?found.map((r,i)=>`<button class="suggestion${i===0?' active':''}" type="button" role="option" data-room="${r.name}"><strong>${r.name}</strong><span>${r.block} · ${r.floor} этаж</span></button>`).join(''):`<div class="suggestion"><strong>Кабинет не найден</strong><span>Проверьте номер</span></div>`;
    suggestions.classList.add('open'); $$('.suggestion[data-room]',suggestions).forEach(b=>b.onclick=()=>chooseRoom(b.dataset.room));
  }
  function closeSuggestions(){ suggestions.classList.remove('open'); }
  function updateStatus(){ const floorWord=`${state.floor} этаж`; const found=rooms.filter(r=>r.floor===state.floor&&(state.block==='all'||r.block===state.block)).length; $('#statusTitle').textContent=state.selected?state.selected:`${state.block==='all'?'Весь этаж':state.block} · ${floorWord}`; $('#statusText').textContent=state.selected?`${state.block} · ${floorWord} · кабинет выделен`:`${found} кабинетов на плане`; }
  function applyTransform(){ if(canvas.classList.contains('full-mode')) return; layer.style.transform=`translate(${state.x}px,${state.y}px) scale(${state.scale})`; $('#zoomValue').textContent=`${Math.round(state.scale*100)}%`; }
  function resetTransform(){ state.scale=1; state.x=0; state.y=0; layer.style.transform=''; $('#zoomValue').textContent='100%'; }
  function zoom(delta,cx=canvas.clientWidth/2,cy=canvas.clientHeight/2){ if(canvas.classList.contains('full-mode')) return; const old=state.scale, next=Math.min(3.5,Math.max(.65,old+delta)); const rect=canvas.getBoundingClientRect(), px=cx-rect.left-rect.width/2, py=cy-rect.top-rect.height/2; state.x-=(px-state.x)*(next/old-1); state.y-=(py-state.y)*(next/old-1); state.scale=next; applyTransform(); }
  $$('.seg-btn').forEach(b=>b.onclick=()=>{state.block=b.dataset.block;state.selected='';renderPlans();});
  $$('.floor-btn').forEach(b=>b.onclick=()=>{state.floor=b.dataset.floor;state.selected='';renderPlans();});
  input.addEventListener('input',()=>{state.query=normalize(input.value);state.selected='';$('#clearSearch').style.display=input.value?'block':'none';showSuggestions();highlight();});
  input.addEventListener('keydown',e=>{const opts=$$('.suggestion[data-room]',suggestions);let i=opts.findIndex(x=>x.classList.contains('active'));if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();opts[i]?.classList.remove('active');i=e.key==='ArrowDown'?Math.min(opts.length-1,i+1):Math.max(0,i-1);opts[i]?.classList.add('active');opts[i]?.scrollIntoView({block:'nearest'});}if(e.key==='Enter'&&opts[i]){e.preventDefault();chooseRoom(opts[i].dataset.room);}if(e.key==='Escape')closeSuggestions();});
  $('#clearSearch').onclick=()=>{input.value='';state.query='';state.selected='';$('#clearSearch').style.display='none';closeSuggestions();highlight();updateStatus();input.focus();};
  document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))closeSuggestions();});
  $('#zoomIn').onclick=()=>zoom(.2); $('#zoomOut').onclick=()=>zoom(-.2); $('#resetView').onclick=resetTransform;
  canvas.addEventListener('wheel',e=>{if(canvas.classList.contains('full-mode'))return;e.preventDefault();zoom(e.deltaY<0?.14:-.14,e.clientX,e.clientY);},{passive:false});
  canvas.addEventListener('pointerdown',e=>{if(e.target.closest('button,input')||canvas.classList.contains('full-mode'))return;state.dragging=true;state.px=e.clientX;state.py=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!state.dragging)return;state.x+=e.clientX-state.px;state.y+=e.clientY-state.py;state.px=e.clientX;state.py=e.clientY;applyTransform();});
  const stopDrag=()=>{state.dragging=false;canvas.classList.remove('dragging');}; canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);
  addEventListener('resize',()=>setTimeout(renderPlans,80));
  document.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(e.key==='+'||e.key==='=')zoom(.2);if(e.key==='-')zoom(-.2);if(e.key==='0')resetTransform();});
  const initial=new URLSearchParams(location.search).get('room'); if(initial){const p=roomParts(initial);if(p){state.block=p.block;state.floor=p.floor;state.selected=normalize(initial);state.query=state.selected;input.value=state.selected;$('#clearSearch').style.display='block';}}
  renderPlans();
})();
