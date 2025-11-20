// 移动网络兼容：多 CDN + 本地回退加载 three / OrbitControls / d3（中文注释）
async function loadLibs(){
  const tryImport = async (urls)=>{ for(const u of urls){ try{ return await import(u); }catch(e){} } return null; };
  const THREE_mod = await tryImport([
    'https://esm.sh/three@0.160.0',
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    './vendor/three.module.js'
  ]);
  const Orbit_mod = await tryImport([
    'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js',
    'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js?module',
    './vendor/OrbitControls.js'
  ]);
  let d3_mod = await tryImport([
    'https://cdn.jsdelivr.net/npm/d3@7/+esm',
    'https://unpkg.com/d3@7?module'
  ]);
  if(!d3_mod){
    await new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src='./vendor/d3.min.js'; s.onload=resolve; s.onerror=reject; document.head.appendChild(s); });
    d3_mod = window.d3;
  }
  if(!THREE_mod || !Orbit_mod || !d3_mod) throw new Error('Lib load failed');
  return { THREE: THREE_mod, OrbitControls: (Orbit_mod.OrbitControls||Orbit_mod.default||Orbit_mod), d3: d3_mod };
}
const { THREE, OrbitControls, d3 } = await loadLibs();

const symbols=[null,"H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca","Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn","Ga","Ge","As","Se","Br","Kr","Rb","Sr","Y","Zr","Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn","Sb","Te","I","Xe","Cs","Ba","La","Ce","Pr","Nd","Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu","Hf","Ta","W","Re","Os","Ir","Pt","Au","Hg","Tl","Pb","Bi","Po","At","Rn","Fr","Ra","Ac","Th","Pa","U","Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds","Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og"];
const periodSeq={1:[1,18],2:[1,2,13,14,15,16,17,18],3:[1,2,13,14,15,16,17,18],4:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],5:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],6:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],7:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18]};
function zToPeriod(z){if(z<=2)return 1;if(z<=10)return 2;if(z<=18)return 3;if(z<=36)return 4;if(z<=54)return 5;if(z<=86)return 6;return 7}
function zToGroup(z){const p=zToPeriod(z);if(p===1)return periodSeq[1][z-1];if(p===2)return periodSeq[2][z-3];if(p===3)return periodSeq[3][z-11];if(p===4)return periodSeq[4][z-19];if(p===5)return periodSeq[5][z-37];if(p===6){if(z>=57&&z<=71)return(z-57)+3;const seq=periodSeq[6];if(z<=56)return seq[z-55];return seq[(z-72)+3]}if(p===7){if(z>=89&&z<=103)return(z-89)+3;const seq=periodSeq[7];if(z<=88)return seq[z-87];return seq[(z-104)+3]}}

const ptableEl=document.getElementById('ptable');
let ptableCells=[]; let selectedElements=[]; let multiSelect=false; let elementQueue=[]; let demoLockedHighlight=false;
document.getElementById('multiToggle')?.addEventListener('change',e=>{ multiSelect = !!e.target.checked; if(!multiSelect){ selectedElements=[]; updateSelectionVisual(); }});
function setGridRows(){ const w = window.innerWidth; const px = w<=480 ? 42 : (w<=720 ? 44 : (w<=900 ? 46 : 50)); ptableEl.style.gridTemplateRows = `repeat(9,${px}px)`; }
setGridRows();
window.addEventListener('resize', setGridRows);
for(let z=1;z<=118;z++){
  const cell=document.createElement('div');
  const period=zToPeriod(z); const group=zToGroup(z);
  cell.className='cell';
  cell.style.gridColumn=group;
  cell.style.gridRow=(period===6&&z>=57&&z<=71)?8:(period===7&&z>=89&&z<=103)?9:period;
  if(period===6&&z>=57&&z<=71) cell.classList.add('lanth');
  if(period===7&&z>=89&&z<=103) cell.classList.add('actin');
  cell.dataset.z = String(z);
  cell.dataset.symbol = symbols[z];
  cell.innerHTML = `<div class="num">${z}</div><div class="sym">${symbols[z]}</div>`;
  // 可访问性增强：为元素格子添加ARIA与键盘支持（中文注释说明用途）
  cell.setAttribute('role','button');
  cell.setAttribute('aria-selected','false');
  cell.setAttribute('aria-label', `${symbols[z]}（原子序数 ${z}）`);
  cell.tabIndex = 0;
  cell.addEventListener('keydown',(ev)=>{ if(ev.key==='Enter' || ev.key===' '){ ev.preventDefault(); onPeriodicCellClick(z, cell); }});
  // 分区判定与着色：s/p/d/ds/f
  function zoneFor(z){
    const g = zToGroup(z);
    if(z===1 || z===2) return 's';
    if(z>=57 && z<=71) return 'f';
    if(z>=89 && z<=103) return 'f';
    if(g>=13 && g<=18) return 'p';
    if(g===11 || g===12) return 'ds';
    if(g>=3 && g<=10) return 'd';
    if(g>=1 && g<=2) return 's';
    return 'p';
  }
  const zone = zoneFor(z);
  const zoneColors = { s:'#4aff7a', p:'#33d1ff', d:'#ff5c8a', ds:'#ffa56b', f:'#9d6cff' };
  const col = zoneColors[zone] || '#7b88a8';
  cell.style.borderColor = col;
  cell.style.borderWidth = '1.4px';
  cell.style.boxShadow = `0 0 12px ${col}33`;
  cell.dataset.zone = zone;
  cell.addEventListener('click',()=> onPeriodicCellClick(z, cell));
  cell.addEventListener('mouseenter', (e)=> showElementTooltip(cell));
  cell.addEventListener('mouseleave', hideElementTooltip);
  ptableEl.appendChild(cell);
  ptableCells.push(cell);
}
// 搜索/筛选
const searchEl = document.getElementById('searchBox');
document.getElementById('clearFilter')?.addEventListener('click', ()=>{ if(searchEl){ searchEl.value=''; applyFilter(''); }});
searchEl?.addEventListener('input', e=> applyFilter(e.target.value||''));
function applyFilter(q){
  const query = String(q).trim().toLowerCase();
  ptableCells.forEach(cell=>{
    const sym = (cell.dataset.symbol||'').toLowerCase();
    const z = cell.dataset.z||'';
    const match = !query || sym.includes(query) || z===query;
    cell.classList.toggle('filtered-out', !match);
  });
}

let tooltipEl = null;
function ensureTooltip(){ if(!tooltipEl){ tooltipEl = document.createElement('div'); tooltipEl.className='tooltip'; document.body.appendChild(tooltipEl); } }
function formatSuperscript(number){ const map={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'}; return String(number).split('').map(d=> map[d]||d).join(''); }
function prettyConfigString(cfg){ const tokens = cfg.replace(/[\[\]]/g,'').trim().split(/\s+/).filter(Boolean); return tokens.map(t=>{ const m=t.match(/(\d)([spdf])(\d+)/); if(!m) return t; return `${m[1]}${m[2]}${formatSuperscript(m[3])}`; }).join(' '); }
function sequenceToConfigString(seq){
  const map = new Map();
  seq.forEach(e=>{
    const key = `${e.n}-${e.l}`; map.set(key, (map.get(key)||0) + 1);
  });
  const entries = Array.from(map.entries()).map(([k,v])=>{ const [n,l]=k.split('-').map(Number); return { n, l, occ: v }; });
  entries.sort((a,b)=> a.n===b.n ? a.l-b.l : a.n-b.n);
  const l2ch = ['s','p','d','f'];
  return entries.map(x=> `${x.n}${l2ch[x.l]}${formatSuperscript(x.occ)}`).join(' ');
}
function showElementTooltip(cell){
  ensureTooltip();
  const z = parseInt(cell.dataset.z,10);
  let cfg = electronConfigMap[z] || '';
  let text = '';
  if(cfg){
    text = prettyConfigString(cfg);
  } else {
    const tmpSeq = fillSequence(z);
    text = sequenceToConfigString(tmpSeq);
  }
  tooltipEl.textContent = `${cell.dataset.symbol}：${text}`;
  const rect = cell.getBoundingClientRect(); const x = rect.left + rect.width + 8; const y = rect.top + window.scrollY;
  tooltipEl.style.left = `${x}px`; tooltipEl.style.top = `${y}px`; tooltipEl.style.opacity = '1';
}
function hideElementTooltip(){ if(tooltipEl){ tooltipEl.style.opacity = '0'; } }

const svg=d3.select('#energySvg');
const width=document.getElementById('energySvg').clientWidth;
const height=document.getElementById('energySvg').clientHeight;
svg.attr('viewBox',`0 0 ${width} ${height}`);
const margin={top:26,left:64,right:24,bottom:20};
const levelG=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
const gridG=levelG.append('g').attr('class','grid');
const nodesG=levelG.append('g').attr('class','nodes');
const labelsG=levelG.append('g').attr('class','labels');
const shells=["K","L","M","N","O","P","Q"];
const orbitLabel=(n,l)=>`${n}${['s','p','d','f'][l]}`;
const order=[{n:1,l:0},{n:2,l:0},{n:2,l:1},{n:3,l:0},{n:3,l:1},{n:4,l:0},{n:3,l:2},{n:4,l:1},{n:5,l:0},{n:4,l:2},{n:5,l:1},{n:6,l:0},{n:4,l:3},{n:5,l:2},{n:6,l:1},{n:7,l:0},{n:5,l:3},{n:6,l:2},{n:7,l:1}];
const maxK=8; // 保留列计算所需常量
const innerW=width - margin.left - margin.right;
const innerH=height - margin.top - margin.bottom;
// 垂直列：s/p/d/f 四列严格对齐
const lCols=[0,1,2,3];
const lCount=lCols.length;
const colW=innerW/(lCount+1);
const xForL=l=> (l+1)*colW; // 居中留白
// 行：自下而上 K(1)→Q(7)
const rowH=innerH/(shells.length+0.3);
const yForN=n=> innerH - ((n-1)*rowH + rowH*0.5);
const colorByL=l=> l===0 ? '#7CFF4E' : l===1 ? '#5DF4FF' : l===2 ? '#FFD166' : '#E28BFF';
labelsG.selectAll('text.shell')
  .data(shells.map((s,i)=>({s,i})))
  .enter().append('text')
  .attr('class','shell')
  .attr('x',-38)
  .attr('y',d=> yForN(d.i+1)+4)
  .attr('fill','#9fb0d0')
  .attr('font-size',13)
  .attr('font-weight',600)
  .text(d=> d.s);
// 连接箭头：从右下到左上，按构造原理顺序连线
const defs = svg.append('defs');
const strokeW = 1.6; // 统一线宽，便于箭头尺寸比例控制（中文注释）
const arrowSize = Math.max(8, strokeW * 6);
// 检测是否支持 context-stroke，使箭头颜色与线条颜色过渡完全同步（中文注释）
const supportContextStroke = (()=>{ try{ return !!(window.CSS && CSS.supports && (CSS.supports('fill', 'context-stroke') || CSS.supports('fill: context-stroke'))); }catch(e){ return false; } })();
const baseMarker = defs.append('marker')
  .attr('id','arrowHead')
  .attr('viewBox','0 0 10 10')
  .attr('refX',arrowSize*0.7).attr('refY',arrowSize/2)
  .attr('markerUnits','userSpaceOnUse')
  .attr('markerWidth',arrowSize).attr('markerHeight',arrowSize)
  .attr('orient','auto');
baseMarker.append('path')
  .attr('d','M 0 0 L 10 5 L 0 10 z')
  .attr('fill', supportContextStroke ? 'context-stroke' : '#5c667a');
// 兼容性回退：为不支持 context-stroke 的环境准备纯白箭头（中文注释）
const whiteMarker = defs.append('marker')
  .attr('id','arrowHeadWhite')
  .attr('viewBox','0 0 10 10')
  .attr('refX',arrowSize*0.7).attr('refY',arrowSize/2)
  .attr('markerUnits','userSpaceOnUse')
  .attr('markerWidth',arrowSize).attr('markerHeight',arrowSize)
  .attr('orient','auto');
whiteMarker.append('path')
  .attr('d','M 0 0 L 10 5 L 0 10 z')
  .attr('fill','#ffffff');
// 节点高亮发光滤镜
const glow = defs.append('filter')
  .attr('id','nodeGlow')
  .attr('x','-50%').attr('y','-50%')
  .attr('width','200%').attr('height','200%');
glow.append('feGaussianBlur')
  .attr('in','SourceGraphic')
  .attr('stdDeviation','3')
  .attr('result','blur');
const merge = glow.append('feMerge');
merge.append('feMergeNode').attr('in','blur');
merge.append('feMergeNode').attr('in','SourceGraphic');
const chart=[];
order.forEach(o=>{
  const x = xForL(o.l);
  const y = yForN(o.n);
  chart.push({ ...o, x, y, label: orbitLabel(o.n,o.l), cap: 2*(2*o.l+1) });
});
// 箭头路径按照序列连接
const arrowG = gridG.append('g').attr('class','arrows');
const lineGen = d3.line().x(d=> d.x).y(d=> d.y).curve(d3.curveCatmullRom.alpha(0.5));
const snapHalfPx = v => Math.round(v*2)/2; // 自动吸附至0.5像素网格（中文注释）
const skipPairs = new Set([
  '1-0->2-0',
  '2-0->2-1',
  '3-0->3-1',
  '4-0->3-2',
  '5-0->4-2',
  '6-0->4-3',
  '7-0->5-3'
]);
for(let i=1;i<chart.length;i++){
  const a = chart[i-1]; const b = chart[i];
  const key = `${a.n}-${a.l}->${b.n}-${b.l}`;
  if(skipPairs.has(key)) continue;
  const dx = b.x - a.x, dy = b.y - a.y;
  if(dx===0 && dy===0) continue;
  const nodeR = 16;
  const extStart = nodeR + 8; // 起点向反方向延长距离（中文注释）
  const extEnd = nodeR + 8;   // 终点向方向延长距离（中文注释）
  const dist0 = Math.hypot(dx, dy);
  const ux = dx / dist0, uy = dy / dist0;
  const cxA = snapHalfPx(a.x);
  const cyA = snapHalfPx(a.y);
  const cxB = snapHalfPx(b.x);
  const cyB = snapHalfPx(b.y);
  const sx = snapHalfPx(cxA - ux * extStart);
  const sy = snapHalfPx(cyA - uy * extStart);
  const ex = snapHalfPx(cxB + ux * extEnd);
  const ey = snapHalfPx(cyB + uy * extEnd);
  const pts = [ {x:sx,y:sy}, {x:cxA,y:cyA}, {x:cxB,y:cyB}, {x:ex,y:ey} ];
  const d = lineGen(pts);
  const pathSel = arrowG.append('path')
    .attr('d', d)
    .attr('fill','none')
    .attr('stroke','#5c667a')
    .attr('stroke-width',strokeW)
    .attr('stroke-linecap','round')
    .attr('stroke-linejoin','round')
    .attr('vector-effect','non-scaling-stroke')
    .attr('shape-rendering','geometricPrecision')
    .attr('id', `arrow-${a.label}-${b.label}`) // 为每条箭头添加唯一ID（中文注释）
    .attr('data-from', a.label)
    .attr('data-to', b.label)
    .attr('marker-start', null)
    .attr('marker-mid', null)
    .attr('marker-end','url(#arrowHead)');
  // 输出对齐偏差报告：采样路径至中心点的最小距离（中文注释）
  try{
    const el = pathSel.node();
    const total = el.getTotalLength();
    function minDist(px,py){ let m=Infinity; for(let t=0;t<=total;t+=2){ const p=el.getPointAtLength(t); const d=Math.hypot(p.x-px,p.y-py); if(d<m) m=d; } return m; }
    const errA = minDist(cxA, cyA);
    const errB = minDist(cxB, cyB);
    window.__alignReport = window.__alignReport || [];
    window.__alignReport.push({ seg:key, errA, errB });
  }catch(e){}
}
// 依据 2p→3s 的矢量方向与左侧延伸位置，新增两条穿过 2s/1s 中心的箭头（中文注释）
(function addCenterArrows(){
  const findBy = (lab)=> chart.find(d=> d.label===lab);
  const aRef = findBy('2p');
  const bRef = findBy('3s');
  if(!aRef || !bRef) return;
  const dxR = bRef.x - aRef.x, dyR = bRef.y - aRef.y;
  const distR = Math.hypot(dxR, dyR);
  const uxR = dxR / distR, uyR = dyR / distR;
  const ext = 16 + 8; // 与现有延伸一致（中文注释）
  const leftAlignX = snapHalfPx(bRef.x + uxR * ext);
  function drawFor(label){
    const c = findBy(label);
    if(!c) return;
    const cx = snapHalfPx(c.x), cy = snapHalfPx(c.y);
    const sx = snapHalfPx(cx - uxR * ext);
    const sy = snapHalfPx(cy - uyR * ext);
    const ex = leftAlignX;
    const slope = uyR / uxR;
    const ey = snapHalfPx(cy + (ex - cx) * slope);
  const d = lineGen([{x:sx,y:sy},{x:cx,y:cy},{x:ex,y:ey}]);
  const pathSel = arrowG.append('path')
    .attr('d', d)
    .attr('fill','none')
    .attr('stroke','#5c667a')
    .attr('stroke-width',strokeW)
    .attr('stroke-linecap','round')
    .attr('stroke-linejoin','round')
    .attr('vector-effect','non-scaling-stroke')
    .attr('shape-rendering','geometricPrecision')
    .attr('id', `arrow-${label}-leftBound`) // 新增箭头唯一ID（中文注释）
    .attr('data-from', label)
    .attr('data-to', 'leftBound')
    .attr('marker-end','url(#arrowHead)');
    // 对齐偏差检测：确保路径穿过标签中心（中文注释）
    try{
      const el = pathSel.node();
      const total = el.getTotalLength();
      let m=Infinity; for(let t=0;t<=total;t+=2){ const p=el.getPointAtLength(t); const d2=Math.hypot(p.x-cx,p.y-cy); if(d2<m) m=d2; }
      window.__alignReport = window.__alignReport || [];
      window.__alignReport.push({ seg:`${label}->leftBound`, errA:m, errB:m });
    }catch(e){}
  }
  drawFor('2s');
  drawFor('1s');
})();
// 对齐偏差汇总输出到控制台，便于验证不超过0.5像素（中文注释）
setTimeout(()=>{
  if(window.__alignReport){
    const maxErr = window.__alignReport.reduce((m,r)=> Math.max(m, r.errA, r.errB), 0);
    console.log('[能级对齐报告] 最大中心偏差(px):', maxErr.toFixed(2));
  }
}, 0);
// 箭头颜色状态管理：根据能级填充实时变更箭头为白色，暂停保持、重置清除（中文注释）
const ArrowState = (()=>{
  const activePairs = new Set();
  function selector(from,to){
    return svg.selectAll('.arrows path').filter(function(){ return this.getAttribute('data-from')===from && this.getAttribute('data-to')===to; });
  }
  function pairForEnergy(e){
    const label = `${e.n}${['s','p','d','f'][e.l]}`;
    switch(label){
      case '1s': return ['1s','leftBound'];
      case '2s': return ['2s','leftBound'];
      case '3s': return ['2p','3s'];
      case '4s': return ['3p','4s'];
      case '4p': return ['3d','4p'];
      case '5s': return ['4p','5s'];
      case '5p': return ['4d','5p'];
      case '6s': return ['5p','6s'];
      case '5d': return ['4f','5d'];
      case '6p': return ['5d','6p'];
      case '7s': return ['6p','7s'];
      case '6d': return ['5f','6d'];
      case '7p': return ['6d','7p'];
      default: return null;
    }
  }
  return {
    activateForEnergy(e){
      const pair = pairForEnergy(e); if(!pair) return;
      const [from,to] = pair; const sel = selector(from,to);
      sel.classed('active-arrow', true);
      if(!supportContextStroke){ sel.attr('marker-end','url(#arrowHeadWhite)'); }
      activePairs.add(`${from}->${to}`);
    },
    clearAll(){
      const paths = svg.selectAll('.arrows path');
      paths.classed('active-arrow', false);
      if(!supportContextStroke){ paths.attr('marker-end','url(#arrowHead)'); }
      activePairs.clear();
    }
  };
})();
// 行配色方案（每个能层统一颜色）
const defaultPalette = (localStorage.getItem('rowPalette')||'neon');
const palettes = {
  neon: ['#5df4ff','#4aff7a','#ffd166','#33d1ff','#ff5c8a','#9d6cff','#a1ffb0'],
  cool: ['#7cc6ff','#6ea8ff','#6ac8e9','#8bd5ff','#a3c9ff','#9fb0d0','#8fe3f7'],
  warm: ['#f9c74f','#f9844a','#f8961e','#e76f51','#ffadad','#ffd6a5','#fdffb6']
};
const resolvedKey = palettes[defaultPalette] ? defaultPalette : 'neon';
let rowPalette = palettes[resolvedKey];
function colorByRow(n){
  const pal = rowPalette || palettes['neon'];
  return pal[(n-1)%pal.length];
}
const labelSize = Math.round(Math.max(14, Math.min(16, (width - margin.left - margin.right) * 0.02)));
const nodes=nodesG.selectAll('g.node')
  .data(chart)
  .enter()
  .append('g')
  .attr('class','node')
  .attr('transform',d=>`translate(${d.x},${d.y})`)
  .style('cursor','pointer')
  .on('click',(e,d)=>{
    const key=`${d.n}-${d.l}-0`;
    if(window.__currentOrbitKey===key){ clearGeometryOrbitals(); window.__currentOrbitKey=null; }
    else { clearGeometryOrbitals(); addOrbitalOverlay(d.n,d.l,0); window.__currentOrbitKey=key; }
  });
nodes.append('circle')
  .attr('r',16)
  .attr('fill',d=> colorByRow(d.n))
  .attr('opacity',0.9)
  .attr('stroke','#182035')
  .attr('stroke-width',1.6);
nodes.append('text')
  .text(d=> d.label)
  .attr('text-anchor','middle')
  .attr('dy','5')
  .attr('fill','#0b0f1a')
  .attr('font-weight',700)
  .attr('font-size',labelSize);

// 轨道信息气泡（Popover）：悬停显示，点击不改变现有逻辑
let orbitPopoverEl = null; // 气泡元素缓存
let orbitHoveringNode = false; // 是否在节点区域
let orbitHoveringPopover = false; // 是否在气泡区域
let orbitHideTimer = null; // 延时隐藏定时器
let orbitShowTimer = null; // 显示延迟定时器（防误触发）
let lastHighlightedNode = null; // 最近一次高亮的能级节点，用于二次点击清除（中文注释）
function ensureOrbitPopover(){
  if(!orbitPopoverEl){
    orbitPopoverEl = document.createElement('div');
    orbitPopoverEl.className = 'orbit-pop';
    document.body.appendChild(orbitPopoverEl);
    orbitPopoverEl.style.willChange = 'opacity, transform';
    orbitPopoverEl.style.opacity = '0';
    orbitPopoverEl.style.transform = 'translateY(2px) scale(0.98)';
    orbitPopoverEl.style.transition = 'opacity .3s ease, transform .3s ease';
    // 记录最近高亮节点引用（用于实现能级节点二次点击可清除高亮）
    let lastHighlightedNode = null; // 二次点击时用于比对的节点引用（中文注释）
    orbitPopoverEl.addEventListener('mouseenter', ()=>{ orbitHoveringPopover = true; if(orbitHideTimer){ clearTimeout(orbitHideTimer); orbitHideTimer=null; } });
    orbitPopoverEl.addEventListener('mouseleave', ()=>{ orbitHoveringPopover = false; hideOrbitPopover(); });
  }
}
function showOrbitPopover(d, anchorEvent){
  ensureOrbitPopover();
  const { n, l, label, cap } = d;
  // 构造子轨道选项（支持多选）：p 显示 px/py/pz；d 显示五个取向
  function hasSubOrbit(n,l,m){
    const key=`orb-${n}-${l}-${m}`;
    return !!geomOrbitalGroup.children.find(ch=> ch.name===key);
  }
  function subOptionsHTML(n,l){
    if(l===1){
      const items=[
        {m:1, label:`${n}px`},
        {m:-1,label:`${n}py`},
        {m:0, label:`${n}pz`}
      ];
      return `<div class="row">${items.map(it=>`<label><input class="sub-orb" type="checkbox" data-m="${it.m}"> ${it.label}</label>`).join('')}</div>`;
    }
    if(l===2){
      const items=[
        {m:0, label:`${n}dz²`},
        {m:1, label:`${n}dxz`},
        {m:-1,label:`${n}dyz`},
        {m:2, label:`${n}dx²−y²`},
        {m:-2,label:`${n}dxy`}
      ];
      return `<div class="row" style="flex-wrap:wrap">${items.map(it=>`<label><input class="sub-orb" type="checkbox" data-m="${it.m}"> ${it.label}</label>`).join('')}</div>`;
    }
    return `<div class="row"><label><input class="sub-orb" type="checkbox" data-m="0"> ${n}${['s','p','d','f'][l]}</label></div>`;
  }
  const typeTxt = ['s','p','d','f'][l];
  const energyRank = order.findIndex(o=> o.n===n && o.l===l) + 1;
  orbitPopoverEl.innerHTML = `
    <h4>${label} 轨道</h4>
    <div class="row" style="margin-bottom:8px">
      <span>容量：${cap} 个电子</span>
      <span>量子数：n=${n}，l=${['s','p','d','f'][l]}(${l})</span>
    </div>
    <div class="row" style="margin-bottom:8px"><span>m 值集合：${Array.from({length:(2*l+1)},(_,i)=> i-l).join(', ')}</span></div>
    <div class="row" style="margin-bottom:8px"><span>能级信息：名称 ${label} / 轨道类型 ${typeTxt} / 能量序位 #${energyRank}</span></div>
    ${subOptionsHTML(n,l)}
    <div class="row" style="margin-top:8px">
      <label><input type="checkbox" id="popLock" > 锁定气泡</label>
      <button id="popClose" class="btn" style="margin-left:6px">关闭</button>
    </div>
  `;
  orbitPopoverEl.dataset.n = String(n);
  orbitPopoverEl.dataset.l = String(l);
  const x = (anchorEvent.clientX || 0) + 12;
  const y = (anchorEvent.clientY || 0) + 12 + window.scrollY;
  orbitPopoverEl.style.left = `${x}px`;
  orbitPopoverEl.style.top = `${y}px`;
  if(orbitShowTimer){ clearTimeout(orbitShowTimer); orbitShowTimer=null; }
  orbitShowTimer = setTimeout(()=>{
    orbitPopoverEl.style.display = 'block';
    requestAnimationFrame(()=>{ orbitPopoverEl.style.opacity = '1'; orbitPopoverEl.style.transform = 'translateY(0px) scale(1)'; });
  }, 50);
  // 子轨道事件接线：勾选添加叠加，取消则移除
  orbitPopoverEl.onchange = (ev)=>{
    const target = ev.target;
    if(!(target instanceof HTMLInputElement)) return;
    if(!target.classList.contains('sub-orb')) return;
    const n0 = parseInt(orbitPopoverEl.dataset.n||'0',10);
    const l0 = parseInt(orbitPopoverEl.dataset.l||'0',10);
    const m0 = parseInt(target.dataset.m||'0',10);
    if(target.checked){ addSubOrbit(n0,l0,m0); }
    else { removeSubOrbit(n0,l0,m0); }
  };
  const closeBtn = orbitPopoverEl.querySelector('#popClose');
  closeBtn?.addEventListener('click', ()=>{ forceRemoveOrbitPopover(); });
}
function hideOrbitPopover(){
  if(orbitPopoverEl){
    const locked = orbitPopoverEl.querySelector('#popLock');
    if(locked && locked.checked) return;
    orbitPopoverEl.style.opacity = '0';
    orbitPopoverEl.style.transform = 'translateY(2px) scale(0.98)';
    setTimeout(()=>{ forceRemoveOrbitPopover(); }, 300);
  }
}
function scheduleOrbitPopoverHide(){
  if(orbitHideTimer){ clearTimeout(orbitHideTimer); orbitHideTimer=null; }
  orbitHideTimer = setTimeout(()=>{
    orbitHideTimer=null;
    if(!orbitHoveringNode && !orbitHoveringPopover){ hideOrbitPopover(); }
  }, 500);
}
function forceRemoveOrbitPopover(){
  if(!orbitPopoverEl) return;
  try{ document.body.removeChild(orbitPopoverEl); }catch(e){}
  orbitPopoverEl = null;
}
function clearNodeHighlight(){
  nodes.selectAll('circle')
    .attr('stroke','#182035')
    .attr('stroke-width',1.6)
    .attr('opacity',0.9)
    .attr('filter', null);
}
function setNodeHighlight(targetG){
  clearNodeHighlight();
  const circle = d3.select(targetG).select('circle');
  const base = circle.attr('fill') || '#5df4ff';
  const c = d3.color(base);
  const hsl = d3.hsl(c);
  const delta = hsl.l > 0.5 ? -0.15 : 0.15; // 颜色明暗变体，保持色相不变
  hsl.l = Math.max(0, Math.min(1, hsl.l + delta));
  const variant = hsl.formatHex();
  circle.transition().duration(200)
    .attr('stroke', variant)
    .attr('stroke-width',3.0)
    .attr('opacity',1.0)
    .attr('filter','url(#nodeGlow)');
}
nodes
  .on('click',(e,d)=>{
    setNodeHighlight(e.currentTarget);
    showOrbitPopover(d, e);
    clearGeometryOrbitals();
    activeOrbitals = [];
    updateVolumeUniforms();
  });
nodes.on('touchstart',(e,d)=>{
  e.preventDefault();
  const touch = e.changedTouches ? e.changedTouches[0] : e;
  setNodeHighlight(e.currentTarget);
  showOrbitPopover(d, touch);
});
// 交互增强：统一重绑定节点事件，实现二次点击清除与ARIA可访问性（中文注释）
nodes
  .attr('role','button')
  .attr('tabindex',0)
  .attr('aria-selected','false')
  .on('click',(e,d)=>{
    const target = e.currentTarget;
    const same = lastHighlightedNode === target;
    if(same){
      clearNodeHighlight();
      hideOrbitPopover();
      clearGeometryOrbitals();
      activeOrbitals = [];
      updateVolumeUniforms();
      lastHighlightedNode = null;
      d3.select(target).attr('aria-selected','false');
      return;
    }
    setNodeHighlight(target);
    d3.select(target).attr('aria-selected','true');
    lastHighlightedNode = target;
    showOrbitPopover(d, e);
    clearGeometryOrbitals();
    activeOrbitals = [];
    updateVolumeUniforms();
  })
  .on('touchstart',(e,d)=>{
    e.preventDefault();
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const target = e.currentTarget;
    const same = lastHighlightedNode === target;
    if(same){
      clearNodeHighlight();
      hideOrbitPopover();
      clearGeometryOrbitals();
      activeOrbitals = [];
      updateVolumeUniforms();
      lastHighlightedNode = null;
      d3.select(target).attr('aria-selected','false');
    } else {
      setNodeHighlight(target);
      d3.select(target).attr('aria-selected','true');
      lastHighlightedNode = target;
      showOrbitPopover(d, touch);
      clearGeometryOrbitals();
      activeOrbitals = [];
      updateVolumeUniforms();
    }
  })
  .on('keydown',(e,d)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); nodes.dispatch('click',{detail:d}); }});
document.addEventListener('click', (ev)=>{
  const locked = orbitPopoverEl?.querySelector('#popLock');
  if(locked && locked.checked) return;
  const inPop = orbitPopoverEl && orbitPopoverEl.contains(ev.target);
  const inNode = !!(ev.target && ev.target.closest && ev.target.closest('g.node'));
  if(!inPop && !inNode){ hideOrbitPopover(); clearNodeHighlight(); lastHighlightedNode=null; }
  const ptableRoot = document.getElementById('ptable');
  const inTable = !!(ev.target && ptableRoot && ptableRoot.contains(ev.target));
  if(!inTable && !demoLockedHighlight){ ptableCells.forEach(c=> { c.classList.remove('selected'); c.setAttribute('aria-selected','false'); }); }
});

const canvas=document.getElementById('three');
const ctx2 = canvas.getContext('webgl2');
const renderer=new THREE.WebGLRenderer({canvas,context: (ctx2 || undefined), antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio));
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(75,canvas.clientWidth/canvas.clientHeight,0.1,1000);
camera.position.set(0,0,15);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.05;controls.minDistance=5;controls.maxDistance=50;
// 自动旋转控制：与 UI 联动，按选中轴旋转几何轨道组
const axXEl = document.getElementById('rotX');
const axYEl = document.getElementById('rotY');
const axZEl = document.getElementById('rotZ');
const speedEl = document.getElementById('rotSpeed');
function speedToDelta(key){ return key==='slow' ? 0.002 : key==='fast' ? 0.012 : 0.006; }
let rotDelta = speedToDelta(speedEl ? speedEl.value : 'medium');
speedEl?.addEventListener('change', e=>{ rotDelta = speedToDelta(e.target.value); });
const rotResetBtn = document.getElementById('rotReset');
let resetRotActive=false, resetRotStart=0, resetRotDuration=500, resetRotFromQuat=new THREE.Quaternion(), resetRotToQuat=new THREE.Quaternion();
rotResetBtn?.addEventListener('click', ()=>{
  resetRotActive = true;
  resetRotStart = performance.now();
  resetRotFromQuat.copy(geomOrbitalGroup.quaternion);
  resetRotToQuat.identity();
  // 清除旋转轴勾选，统一恢复到无旋转状态
  if(axXEl) axXEl.checked = false;
  if(axYEl) axYEl.checked = false;
  if(axZEl) axZEl.checked = false;
});
function axisContinuousRotate(){
  const d = rotDelta;
  if(axXEl?.checked) geomOrbitalGroup.rotation.x += d;
  if(axYEl?.checked) geomOrbitalGroup.rotation.y += d;
  if(axZEl?.checked) geomOrbitalGroup.rotation.z += d;
}
const axes=new THREE.Group();scene.add(axes);
let axisLabelSprites=[];
let axisLabelInfo=[];
let axisLen=5;
function createAxesWithLabels(){
  while(axes.children.length>0){ axes.remove(axes.children[0]); }
  axisLabelSprites.forEach(s=> scene.remove(s)); axisLabelSprites=[];
  const radius=0.06, length=5, headLen=0.45, headRad=0.18;
  axisLen = length;
  function makeAxis(dir,color,txt){
    const shaft = new THREE.CylinderGeometry(radius, radius, length-headLen, 24);
    const matS = new THREE.MeshPhongMaterial({ color, transparent:false });
    const meshS = new THREE.Mesh(shaft, matS);
    // orient cylinder: default up Y, place along dir
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
    meshS.quaternion.copy(q);
    meshS.position.copy(dir.clone().normalize().multiplyScalar((length-headLen)/2));
    meshS.userData.axis = txt;
    const head = new THREE.ConeGeometry(headRad, headLen, 24);
    const matH = new THREE.MeshPhongMaterial({ color });
    const meshH = new THREE.Mesh(head, matH);
    const qh = new THREE.Quaternion(); qh.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
    meshH.quaternion.copy(qh);
    meshH.position.copy(dir.clone().normalize().multiplyScalar(length - headLen/2));
    meshH.userData.axis = txt;
    axes.add(meshS); axes.add(meshH);
    // label sprite
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const baseSize = Math.round((typeof labelSize!=='undefined'?labelSize:16)*1.2);
    canvas.width = baseSize*4; canvas.height = baseSize*2;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#e6f1ff';
    ctx.font = `${baseSize}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, canvas.width/2, canvas.height/2);
    const tex = new THREE.CanvasTexture(canvas);
    const sprMat = new THREE.SpriteMaterial({ map: tex, transparent:true });
    const spr = new THREE.Sprite(sprMat);
    const scale = 0.02 * length * baseSize; // scale by length and font size
    spr.scale.set(scale/2, scale/4, 1);
    const offset = dir.clone().normalize().multiplyScalar(length + 0.25);
    spr.position.copy(offset);
    scene.add(spr);
    axisLabelSprites.push(spr);
    spr.userData.axis = txt;
    axisLabelInfo.push({ sprite: spr, baseDir: dir.clone().normalize() });
  }
  makeAxis(new THREE.Vector3(1,0,0), 0x66d1ff, 'x');
  makeAxis(new THREE.Vector3(0,1,0), 0x7cff4e, 'y');
  makeAxis(new THREE.Vector3(0,0,1), 0xffd166, 'z');
}
createAxesWithLabels();
document.getElementById('showAxes').addEventListener('change',e=>{ axes.visible = e.target.checked; axisLabelSprites.forEach(s=> s.visible = e.target.checked); });
const light=new THREE.AmbientLight(0xffffff,.6);scene.add(light);
const dirLight=new THREE.DirectionalLight(0xffffff,.8);dirLight.position.set(10,10,10);scene.add(dirLight);

const volumeGeom=new THREE.BoxGeometry(2,2,2);
let activeOrbitals=[];
const geomOrbitalGroup = new THREE.Group(); scene.add(geomOrbitalGroup);
// 轴点击旋转：射线拾取并对几何组执行四元数缓动旋转
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let axisRotActive=false, axisRotStart=0, axisRotDuration=300, axisRotFromQuat=new THREE.Quaternion(), axisRotToQuat=new THREE.Quaternion();
function onAxisClick(ev){
  const rect = canvas.getBoundingClientRect();
  const cx = (ev.clientX!==undefined?ev.clientX:(ev.touches&&ev.touches[0].clientX));
  const cy = (ev.clientY!==undefined?ev.clientY:(ev.touches&&ev.touches[0].clientY));
  if(cx===undefined||cy===undefined) return;
  pointer.x = ((cx - rect.left) / rect.width) * 2 - 1;
  pointer.y = - ((cy - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const targets = axes.children.concat(axisLabelSprites);
  const hits = raycaster.intersectObjects(targets, true);
  if(!hits.length) return;
  const h = hits[0].object;
  const ax = (h.userData && h.userData.axis || '').toLowerCase();
  let axisVec = null;
  if(ax==='x') axisVec = new THREE.Vector3(1,0,0);
  else if(ax==='y') axisVec = new THREE.Vector3(0,1,0);
  else if(ax==='z') axisVec = new THREE.Vector3(0,0,1);
  if(!axisVec) return;
  const angle = Math.PI/8; // 22.5°
  axisRotFromQuat.copy(geomOrbitalGroup.quaternion);
  const q = new THREE.Quaternion().setFromAxisAngle(axisVec, angle);
  axisRotToQuat.copy(axisRotFromQuat).multiply(q);
  axisRotActive = true;
  axisRotStart = performance.now();
}
canvas.addEventListener('click', onAxisClick);
canvas.addEventListener('touchstart', onAxisClick, { passive: true });

function makeVolumeMaterial(){
  const MAX_ORB=8;
  const isoEl = document.getElementById('isoLevel');
  const isoDefault = isoEl ? parseFloat(isoEl.value) : 0.8;
  const uniforms={
    uIso:{value: isoDefault},
    uStep:{value:0.02},
    uMaxSteps:{value:220},
    uOrbCount:{value:0},
    uN:{value:new Array(MAX_ORB).fill(1)},
    uL:{value:new Array(MAX_ORB).fill(0)},
    uM:{value:new Array(MAX_ORB).fill(0)},
    uColor:{value:new Array(MAX_ORB).fill(0).map(()=>new THREE.Color('#ffffff'))},
    uTime:{value:0},
    uLightDir:{value:new THREE.Vector3(0.6,0.5,0.7).normalize()},
    uAO:{value:1.0},
    uSigmaA:{value:0.8},
    uScatterG:{value:0.65},
    uDevicePixelRatio:{value:Math.min(2,window.devicePixelRatio)},
    uZeff:{ value: 1.0 }
  };
  const vertex=`
    out vec3 vWorldPos; out vec3 vLocalPos;
    void main(){
      vLocalPos = position;
      vec4 wp = modelMatrix * vec4(position,1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `;
  const fragment=`
    precision highp float;
    in vec3 vWorldPos; in vec3 vLocalPos;
    out vec4 fragColor;
    uniform float uIso; uniform float uStep; uniform int uMaxSteps; uniform int uOrbCount;
    uniform float uN[8]; uniform float uL[8]; uniform float uM[8]; uniform vec3 uColor[8];
    uniform vec3 uLightDir; uniform float uAO; uniform float uSigmaA; uniform float uScatterG; uniform float uDevicePixelRatio;
    uniform float uTime;
    uniform float uZeff;
    float saturate(float x){return clamp(x,0.0,1.0);} 
    vec3 colormap(float t){t=clamp(t,0.0,1.0);float r=0.5+0.5*sin(6.283*t*0.85+0.0);float g=0.5+0.5*sin(6.283*t*0.85+2.1);float b=0.5+0.5*sin(6.283*t*0.85+4.2);return vec3(r,g,b);} 
    bool rayBoxIntersect(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax, out float t0, out float t1){
      vec3 inv=1.0/rd; vec3 tmin=(bmin-ro)*inv; vec3 tmax=(bmax-ro)*inv; vec3 tsmaller=min(tmin,tmax); vec3 tbigger=max(tmin,tmax);
      t0=max(max(tsmaller.x,tsmaller.y),tsmaller.z); t1=min(min(tbigger.x,tbigger.y),tbigger.z); return t1>max(t0,0.0);
    }
    float sphAmp(int l,int m,vec3 d){float x=d.x,y=d.y,z=d.z; if(l==0){return 1.0;} if(l==1){if(m==0) return z; if(m==1) return x; if(m==-1) return y;} if(l==2){if(m==0) return 0.5*(3.0*z*z-1.0); if(m==1) return x*z; if(m==-1) return y*z; if(m==2) return 0.5*(x*x-y*y); if(m==-2) return x*y;} if(l==3){if(m==0) return z*(5.0*z*z-3.0)/2.0; if(m==1) return x*(5.0*z*z-1.0); if(m==-1) return y*(5.0*z*z-1.0); if(m==2) return z*(x*x-y*y); if(m==-2) return 2.0*x*y*z; if(m==3) return x*(x*x-3.0*y*y); if(m==-3) return y*(3.0*x*x-y*y);} return 0.0;}
    // 更真实的径向函数：氢样轨道近似（使用拉盖尔多项式的简化形式，支持到 n=5）
    float radialHydrogen(int n,int l,float r){
      float a0 = 1.0/(uZeff); // 有效核电荷缩放
      float rho = 2.0*r/(float(n)*a0);
      if(n==1 && l==0){ return 2.0*exp(-rho); }
      if(n==2){
        if(l==0){ return (1.0/2.0)*(2.0-rho)*exp(-rho/2.0); }
        if(l==1){ return (1.0/2.0)*rho*exp(-rho/2.0); }
      }
      if(n==3){
        if(l==0){ return (2.0/27.0)*(27.0 - 18.0*rho + 2.0*rho*rho)*exp(-rho/3.0); }
        if(l==1){ return (8.0/27.0)*(rho*(6.0 - rho))*exp(-rho/3.0); }
        if(l==2){ return (4.0/27.0)*(rho*rho)*exp(-rho/3.0); }
      }
      if(n==4){
        if(l==0){ return (1.0/96.0)*(96.0 - 72.0*rho + 12.0*rho*rho - rho*rho*rho)*exp(-rho/4.0); }
        if(l==1){ return (1.0/32.0)*(rho*(24.0 - 8.0*rho + rho*rho))*exp(-rho/4.0); }
        if(l==2){ return (1.0/64.0)*(rho*rho*(12.0 - rho))*exp(-rho/4.0); }
        if(l==3){ return (1.0/384.0)*(rho*rho*rho)*exp(-rho/4.0); }
      }
      if(n==5){
        if(l==0){ return (1.0/600.0)*(600.0 - 480.0*rho + 120.0*rho*rho - 12.0*rho*rho*rho + rho*rho*rho*rho)*exp(-rho/5.0); }
        if(l==1){ return (1.0/150.0)*(rho*(150.0 - 60.0*rho + 10.0*rho*rho - rho*rho*rho))*exp(-rho/5.0); }
        if(l==2){ return (1.0/300.0)*(rho*rho*(60.0 - 12.0*rho + rho*rho))*exp(-rho/5.0); }
        if(l==3){ return (1.0/1200.0)*(rho*rho*rho*(20.0 - rho))*exp(-rho/5.0); }
        if(l==4){ return (1.0/15000.0)*(rho*rho*rho*rho)*exp(-rho/5.0); }
      }
      // 默认为简化近似
      float a=float(n)*a0; return pow(r/a, float(l)) * exp(-2.0*r/a);
    }
    float densityFor(vec3 p,int n,int l,int m){float r=length(p); vec3 d=normalize(p); float amp=abs(sphAmp(l,m,d)); float rad=radialHydrogen(n,l,r); float rho=amp*amp*rad*rad; return rho;}
    vec3 gradient(vec3 p,int n,int l,int m){float h=0.005; float dx=densityFor(p+vec3(h,0,0),n,l,m)-densityFor(p-vec3(h,0,0),n,l,m); float dy=densityFor(p+vec3(0,h,0),n,l,m)-densityFor(p-vec3(0,h,0),n,l,m); float dz=densityFor(p+vec3(0,0,h),n,l,m)-densityFor(p-vec3(0,0,h),n,l,m); return vec3(dx,dy,dz)/(2.0*h);} 
    float phaseHG(float cosTheta,float g){return (1.0/(4.0*3.141592)) * ((1.0-g*g)/pow(1.0+g*g-2.0*g*cosTheta,1.5));}
    void main(){
      vec3 ro=cameraPosition; vec3 rd=normalize(vWorldPos - cameraPosition);
      float t0,t1; if(!rayBoxIntersect(ro,rd,vec3(-1.0),vec3(1.0),t0,t1)){discard;}
      float t=t0; float prev=densityFor(ro+rd*t,int(uN[0]),int(uL[0]),int(uM[0]));
      vec3 accum=vec3(0.0); float trans=1.0; float step=uStep; int steps=0; vec3 wcol=vec3(0.0);
      for(int i=0;i<1024;i++){
        if(steps>=uMaxSteps) break; if(t>t1) break; vec3 pos=ro+rd*t; float rho=0.0; wcol=vec3(0.0);
        for(int k=0;k<8;k++){
          if(k>=uOrbCount) break; float rk=densityFor(pos,int(uN[k]),int(uL[k]),int(uM[k])); rho+=rk; wcol+=rk*uColor[k];
        }
        vec3 mixCol=(rho>0.0)?(wcol/(rho+1e-6)):vec3(1.0);
        if(prev<uIso && rho>=uIso){
          vec3 gsum=vec3(0.0); for(int k=0;k<8;k++){ if(k>=uOrbCount) break; gsum+=gradient(pos,int(uN[k]),int(uL[k]),int(uM[k])); }
          vec3 n=normalize(gsum);
          float lambert=saturate(dot(n,normalize(uLightDir)));
          float ao=1.0; if(uAO>0.5){ float occ=0.0; float s=0.01; for(int j=1;j<=6;j++){ float d=float(j)*s; float densitySample=0.0; for(int k=0;k<8;k++){ if(k>=uOrbCount) break; densitySample+=densityFor(pos+n*d,int(uN[k]),int(uL[k]),int(uM[k])); } occ+=densitySample; } ao=exp(-occ*0.65); }
          vec3 base=colormap(saturate((rho-uIso)*2.0)); base=mix(base,mixCol,0.6); base=mix(base, vec3(1.0), 0.20);
          vec3 surf=base*(0.25+0.75*lambert)*ao; accum += trans*surf; trans *= exp(-uSigmaA*0.6);
        }
        float scatter=phaseHG(dot(rd,uLightDir), uScatterG);
        vec3 volCol=colormap(saturate(rho*1.2)); volCol=mix(volCol,mixCol,0.55); volCol=mix(volCol, vec3(1.0), 0.25);
        accum += trans*volCol*(rho*step*0.9)*scatter; trans *= exp(-uSigmaA*rho*step);
        t += step; steps++; prev=rho;
      }
      fragColor=vec4(accum, saturate(1.0-trans));
    }
  `;
  const mat=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,glslVersion:THREE.GLSL3});
  return mat;
}

const volumeMat=makeVolumeMaterial();
// 废弃体渲染网格：不再创建/添加，避免原点出现深色长方体
// const volumeMesh=new THREE.Mesh(volumeGeom,volumeMat);
// scene.add(volumeMesh);

function updateVolumeUniforms(){
  const isoEl = document.getElementById('isoLevel');
  const iso = isoEl ? parseFloat(isoEl.value) : volumeMat.uniforms.uIso.value;
  volumeMat.uniforms.uIso.value=iso;
  volumeMat.uniforms.uOrbCount.value=Math.min(activeOrbitals.length,8);
  for(let i=0;i<8;i++){
    const o=activeOrbitals[i];
    volumeMat.uniforms.uN.value[i]=o?o.n:1;
    volumeMat.uniforms.uL.value[i]=o?o.l:0;
    volumeMat.uniforms.uM.value[i]=o?o.m:0;
    volumeMat.uniforms.uColor.value[i]=new THREE.Color(o?o.color:'#ffffff');
  }
}

function addOrbitalOverlay(n,l,m){
  clearGeometryOrbitals();
  const color=colorByL(l);
  addGeometryOrbital(n,l,m,color);
  // 同步体渲染的 uniform（即使当前不显示体渲染，也保持一致性）
  activeOrbitals = [{ n, l, m, color }];
  updateVolumeUniforms();
}

// 多选子轨道：添加/移除单条叠加并同步 uniform
function colorByLM(l,m){
  if(l===1){ // p 取向颜色
    const arr=['#33d1ff','#5df4ff','#7cc6ff']; // x,y,z 三色
    const idx=(m===1)?0:(m===-1)?1:2; return arr[idx];
  }
  if(l===2){ // d 五取向颜色
    const arr=['#ffd166','#ff5c8a','#5df4ff','#9d6cff','#33d1ff'];
    const map={'0':0,'1':2,'-1':1,'2':3,'-2':4};
    return arr[map[String(m)]||0];
  }
  return colorByL(l);
}
function addSubOrbit(n,l,m){
  const key=`orb-${n}-${l}-${m}`;
  if(geomOrbitalGroup.children.find(ch=> ch.name===key)) return;
  const color=colorByLM(l,m);
  addGeometryOrbital(n,l,m,color);
  const last = activeOrbitals.find(o=> o.n===n && o.l===l && o.m===m);
  if(!last){ activeOrbitals.push({ n,l,m,color }); updateVolumeUniforms(); }
}
function removeSubOrbit(n,l,m){
  const key=`orb-${n}-${l}-${m}`;
  for(let i=0;i<geomOrbitalGroup.children.length;i++){
    const ch=geomOrbitalGroup.children[i];
    if(ch.name===key){ geomOrbitalGroup.remove(ch); break; }
  }
  const idx = activeOrbitals.findIndex(o=> o.n===n && o.l===l && o.m===m);
  if(idx>=0){ activeOrbitals.splice(idx,1); updateVolumeUniforms(); }
}

// 叠加显示功能已移除；保留单轨道显示

// 几何轨道渲染（参考 another project/app.js）
function clearGeometryOrbitals(){
  if(!geomOrbitalGroup) return;
  while(geomOrbitalGroup.children.length>0){
    const child=geomOrbitalGroup.children[0];
    if(child.children){ child.children.forEach(grand=>{ if(grand.geometry) grand.geometry.dispose(); if(grand.material) grand.material.dispose(); }); }
    geomOrbitalGroup.remove(child);
  }
}
function addGeometryOrbital(n,l,m,color){
  const type=['s','p','d','f'][l];
  let index=0;
  if(l===1){ index=(m===-1)?1:(m===0)?2:0; }
  else if(l===2){ const map={'-2':4,'-1':1,'0':0,'1':2,'2':3}; index=map[String(m)]??0; }
  const orbital=createOrbitalShapeGeom(type,index,n,color);
  orbital.position.set(0,0,0);
  orbital.name = `orb-${n}-${l}-${m}`; // 赋名便于多选管理
  geomOrbitalGroup.add(orbital);
}
function createOrbitalShapeGeom(type,index,n,colorHex){
  const group=new THREE.Group();
  const scale=n*2;
  const mat=new THREE.MeshPhongMaterial({ color:new THREE.Color(colorHex), transparent:true, opacity:0.35, side:THREE.DoubleSide, wireframe:false });
  if(type==='s'){
    const geo=new THREE.SphereGeometry(scale,32,32);
    group.add(new THREE.Mesh(geo,mat));
  } else if(type==='p'){
    const geo=createDumbbellGeometry(scale);
    const mesh=new THREE.Mesh(geo,mat);
    if(index===0){ mesh.rotation.z=-Math.PI/2; } else if(index===2){ mesh.rotation.x=Math.PI/2; }
    group.add(mesh);
  } else if(type==='d'){
    const geo=createDOrbitalGeometry(scale,index);
    const mesh=new THREE.Mesh(geo,mat);
    group.add(mesh);
  } else {
    const geo=createFOrbitalGeometry(scale,index);
    const mesh=new THREE.Mesh(geo,mat);
    group.add(mesh);
  }
  return group;
}
function createDumbbellGeometry(scale){
  const geometry=new THREE.BufferGeometry();
  const segments=50; const vertices=[]; const indices=[];
  for(let i=0;i<=segments;i++){
    const theta=(i/segments)*Math.PI;
    for(let j=0;j<=segments;j++){
      const phi=(j/segments)*Math.PI*2;
      const angular=Math.abs(Math.cos(theta));
      const r=scale*Math.sqrt(angular)*0.8;
      const x=r*Math.sin(theta)*Math.cos(phi);
      const y=r*Math.cos(theta);
      const z=r*Math.sin(theta)*Math.sin(phi);
      vertices.push(x,y,z);
    }
  }
  for(let i=0;i<segments;i++){
    for(let j=0;j<segments;j++){
      const a=i*(segments+1)+j;
      const b=a+segments+1;
      indices.push(a,b,a+1);
      indices.push(b,b+1,a+1);
    }
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return geometry;
}
function createDOrbitalGeometry(scale,index){
  const geometry=new THREE.BufferGeometry();
  const vertices=[]; const indices=[]; const segments=50;
  const dShapes=[
    // dz²：沿 z 轴哑铃，环在 xy 平面
    (theta,phi)=>{ const cosTheta=Math.cos(theta); const angular=Math.abs(3*cosTheta*cosTheta-1); const r=scale*Math.sqrt(Math.max(0,angular))*0.5*Math.SQRT2; return new THREE.Vector3( r*Math.sin(theta)*Math.cos(phi), r*Math.sin(theta)*Math.sin(phi), r*cosTheta ); },
    // dxz：位于 xz 平面，最大在 x 与 z 之间 45°方向
    (theta,phi)=>{ const sinTheta=Math.sin(theta), cosTheta=Math.cos(theta), cosPhi=Math.cos(phi), sinPhi=Math.sin(phi); const angular=Math.abs(sinTheta*cosTheta*cosPhi); const r=scale*Math.sqrt(angular)*Math.SQRT2; return new THREE.Vector3( r*sinTheta*cosPhi, r*sinTheta*sinPhi, r*cosTheta ); },
    // dyz：位于 yz 平面
    (theta,phi)=>{ const sinTheta=Math.sin(theta), cosTheta=Math.cos(theta), cosPhi=Math.cos(phi), sinPhi=Math.sin(phi); const angular=Math.abs(sinTheta*cosTheta*sinPhi); const r=scale*Math.sqrt(angular)*Math.SQRT2; return new THREE.Vector3( r*sinTheta*cosPhi, r*sinTheta*sinPhi, r*cosTheta ); },
    // dx²−y²：在 xy 平面叶瓣
    (theta,phi)=>{ const sinTheta=Math.sin(theta); const angular=Math.abs(sinTheta*sinTheta*Math.cos(2*phi)); const r=scale*Math.sqrt(angular); return new THREE.Vector3( r*sinTheta*Math.cos(phi), r*sinTheta*Math.sin(phi), r*Math.cos(theta) ); },
    // dxy：在 xy 平面 45°方向叶瓣
    (theta,phi)=>{ const sinTheta=Math.sin(theta); const angular=Math.abs(sinTheta*sinTheta*Math.sin(2*phi)); const r=scale*Math.sqrt(angular); return new THREE.Vector3( r*sinTheta*Math.cos(phi), r*sinTheta*Math.sin(phi), r*Math.cos(theta) ); }
  ];
  const shapeFunc=dShapes[index%5];
  for(let i=0;i<=segments;i++){
    const theta=(i/segments)*Math.PI;
    for(let j=0;j<=segments;j++){
      const phi=(j/segments)*Math.PI*2;
      const pos=shapeFunc(theta,phi);
      vertices.push(pos.x,pos.y,pos.z);
    }
  }
  for(let i=0;i<segments;i++){
    for(let j=0;j<segments;j++){
      const a=i*(segments+1)+j;
      const b=a+segments+1;
      indices.push(a,b,a+1);
      indices.push(b,b+1,a+1);
    }
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return geometry;
}
function createFOrbitalGeometry(scale,index){
  const geometry=new THREE.BufferGeometry();
  const vertices=[]; const indices=[]; const segments=24;
  for(let i=0;i<=segments;i++){
    const theta=(i/segments)*Math.PI;
    for(let j=0;j<=segments;j++){
      const phi=(j/segments)*Math.PI*2;
      const r=scale*(1+0.3*Math.sin(3*theta)*Math.cos(3*phi));
      vertices.push( r*Math.sin(theta)*Math.cos(phi), r*Math.cos(theta), r*Math.sin(theta)*Math.sin(phi) );
    }
  }
  for(let i=0;i<segments;i++){
    for(let j=0;j<segments;j++){
      const a=i*(segments+1)+j;
      const b=a+segments+1;
      indices.push(a,b,a+1);
      indices.push(b,b+1,a+1);
    }
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return geometry;
}

const isoEl = document.getElementById('isoLevel'); if(isoEl){ isoEl.addEventListener('input',updateVolumeUniforms); }
// 能层配色选择器
const paletteSel = document.getElementById('rowPalette');
if(paletteSel){
  if(!paletteSel.children.length){
    [{k:'neon',t:'霓虹高对比'},{k:'cool',t:'冷色科学'},{k:'warm',t:'暖色教学'}]
      .forEach(o=>{ const opt=document.createElement('option'); opt.value=o.k; opt.textContent=o.t; paletteSel.appendChild(opt); });
  }
  paletteSel.value = resolvedKey;
  paletteSel.addEventListener('change', (e)=>{
    const key = e.target.value;
    rowPalette = palettes[key] || palettes['neon'];
    localStorage.setItem('rowPalette', key);
    nodes.selectAll('circle').attr('fill', d=> colorByRow(d.n));
  });
}

function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
window.addEventListener('resize',resize);
// 响应式标签字体：根据 SVG 宽度调整
function updateChartFonts(){
  const svgEl = document.getElementById('energySvg');
  const w = svgEl.clientWidth - margin.left - margin.right;
  const size = Math.round(Math.max(14, Math.min(16, w * 0.02)));
  nodes.selectAll('text').attr('font-size', size);
}
window.addEventListener('resize', updateChartFonts);
setTimeout(updateChartFonts, 0);

const subshells=order.map(o=>({...o,label:orbitLabel(o.n,o.l),cap:2*(2*o.l+1)}));
// 准确电子排布数据（运行时加载自权威数据集）
let electronConfigMap = {};
let configsLoaded = false;
async function loadLocalElectronConfigs(){
  try{
    const base = '/电子排布式.txt';
    const enc = encodeURI(base);
    const candidates = [base, enc, './电子排布式.txt'];
    let txt = '';
    for(const url of candidates){
      const res = await fetch(url);
      if(res.ok){ txt = await res.text(); break; }
    }
    if(!txt){ throw new Error('配置文件未找到'); }
    const blocks = txt.match(/\{[^}]*\}/g) || [];
    blocks.forEach(b=>{
      const zM = b.match(/Z\s*:\s*(\d+)/);
      const ecM = b.match(/electron_configuration\s*:\s*"([^"]+)"/);
      if(zM && ecM){
        const Z = parseInt(zM[1],10);
        electronConfigMap[Z] = ecM[1];
      }
    });
    configsLoaded = true;
    if(currentZ){ resetDemo(); }
  }catch(err){
    configsLoaded = false;
    console.error('电子排布配置加载失败', err);
  }
}
loadLocalElectronConfigs();

const nobleGasExpand = {
  'He': ['1s2'],
  'Ne': ['1s2','2s2','2p6'],
  'Ar': ['1s2','2s2','2p6','3s2','3p6'],
  'Kr': ['1s2','2s2','2p6','3s2','3p6','4s2','3d10','4p6'],
  'Xe': ['1s2','2s2','2p6','3s2','3p6','4s2','3d10','4p6','5s2','4d10','5p6'],
  'Rn': ['1s2','2s2','2p6','3s2','3p6','4s2','3d10','4p6','5s2','4d10','5p6','6s2','4f14','5d10','6p6']
};
function parseConfigTokens(configStr){
  let tokens = configStr.replace(/[\[\]]/g,'').split(/\s+/).filter(Boolean);
  if(tokens.length && nobleGasExpand[tokens[0]]){
    const base = nobleGasExpand[tokens[0]];
    tokens = base.concat(tokens.slice(1));
  }
  return tokens;
}
function tokenToNL(token){
  const m = token.match(/(\d)([spdf])(\d+)/);
  if(!m) return null;
  const n = parseInt(m[1],10);
  const lMap = { s:0, p:1, d:2, f:3 };
  return { n, l: lMap[m[2]], occ: parseInt(m[3],10) };
}
function buildSequenceFromConfig(Z){
  const cfg = electronConfigMap[Z];
  if(!cfg) return null;
  const seq = [];
  const tokens = parseConfigTokens(cfg);
  const occMap = new Map();
  let expectedTotal = 0;
  for(const t of tokens){ const info = tokenToNL(t); if(!info) continue; occMap.set(`${info.n}-${info.l}`, info.occ); expectedTotal += info.occ; }
  // 按构造原理顺序填充（n+l 规则），但占据数来自权威配置
  for(const sub of subshells){
    const occ = occMap.get(`${sub.n}-${sub.l}`) || 0;
    if(occ<=0) continue;
    const mVals = Array.from({length:(2*sub.l+1)},(_,i)=> i-sub.l);
    let left = occ;
    for(const m of mVals){ if(left<=0) break; seq.push({ n:sub.n, l:sub.l, m, s:+0.5, label: orbitLabel(sub.n,sub.l) }); left--; }
    for(const m of mVals){ if(left<=0) break; seq.push({ n:sub.n, l:sub.l, m, s:-0.5, label: orbitLabel(sub.n,sub.l) }); left--; }
  }
  if(seq.length !== Z){ console.warn('电子数验证未通过', { Z, total: seq.length, cfg }); }
  return seq;
}
function fillSequence(Z){
  const seqFromCfg = buildSequenceFromConfig(Z);
  if(seqFromCfg && seqFromCfg.length){ return seqFromCfg; }
  const seq=[];const mList=l=>Array.from({length:(2*l+1)},(_,i)=>i-l);let remaining=Z;
  for(const sub of subshells){
    if(remaining<=0)break;const orbitMs=mList(sub.l);let seats=[];
    for(const m of orbitMs){seats.push({m,count:0})}
    for(const s of seats){if(remaining<=0)break;seq.push({n:sub.n,l:sub.l,m:s.m,s:+0.5,label:sub.label});s.count++;remaining--}
    for(const s of seats){while(s.count<2&&remaining>0){seq.push({n:sub.n,l:sub.l,m:s.m,s:-0.5,label:sub.label});s.count++;remaining--}}
  }
  function applyException(symbol,seq){
    if(symbol==="Cr"||symbol==="Cu"){
      const idx4s=seq.findIndex(e=>e.n===4&&e.l===0);
      if(idx4s>=0){
        seq.splice(idx4s,1);
        const dIndices=seq.filter(e=>e.n===3&&e.l===2);
        const usedCounts={}; dIndices.forEach(e=>usedCounts[e.m]=(usedCounts[e.m]||0)+1);
        let targetM=null;
        for(const m of [-2,-1,0,1,2]){ if(!usedCounts[m]){ targetM=m; break; } }
        if(targetM===null){ for(const m of [-2,-1,0,1,2]){ if(usedCounts[m]===1){ targetM=m; break; } } }
        const targetMFinal = (targetM===null || targetM===undefined) ? 0 : targetM;
        seq.push({n:3,l:2,m:targetMFinal,s:+0.5,label:'3d'});
        if(symbol==="Cu"){
          const countM={}; seq.filter(e=>e.n===3&&e.l===2).forEach(e=>countM[e.m]=(countM[e.m]||0)+1);
          const found = [-2,-1,0,1,2].find(m=>(countM[m]||0)===1);
          const pairM = (found===undefined || found===null) ? 0 : found;
          seq.push({n:3,l:2,m:pairM,s:-0.5,label:'3d'});
        }
      }
    }
    return seq;
  }
  function applyOverrides(symbol, seq){
    function moveElectrons(fromN, fromL, count, toN, toL){
      let removed=0;
      for(let i=seq.length-1;i>=0 && removed<count;i--){
        const e=seq[i];
        if(e.n===fromN && e.l===fromL){ seq.splice(i,1); removed++; }
      }
      const existing = seq.filter(e=> e.n===toN && e.l===toL);
      const usedCounts={}; existing.forEach(e=> usedCounts[e.m]=(usedCounts[e.m]||0)+1);
      function nextM(){
        for(const m of Array.from({length:(2*toL+1)},(_,i)=> i-toL)){
          if(!usedCounts[m]) return m;
        }
        for(const m of Array.from({length:(2*toL+1)},(_,i)=> i-toL)){
          if(usedCounts[m]===1) return m;
        }
        return 0;
      }
      for(let k=0;k<count;k++){
        const m = nextM(); usedCounts[m]=(usedCounts[m]||0)+1;
        seq.push({ n:toN, l:toL, m, s:+0.5, label: `${toN}${['s','p','d','f'][toL]}` });
      }
      return seq;
    }
    switch(symbol){
      case 'Nb': return moveElectrons(5,0,1,4,2);
      case 'Mo': return moveElectrons(5,0,1,4,2);
      case 'Ru': return moveElectrons(5,0,1,4,2);
      case 'Rh': return moveElectrons(5,0,1,4,2);
      case 'Pd': return moveElectrons(5,0,2,4,2);
      case 'Ag': return moveElectrons(5,0,1,4,2);
      case 'Pt': return moveElectrons(6,0,1,5,2);
      case 'Au': return moveElectrons(6,0,1,5,2);
      default: return seq;
    }
  }
  return applyOverrides(symbols[Z], applyException(symbols[Z],seq))
}

let currentZ=10;let playTimer=null;let seq=[];let stepIndex=0;
function onElementPicked(z){currentZ=z;document.getElementById('explain').textContent=`已选择元素 ${symbols[z]}（原子序数 Z=${z}）。点击“开始演示”按构造原理与洪特规则进行电子填充；3D 将展示对应轨道的等密度体渲染。`;resetDemo(); setTableHighlightByZ(z)}
function resetDemo(){seq=fillSequence(currentZ);stepIndex=0;activeOrbitals=[];updateVolumeUniforms();svg.selectAll('.electron').remove();updateQuantumInfo(null);ArrowState.clearAll(); clearGeometryOrbitals(); }
// 清理几何轨道可视化
function clearVisualization(){ clearGeometryOrbitals(); }
function updateQuantumInfo(e){
  const set=(id,val)=>{
    const el = document.getElementById(id);
    if(!el) return;
    const display = (val===undefined || val===null) ? '-' : val;
    el.textContent = display;
  };
  if(!e){set('q_n','-');set('q_l','-');set('q_orb','-');set('q_s','-');return}
  set('q_n',e.n);
  set('q_l',['s','p','d','f'][e.l]+`(${e.l})`);
  set('q_orb', `${e.n}${['s','p','d','f'][e.l]}`);
  set('q_s',e.s>0?'↑ +1/2':'↓ -1/2');
  document.getElementById('explain').innerHTML=`当前填充：${e.label} 轨道的电子。<br> - 构造原理：按 n+l 最小先填充，若相等按较小 n 优先。<br> - 洪特规则：同一亚层的各个磁量子数 m 对应的轨道，先单占且自旋平行（↑），再成对填充（↓）。<br> - Pauli 不相容：同一轨道最多容纳两个电子，且自旋必须相反。`}
function drawElectron(e){const node=chart.find(d=>d.n===e.n&&d.l===e.l);if(!node)return;const dx=(e.m)*6;const dy=e.s>0?-6:6;levelG.append('circle').attr('class','electron').attr('cx',node.x+dx).attr('cy',node.y+dy).attr('r',3.2).attr('fill',e.s>0?'#ffd166':'#06d6a0').attr('stroke','#0b0f1a').attr('stroke-width',0.8).attr('opacity',0.0).transition().duration(250).attr('opacity',1.0)}
function stepOnce(){if(stepIndex>=seq.length){return}const e=seq[stepIndex++];drawElectron(e);addOrbitalOverlay(e.n,e.l,e.m);updateQuantumInfo(e);ArrowState.activateForEnergy(e)}
function play(){
  if(playTimer) return;
  playTimer=setInterval(()=>{
    if(stepIndex>=seq.length){
      if(elementQueue && elementQueue.length){
        const next = elementQueue.shift();
        onElementPicked(next);
      } else { pause(); }
      return;
    }
    stepOnce();
  }, 360);
}
function pause(){clearInterval(playTimer);playTimer=null}

document.getElementById('btnStart').addEventListener('click',()=>{ demoLockedHighlight=true; setTableHighlightByZ(currentZ); resetDemo(); play() });
document.getElementById('btnStep').addEventListener('click',()=>{if(!playTimer)stepOnce()});
document.getElementById('btnPause').addEventListener('click',pause);
document.getElementById('btnReset').addEventListener('click',()=>{ demoLockedHighlight=false; resetDemo(); });
document.getElementById('caseCr')?.addEventListener('click',()=>onElementPicked(24));
document.getElementById('caseCu')?.addEventListener('click',()=>onElementPicked(29));

let last=performance.now();
function loop(now){
  const dt=now-last;last=now;
  controls.update();
  axisLabelSprites.forEach(s=> s.quaternion.copy(camera.quaternion));
  axes.quaternion.copy(geomOrbitalGroup.quaternion);
  for(let i=0;i<axisLabelInfo.length;i++){
    const info = axisLabelInfo[i];
    const dir = info.baseDir.clone().applyQuaternion(axes.quaternion);
    const offset = dir.clone().normalize().multiplyScalar(axisLen + 0.25);
    info.sprite.position.copy(offset);
  }
  volumeMat.uniforms.uTime.value=now*0.001;
  // 自动旋转功能已移除
  if(axisRotActive){
    const t = Math.min(1, (now - axisRotStart) / axisRotDuration);
    const ease = t<0.5 ? 2*t*t : -1+(4-2*t)*t;
    geomOrbitalGroup.quaternion.slerpQuaternions(axisRotFromQuat, axisRotToQuat, ease);
    if(t>=1){ axisRotActive=false; }
  } else {
    axisContinuousRotate();
  }
  if(resetRotActive){
    const t = Math.min(1, (now - resetRotStart) / resetRotDuration);
    const ease = t<0.5 ? 2*t*t : -1+(4-2*t)*t;
    geomOrbitalGroup.quaternion.slerpQuaternions(resetRotFromQuat, resetRotToQuat, ease);
    if(t>=1){ resetRotActive=false; geomOrbitalGroup.rotation.set(0,0,0); }
  }
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
onElementPicked(10);

// 开发测试：验证箭头与能级线颜色变化的同步性（中文注释）
function __pairForEnergyLabel(label){
  switch(label){
    case '1s': return ['1s','leftBound'];
    case '2s': return ['2s','leftBound'];
    case '3s': return ['2p','3s'];
    case '4s': return ['3p','4s'];
    case '5s': return ['4p','5s'];
    case '6s': return ['5p','6s'];
    case '7p': return ['6d','7p'];
    default: return null;
  }
}
function runArrowSyncTest(){
  const series = ['1s','2s','3s','4s','5s','6s','7p'];
  let i=0;
  function step(){
    if(i>=series.length){ console.log('[测试] 箭头同步测试完成'); return; }
    const lab = series[i++];
    const e = { n: parseInt(lab,10), l: lab.endsWith('p')?1:0 };
    ArrowState.activateForEnergy(e);
    const pair = __pairForEnergyLabel(lab);
    if(pair){
      const [from,to] = pair;
      const el = svg.selectAll('.arrows path').filter(function(){ return this.getAttribute('data-from')===from && this.getAttribute('data-to')===to; }).node();
      setTimeout(()=>{
        if(el){
          const cs = window.getComputedStyle(el);
          console.assert(cs.stroke === 'rgb(255, 255, 255)', `[测试] ${lab} 线条未变白`);
        }
      }, 280);
    }
    setTimeout(step, 360);
  }
  step();
}
if(localStorage.getItem('testArrowSync')==='1') setTimeout(runArrowSyncTest, 600);

// 周期表点击选择（支持单选/多选）
function onPeriodicCellClick(z, cell){
  if(!multiSelect){
    const already = cell.classList.contains('selected');
    if(already){
      ptableCells.forEach(c=> { c.classList.remove('selected'); c.setAttribute('aria-selected','false'); });
      selectedElements=[]; elementQueue=[]; stepIndex=0;
      pause();
      svg.selectAll('.electron').remove();
      clearGeometryOrbitals();
      updateQuantumInfo(null);
      document.getElementById('explain').textContent = '已取消选择。请在周期表中点击元素开始演示。';
      return;
    }
    selectedElements=[]; elementQueue=[];
    onElementPicked(z);
    highlightSingle(cell);
  } else {
    const idx = selectedElements.indexOf(z);
    if(idx>=0){ selectedElements.splice(idx,1); } else { selectedElements.push(z); }
    elementQueue = selectedElements.slice();
    updateSelectionVisual();
  }
}
function updateSelectionVisual(){
  ptableCells.forEach(c=>{
    const z = parseInt(c.dataset.z,10);
    const sel = selectedElements.includes(z);
    c.classList.toggle('selected', sel);
    c.setAttribute('aria-selected', sel ? 'true' : 'false');
  });
}
function highlightSingle(cell){
  ptableCells.forEach(c=> { c.classList.remove('selected'); c.setAttribute('aria-selected','false'); });
  cell.classList.add('selected');
  cell.setAttribute('aria-selected','true');
}
function setTableHighlightByZ(z){
  const cell = ptableCells.find(c=> parseInt(c.dataset.z,10)===z);
  if(cell){ highlightSingle(cell); }
}
// 叠加选择控件与相关逻辑已移除，保留单轨道显示