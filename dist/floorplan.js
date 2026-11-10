const svgNS='http://www.w3.org/2000/svg';
const drawing=`
  <g class="plan-furniture">
    <!-- Sala e jantar -->
    <rect x="-6.03" y=".15" width="3.64" height="1.16" rx=".12"/>
    <path d="M-5.77 .15v1.16m1.09-1.16v1.16m1.09-1.16v1.16m.96-1.16v1.16M-5.77 .42h3.14"/>
    <rect x="-4.92" y="1.61" width="1.72" height=".75" rx=".08"/>
    <rect x="-2.52" y="1.79" width="1" height="1.08" rx=".12"/>
    <rect x="-6.1" y="3.03" width="2.6" height=".4"/>
    <rect x="2.32" y="1.31" width="2.65" height="1.24" rx=".1"/>
    <path d="M2.62 .58h.61v.68h-.61zm1.4 0h.61v.68h-.61zm-1.4 2.02h.61v.69h-.61zm1.4 0h.61v.69h-.61z"/>
    <!-- Cozinha -->
    <rect x="1.22" y="-4.98" width="5.57" height=".78"/>
    <path d="M2.5-4.98v.78m1.25-.78v.78m1.25-.78v.78"/>
    <rect x="1.95" y="-4.75" width=".64" height=".39" rx=".07"/>
    <rect x="2.85" y="-2.4" width="2.66" height="1.06" rx=".045"/>
    <rect x="4.03" y="-2.2" width=".85" height=".61" rx=".06"/>
    <circle cx="4.25" cy="-2.02" r=".08"/><circle cx="4.65" cy="-2.02" r=".08"/>
    <circle cx="4.25" cy="-1.76" r=".08"/><circle cx="4.65" cy="-1.76" r=".08"/>
    <circle cx="3.35" cy="-.92" r=".22"/><circle cx="4.25" cy="-.92" r=".22"/><circle cx="5.12" cy="-.92" r=".22"/>
    <!-- Suíte -->
    <rect x="-5.56" y="-4.72" width="2.22" height="2.62" rx=".08"/>
    <path d="M-5.56-3.8h2.22"/>
    <rect x="-5.35" y="-4.54" width=".76" height=".58" rx=".11"/><rect x="-4.31" y="-4.54" width=".76" height=".58" rx=".11"/>
    <rect x="-6.36" y="-4.57" width=".62" height=".59"/><rect x="-3.16" y="-4.57" width=".62" height=".59"/>
    <rect x="-6.88" y="-2.42" width=".52" height="1.8"/>
    <rect x="-5.21" y="-1.52" width="1.66" height=".48" rx=".06"/>
    <!-- Banheiro -->
    <rect x="-1.59" y="-4.89" width="1.37" height="1.47" rx=".05"/>
    <path d="M-1.59-4.89l1.37 1.47m-1.37 0l1.37-1.47" class="plan-fine"/>
    <ellipse cx=".48" cy="-4.43" rx=".24" ry=".36"/>
    <rect x=".27" y="-3.12" width=".67" height="1.06"/><ellipse cx=".64" cy="-2.6" rx=".21" ry=".32"/>
    <!-- Varanda -->
    <rect x="-3.67" y="4.33" width=".62" height=".65" rx=".07"/><rect x="-1.73" y="4.33" width=".62" height=".65" rx=".07"/>
    <circle cx="-2.41" cy="4.66" r=".35"/>
    <rect x="1.35" y="4.4" width="2.76" height=".69" rx=".06"/>
    <circle cx="-6.2" cy="5.19" r=".26"/><circle cx="6.18" cy="5.19" r=".26"/><circle cx="4.94" cy="5.19" r=".26"/>
  </g>
  <path class="plan-walls" d="M-7 3.5V-5h.36m1.24 0h3.87m1.24 0h3.27m1.12 0h1.51m1.12 0H7v8.5M-7 0h4.07m1.02 0h.11v-5M1-5v3.65H.52m-1.59 0h-.73"/>
  <path class="plan-glass" d="M-6.64-5h1.24m3.87 0h1.24m3.27 0H4.1m1.51 0h1.12M-7 3.5h4.8m2.2 0h7M-7 3.5v2.42H7V3.5"/>
  <path class="plan-doors" d="M-2.93 0v-1.02a1.02 1.02 0 0 1 1.02 1.02M.52-1.35v-1.59a1.59 1.59 0 0 0-1.59 1.59"/>
`;
const labelPositions=[[-.16,2.58],[4.45,-3.34],[-4.41,-1.82],[-.44,-1.86],[.35,5.45]];

function element(tag,attributes={}){
  const node=document.createElementNS(svgNS,tag);
  for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);
  return node;
}

export function makeFloorPlan(container,rooms,onSelect){
  const svg=element('svg',{viewBox:'-7.45 -5.45 14.9 11.8',class:'architectural-plan',role:'group','aria-label':'Planta baixa interativa'});
  const geometry=element('g');
  const controls=rooms.map(({name,box:[x,y,width,height]},index)=>{
    const room=element('rect',{x,y,width,height,class:'plan-area',tabindex:0,role:'button','aria-label':name});
    room.addEventListener('click',()=>onSelect(index));
    room.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      event.preventDefault();onSelect(index);
    });
    geometry.append(room);
    return room;
  });
  const lines=element('g',{'aria-hidden':'true',class:'plan-lines'});
  lines.innerHTML=drawing;
  geometry.append(lines);
  svg.append(geometry);
  const labels=rooms.map(({name},i)=>{
    const label=element('text',{y:labelPositions[i][1],class:'plan-label','aria-hidden':'true'});
    label.textContent=name;
    svg.append(label);
    return label;
  });
  container.append(svg);
  return {
    orient(flip){
      geometry.setAttribute('transform',`scale(${flip} 1)`);
      labels.forEach((label,index)=>label.setAttribute('x',labelPositions[index][0]*flip));
    },
    select(index){
      controls.forEach((room,i)=>room.setAttribute('aria-pressed',i===index));
      labels.forEach((label,i)=>label.classList.toggle('selected',i===index));
    }
  };
}
