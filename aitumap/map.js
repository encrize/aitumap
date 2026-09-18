(() => {
  'use strict';
  const $=(selector,root=document)=>root.querySelector(selector), $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const elements={plans:$('#plans'),canvas:$('#canvas'),layer:$('#transformLayer'),input:$('#roomSearch'),suggestions:$('#suggestions'),clear:$('#clearSearch'),zoom:$('#zoomValue'),statusTitle:$('#statusTitle'),statusText:$('#statusText')};
  const planData=window.MAP_PLANS||{}, roomData=window.ROOM_INDEX||[];
  const normalize=value=>String(value||'').trim().toUpperCase().replace(/\s+/g,'').replace(/,/g,'.');
  const rooms=roomData.map(room=>({...room,_name:normalize(room.name),_aliases:room.aliases.map(normalize)}));
  const state={block:'all',floor:'1',query:'',selected:'',scale:1,x:0,y:0,drag:null};

  function roomParts(room){const match=normalize(room).match(/^C1\.([123])\.([123])/);return match?{block:`C1.${match[1]}`,floor:match[2]}:null;}
  function setPressed(){
    $$('.seg-btn').forEach(button=>{const on=button.dataset.block===state.block;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});
    $$('.floor-btn').forEach(button=>{const on=button.dataset.floor===state.floor;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});
  }
  function createPlan(block){
    const article=document.createElement('article'); article.className='plan-card';
    const label=document.createElement('span'); label.className='plan-label'; label.textContent=`${block} · ${state.floor} этаж`;
    const host=document.createElement('div'); host.className='plan-host'; host.dataset.plan=`${block}-${state.floor}`; host.innerHTML=planData[`${block}-${state.floor}`]||'<p>План недоступен</p>';
    article.append(label,host); return article;
  }
  function renderPlans(){
    const blocks=state.block==='all'?['C1.1','C1.2','C1.3']:[state.block];
    elements.plans.className=`plans ${state.block==='all'?'full':'single'}`;
    elements.canvas.classList.toggle('full-mode',state.block==='all'&&matchMedia('(max-width: 820px)').matches);
    elements.plans.replaceChildren(...blocks.map(createPlan));
    $$('.plan-host svg').forEach(svg=>{svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('preserveAspectRatio','xMidYMid meet');neutralizeBlack(svg);});
    $$('.plan-host [data-name]').forEach(room=>{const canonical=room.dataset.room||room.getAttribute('data-name').split('|')[0];room.tabIndex=0;room.setAttribute('role','button');room.setAttribute('aria-label',`Кабинет ${canonical}`);});
    setPressed(); highlight(); resetTransform(); updateStatus();
  }
  function neutralizeBlack(svg){
    svg.querySelectorAll('path,polygon,polyline,rect,line,circle,ellipse').forEach(shape=>{
      const fill=getComputedStyle(shape).fill.replace(/\s/g,'');
      if(fill==='rgb(0,0,0)'||fill==='#000'||fill==='#000000'){
        shape.style.setProperty('fill','#62676b','important');
        shape.style.setProperty('stroke','#858b90','important');
      }
    });
  }
  function highlight(){
    const target=normalize(state.selected||state.query);
    $$('.room-map-group-search-target').forEach(room=>room.classList.remove('room-map-group-search-target'));
    if(!target)return;
    $$('.plan-host [data-name]').forEach(room=>{const aliases=(room.getAttribute('data-name')||'').split('|').map(normalize);if(aliases.some(alias=>alias===target||alias.endsWith(`.${target}`)))room.classList.add('room-map-group-search-target');});
  }
  function chooseRoom(room,move=true){
    const canonical=normalize(room),parts=roomParts(canonical);if(!parts)return;
    state.selected=canonical;state.query=canonical;elements.input.value=canonical;elements.clear.style.display='block';closeSuggestions();
    if(move){state.block=parts.block;state.floor=parts.floor;renderPlans();}else{highlight();updateStatus();}
    const url=new URL(location.href);url.searchParams.set('room',canonical);history.replaceState(null,'',url);
  }
  function resultsFor(query){
    const value=normalize(query);if(!value)return[];
    return rooms.filter(room=>room._name.includes(value)||room._aliases.some(alias=>alias.includes(value))).sort((a,b)=>(a._name===value?-1:0)-(b._name===value?-1:0)||a._name.localeCompare(b._name,undefined,{numeric:true})).slice(0,10);
  }
  function showSuggestions(){
    const value=elements.input.value.trim();if(!value){closeSuggestions();return;}
    const found=resultsFor(value);
    elements.suggestions.replaceChildren(...(found.length?found.map((room,index)=>{const button=document.createElement('button');button.type='button';button.className=`suggestion${index===0?' active':''}`;button.setAttribute('role','option');button.dataset.room=room.name;button.innerHTML=`<strong>${room.name}</strong><span>${room.block} · ${room.floor} этаж</span>`;return button;}):[Object.assign(document.createElement('div'),{className:'suggestion',innerHTML:'<strong>Кабинет не найден</strong><span>Проверьте номер</span>'})]));
    elements.suggestions.classList.add('open');
  }
  function closeSuggestions(){elements.suggestions.classList.remove('open');}
  function updateStatus(){
    const count=rooms.filter(room=>room.floor===state.floor&&(state.block==='all'||room.block===state.block)).length;
    elements.statusTitle.textContent=state.selected?state.selected:`${state.block==='all'?'Все корпуса':state.block} · ${state.floor} этаж`;
    elements.statusText.textContent=state.selected?`${state.block} · ${state.floor} этаж · кабинет выделен`:`${count} кабинетов на плане`;
  }
  function applyTransform(){if(elements.canvas.classList.contains('full-mode'))return;elements.layer.style.transform=`translate3d(${state.x}px,${state.y}px,0) scale(${state.scale})`;elements.zoom.textContent=`${Math.round(state.scale*100)}%`;}
  function resetTransform(){state.scale=1;state.x=0;state.y=0;elements.layer.style.transform='';elements.zoom.textContent='100%';}
  function zoom(delta,clientX=elements.canvas.clientWidth/2,clientY=elements.canvas.clientHeight/2){
    if(elements.canvas.classList.contains('full-mode'))return;
    const old=state.scale,next=Math.min(3.4,Math.max(.7,+(old+delta).toFixed(2)));if(next===old)return;
    const rect=elements.canvas.getBoundingClientRect(),px=clientX-rect.left-rect.width/2,py=clientY-rect.top-rect.height/2,ratio=next/old-1;
    state.x-=(px-state.x)*ratio;state.y-=(py-state.y)*ratio;state.scale=next;applyTransform();
  }

  $('#modePanel').addEventListener('click',event=>{const button=event.target.closest('[data-block]');if(!button)return;state.block=button.dataset.block;state.selected='';renderPlans();});
  $('#floorPanel').addEventListener('click',event=>{const button=event.target.closest('[data-floor]');if(!button)return;state.floor=button.dataset.floor;state.selected='';renderPlans();});
  elements.plans.addEventListener('click',event=>{const room=event.target.closest('[data-name]');if(room)chooseRoom(room.dataset.room||room.getAttribute('data-name').split('|')[0],false);});
  elements.plans.addEventListener('keydown',event=>{if(event.key!=='Enter'&&event.key!==' ')return;const room=event.target.closest('[data-name]');if(room){event.preventDefault();chooseRoom(room.dataset.room||room.getAttribute('data-name').split('|')[0],false);}});
  elements.input.addEventListener('input',()=>{state.query=normalize(elements.input.value);state.selected='';elements.clear.style.display=elements.input.value?'block':'none';showSuggestions();highlight();});
  elements.input.addEventListener('keydown',event=>{const options=$$('.suggestion[data-room]',elements.suggestions);let index=options.findIndex(item=>item.classList.contains('active'));if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();options[index]?.classList.remove('active');index=event.key==='ArrowDown'?Math.min(options.length-1,index+1):Math.max(0,index-1);options[index]?.classList.add('active');options[index]?.scrollIntoView({block:'nearest'});}if(event.key==='Enter'&&options[index]){event.preventDefault();chooseRoom(options[index].dataset.room);}if(event.key==='Escape')closeSuggestions();});
  elements.suggestions.addEventListener('click',event=>{const button=event.target.closest('[data-room]');if(button)chooseRoom(button.dataset.room);});
  elements.clear.addEventListener('click',()=>{elements.input.value='';state.query='';state.selected='';elements.clear.style.display='none';closeSuggestions();highlight();updateStatus();elements.input.focus();});
  document.addEventListener('click',event=>{if(!event.target.closest('.search-wrap'))closeSuggestions();});
  $('#zoomIn').addEventListener('click',()=>zoom(.2));$('#zoomOut').addEventListener('click',()=>zoom(-.2));$('#resetView').addEventListener('click',resetTransform);
  elements.canvas.addEventListener('wheel',event=>{if(elements.canvas.classList.contains('full-mode'))return;event.preventDefault();zoom(event.deltaY<0?.14:-.14,event.clientX,event.clientY);},{passive:false});
  elements.canvas.addEventListener('pointerdown',event=>{if(event.target.closest('button,input,[data-name]')||elements.canvas.classList.contains('full-mode'))return;state.drag={x:event.clientX,y:event.clientY,originX:state.x,originY:state.y};elements.canvas.classList.add('dragging');elements.canvas.setPointerCapture(event.pointerId);});
  elements.canvas.addEventListener('pointermove',event=>{if(!state.drag)return;state.x=state.drag.originX+event.clientX-state.drag.x;state.y=state.drag.originY+event.clientY-state.drag.y;applyTransform();});
  const stopDrag=()=>{state.drag=null;elements.canvas.classList.remove('dragging');};elements.canvas.addEventListener('pointerup',stopDrag);elements.canvas.addEventListener('pointercancel',stopDrag);
  document.addEventListener('keydown',event=>{if(event.target.matches('input'))return;if(event.key==='+'||event.key==='=')zoom(.2);if(event.key==='-')zoom(-.2);if(event.key==='0')resetTransform();});
  let mobile=matchMedia('(max-width: 820px)').matches;addEventListener('resize',()=>{const next=matchMedia('(max-width: 820px)').matches;if(next!==mobile){mobile=next;renderPlans();}});
  const initial=new URLSearchParams(location.search).get('room');if(initial){const parts=roomParts(initial);if(parts){state.block=parts.block;state.floor=parts.floor;state.selected=normalize(initial);state.query=state.selected;elements.input.value=state.selected;elements.clear.style.display='block';}}
  renderPlans();
})();
