
const routes=[{"id": "A", "area": "安南・永康", "duration": 45, "arrival": "07:00", "stops": [{"time": "06:15", "name": "川億傢俱行", "address": "臺南市安南區海佃路二段394號", "km": 15, "fare": 90, "note": "對面上車"}, {"time": "06:16", "name": "台灣中油千越海佃加油站", "address": "臺南市安南區海佃路二段5號", "km": 14, "fare": 84, "note": "車長站點"}, {"time": "06:22", "name": "安和路金玉堂旁7-11", "address": "臺南市安南區安和路一段105號1樓", "km": 12, "fare": 72, "note": ""}, {"time": "06:26", "name": "台電台南區配電中心", "address": "臺南市永康區中正南路198號", "km": 11, "fare": 66, "note": ""}, {"time": "06:32", "name": "璨麟眼科診所", "address": "臺南市永康區中正北路30號", "km": 9, "fare": 54, "note": ""}, {"time": "06:41", "name": "福懋永康加油站", "address": "臺南市永康區中正路342號", "km": 9, "fare": 54, "note": "對面上車"}, {"time": "06:44", "name": "南大附中", "address": "臺南市永康區南大附中", "km": 9, "fare": 54, "note": "YouBike前上車；PDF門牌範圍待確認"}]}, {"id": "B", "area": "湖內・仁德・東區", "duration": 55, "arrival": "07:10", "stops": [{"time": "06:15", "name": "湖內國中", "address": "高雄市湖內區中山路二段63號", "km": 19, "fare": 114, "note": "車長站點"}, {"time": "06:19", "name": "文賢國中前7-11", "address": "臺南市仁德區中正路一段209號", "km": 17, "fare": 102, "note": ""}, {"time": "06:23", "name": "老陳檳榔", "address": "臺南市仁德區中正路一段696號", "km": 15, "fare": 90, "note": ""}, {"time": "06:25", "name": "德南國小", "address": "臺南市仁德區德南國小", "km": 14, "fare": 84, "note": "PDF地址與其他站重複，精確門牌待確認"}, {"time": "06:27", "name": "仁德基督教會", "address": "臺南市仁德區中正路二段389號", "km": 14, "fare": 84, "note": ""}, {"time": "06:32", "name": "第一分局", "address": "臺南市東區崇善路740號1樓", "km": 9, "fare": 54, "note": ""}, {"time": "06:33", "name": "崇善路665號（山葉機車）", "address": "臺南市東區崇善路665號", "km": 9, "fare": 54, "note": ""}, {"time": "06:36", "name": "崇善路與中華東路口安全帽店", "address": "臺南市東區崇善路291號", "km": 9, "fare": 54, "note": ""}, {"time": "06:39", "name": "關帝廳對面中國信託", "address": "臺南市東區中華東路二段195號", "km": 9, "fare": 54, "note": ""}, {"time": "06:41", "name": "我家牛排（裕農路580號）", "address": "臺南市東區裕農路580號", "km": 9, "fare": 54, "note": "門牌依圖片採580號；修正版PDF地址仍為578號，請向學校確認"}, {"time": "06:47", "name": "裕文國小", "address": "臺南市東區裕文路301號 裕信路側", "km": 9, "fare": 54, "note": "裕信路上車；修正版PDF列校址為裕文路301號，請確認上車側"}]}];

const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allStops=routes.flatMap(r=>r.stops.map((s,i)=>({...s,route:r.id,key:r.id+'-'+i})));
let chosen='all',origin=null,located=[],busy=false,lastRequest=0,map=null,layers=null,lookupFailures=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function distance(a,b){const rad=x=>x*Math.PI/180,p=rad(b.lat-a.lat),q=rad(b.lon-a.lon),v=Math.sin(p/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(q/2)**2;return 6371000*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)))}
function inRegion(p){return Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=22.7&&p.lat<=23.5&&p.lon>=120&&p.lon<=120.7}
function normalize(s){return String(s).normalize('NFKC').replace(/台/g,'臺').replace(/傢/g,'家').replace(/[\s，,、（）()\-]/g,'').toLowerCase()}
function early(t){const [h,m]=t.split(':').map(Number),v=h*60+m-5;return String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0')}
function setStatus(s){$('status').textContent=s}
function setBusy(b){busy=b;$('searchButton').disabled=b;$('searchButton').textContent=b?'正在比較地圖位置…':'定位地址並比較附近站點';document.querySelectorAll('[data-route],[data-query],#clear,#district,#radius,#provider').forEach(el=>el.disabled=b)}
async function geocode(q){
 const elapsed=Date.now()-lastRequest;if(elapsed<1150)await delay(1150-elapsed);lastRequest=Date.now();
 const provider=$('provider').value;const url=new URL(provider==='nominatim'?'https://nominatim.openstreetmap.org/search':'https://photon.komoot.io/api/');
 url.searchParams.set('q',q);url.searchParams.set('limit','5');
 if(provider==='nominatim'){url.searchParams.set('format','jsonv2');url.searchParams.set('countrycodes','tw');url.searchParams.set('addressdetails','1');url.searchParams.set('viewbox','120,23.5,120.7,22.7');url.searchParams.set('bounded','1')}
 else{url.searchParams.set('bbox','120,22.7,120.7,23.5');url.searchParams.set('lat','23');url.searchParams.set('lon','120.25')}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);let data;
 try{const response=await fetch(url,{signal:controller.signal,credentials:'omit'});if(!response.ok)throw Error('地圖定位服務回應 '+response.status);data=await response.json()}finally{clearTimeout(timer)}
 let candidates;
 if(provider==='nominatim')candidates=data.map(f=>({lat:Number(f.lat),lon:Number(f.lon),label:f.display_name,name:f.name||f.address?.amenity||f.address?.school||'',street:f.address?.road||'',house:f.address?.house_number||'',district:f.address?.city_district||f.address?.town||f.address?.suburb||'',precise:!!f.address?.house_number||['amenity','shop','office','tourism','leisure'].includes(f.category)||['school','fuel','restaurant'].includes(f.type),source:provider}));
 else candidates=(data.features||[]).map(f=>{const p=f.properties||{};return {lat:Number(f.geometry.coordinates[1]),lon:Number(f.geometry.coordinates[0]),label:[p.country,p.state,p.city,p.district,p.street,p.housenumber,p.name].filter(Boolean).join(' '),name:p.name||'',street:p.street||'',house:p.housenumber||'',district:p.district||p.city||'',precise:!!p.housenumber||['amenity','shop','office','tourism','leisure'].includes(p.osm_key),source:provider}});
 return candidates.filter(inRegion).filter((v,i,a)=>a.findIndex(x=>Math.abs(x.lat-v.lat)<0.00001&&Math.abs(x.lon-v.lon)<0.00001)===i);
}
function readCache(){try{return JSON.parse(localStorage.getItem('dawuan-public-stops-v1')||'{}')}catch{return {}}}
function writeCache(data){try{localStorage.setItem('dawuan-public-stops-v1',JSON.stringify(data))}catch{}}
function stationQuery(s){if(s.name==='南大附中')return '臺南市永康區 國立臺南大學附屬高級中學';if(s.name==='德南國小')return '臺南市仁德區 德南國小';if(s.name==='裕文國小')return '臺南市東區 裕文國小';return s.address.replace(/1樓/g,'')}
function validStation(s,p){
 const district=s.address.match(/([^市縣]{1,3}區)/)?.[0];if(district&&!normalize(p.label).includes(normalize(district)))return false;
 const road=s.address.match(/區(.+?(?:路|街))/)?.[1];
 if(road&&!normalize(p.label).includes(normalize(road)))return false;
 const house=s.address.match(/(?:路|街)(?:[一二三四五六七八九十0-9]+段)?([0-9]+)號/)?.[1];
 if(house&&p.house&&String(p.house)!==house)return false;
 if(!road){const names=s.name==='南大附中'?['臺南大學附屬高級中學','南大附中']:[s.name];if(!names.some(n=>normalize(p.name||p.label).includes(normalize(n))))return false}
 // A street or district centroid must never become a supposedly precise stop.
 return p.precise;
}
async function locateStations(){
 const cache=readCache();located=[];lookupFailures=[];let errors=0;
 for(let i=0;i<allStops.length;i++){
  const s=allStops[i],q=stationQuery(s),key=$('provider').value+':'+q,cached=cache[key];
  setStatus('正在定位校車站點 '+(i+1)+' / '+allStops.length+'：'+s.name+'。第一次查詢需較久，已定位的站點會快取。');
  let p=cached&&Date.now()-cached.saved<30*86400000&&inRegion(cached)&&validStation(s,cached)?cached:null;
  if(!p){try{const candidates=await geocode(q);p=candidates.find(x=>validStation(s,x));errors=0;if(p){cache[key]={...p,saved:Date.now()};writeCache(cache)}}catch(e){errors++;lookupFailures.push(s.name+'（定位服務暫時無法連線）');if(errors>=3){lookupFailures.push(...allStops.slice(i+1).map(x=>x.name+'（尚未定位）'));break}continue}}
  if(p)located.push({...s,...p,geoLabel:p.label});else lookupFailures.push(s.name+'（未取得可核對的門牌或地標座標）');
 }
}
function ensureMap(){
 if(map)return true;if(!window.L){$('mapUnavailable').hidden=false;return false}
 map=L.map('geoMap').setView([23,120.25],12);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);layers=L.layerGroup().addTo(map);
 let tileErrors=0;map.eachLayer(layer=>{if(layer.on&&layer._url)layer.on('tileerror',()=>{tileErrors++;if(tileErrors===3)$('mapUnavailable').hidden=false})});
 return true;
}
function drawMap(stops){
 if(!ensureMap())return;layers.clearLayers();const bounds=[];
 if(origin){L.circleMarker([origin.lat,origin.lon],{radius:10,color:'#d92344',fillOpacity:1}).bindPopup('<strong>你的出發位置</strong><br>'+escapeHTML(origin.label)).addTo(layers);bounds.push([origin.lat,origin.lon])}
 stops.forEach((s,i)=>{const color=s.route==='A'?'#175ec6':'#007c82';L.circleMarker([s.lat,s.lon],{radius:8,color,fillOpacity:.9}).bindPopup('<strong>'+(i+1)+'. '+s.route+' 線｜'+escapeHTML(s.name)+'</strong><br>'+s.time+' 上車<br>直線距離 '+formatDistance(s.distance)).addTo(layers);bounds.push([s.lat,s.lon])});
 if(bounds.length)map.fitBounds(bounds,{padding:[35,35],maxZoom:16});setTimeout(()=>map.invalidateSize(),50);
}
function formatDistance(m){return m<1000?Math.round(m)+' 公尺':(m/1000).toFixed(2)+' 公里'}
function walkingURL(s){return 'https://www.google.com/maps/dir/?api=1&origin='+origin.lat+','+origin.lon+'&destination='+s.lat+','+s.lon+'&travelmode=walking'}
function stationHTML(s,index){const nearby=origin&&s.distance!==undefined;return '<article class="stop"><div><div class="time">'+s.time+'</div><div class="arrive-early">'+early(s.time)+' 前到站</div></div><div><div class="station">'+(nearby?(index+1)+'. ':'')+escapeHTML(s.name)+'</div>'+(nearby?'<div class="distance-badge">'+s.route+' 線 · 直線距離 '+formatDistance(s.distance)+'</div>':'')+'<div class="address">'+escapeHTML(s.address)+'</div>'+(nearby?'<div class="small">地圖定位：'+escapeHTML(s.geoLabel)+'（自動定位，請核對上車側）</div>':'')+(s.note?'<div class="note">'+escapeHTML(s.note)+'</div>':'')+'<div class="stop-bottom"><span class="fare">單趟參考 '+s.fare+' 元 · '+s.km+' 公里</span><a class="map" target="_blank" rel="noopener noreferrer" href="'+(nearby?'https://www.google.com/maps/search/?api=1&query='+s.lat+','+s.lon:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s.address+' '+s.name))+'">查看上車位置</a>'+(nearby?'<a class="map" target="_blank" rel="noopener noreferrer" href="'+walkingURL(s)+'">查看實際步行路線 ↗</a>':'')+'</div></div></article>'}
function renderBrowse(){
 const district=$('district').value;const available=routes.filter(r=>chosen==='all'||r.id===chosen).map(r=>({...r,stops:r.stops.filter(s=>!district||s.address.includes(district))})).filter(r=>r.stops.length);
 $('count').textContent=available.reduce((n,r)=>n+r.stops.length,0)+' 站';$('resultTitle').textContent=chosen==='all'?'校車站點一覽':chosen+' 線上車站點';
 $('results').innerHTML=available.map(r=>'<section class="route-block"><div class="route-header '+(r.id==='B'?'b':'')+'"><h3>'+r.id+' 線 · '+r.area+'</h3><span>到校 '+r.arrival+'</span></div>'+r.stops.map((s,i)=>stationHTML(s,i)).join('')+'</section>').join('')||'<div class="empty">此路線沒有符合行政區的站點。請清除篩選條件。</div>';
 setStatus('輸入完整地址並按定位按鈕，確認地圖位置後，以座標距離比較附近站點。行政區選單只用於瀏覽站點。');
}
function renderNearby(){
 const radius=Number($('radius').value),district=$('district').value;
 const eligible=located.filter(s=>(chosen==='all'||chosen===s.route)&&(!district||s.address.includes(district))).map(s=>({...s,distance:distance(origin,s)})).sort((a,b)=>a.distance-b.distance);
 const nearby=eligible.filter(s=>!radius||s.distance<=radius).slice(0,5);
 $('resultTitle').textContent='依地圖距離排序的候選上車站';$('count').textContent=nearby.length+' 站';
 $('results').innerHTML=nearby.map(stationHTML).join('')||'<div class="empty"><h3>目前範圍內没有可比較的站點</h3><p>請調整搜尋範圍或清除行政區／路線條件。這不代表附近一定沒有校車。</p></div>';
 $('coverage').textContent='已定位 '+located.length+' / '+allStops.length+' 站。'+(lookupFailures.length?'未能定位：'+lookupFailures.join('、')+'。這些站點尚未納入距離排序。':'所有站點均已取得自動定位結果。')+'自動定位仍需核對實際候車點，尤其對面上車與校門側。';
 $('coverage').hidden=false;setStatus('以 '+escapeForText(origin.label)+' 為出發位置，顯示最多 5 個候選站，按直線距離排序。'+(radius?'搜尋範圍 '+formatDistance(radius)+'。':'顯示已定位站點中最近的候選站。')+'請點步行路線確認道路、可通行路徑與時間；直線距離不等於步行距離。');
 $('transitLink').href='https://www.google.com/maps/dir/?api=1&origin='+origin.lat+','+origin.lon+'&destination='+encodeURIComponent('臺南市立大灣高級中學')+'&travelmode=transit';
 drawMap(nearby);
}
function escapeForText(s){return String(s)}
function render(){document.querySelectorAll('[data-route]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.route===chosen)));origin?renderNearby():renderBrowse()}
async function confirmOrigin(p){
 if(busy)return;setBusy(true);origin=p;$('originCandidates').innerHTML='';$('originLabel').textContent='已選出發位置：'+p.label;$('originLabel').hidden=false;$('mapPanel').hidden=false;drawMap([]);
 try{await locateStations();render();if(!located.length)setStatus('尚未取得可核對的站點座標，無法提供距離建議。請切換定位服務後重試；你也可查看完整時刻表。');$('resultTitle').scrollIntoView({behavior:'smooth',block:'start'})}catch(e){setStatus('地圖比較失敗，請稍後重試。'+e.message)}finally{setBusy(false)}
}
async function searchAddress(){
 if(busy)return;const q=$('query').value.trim();if(!q){setStatus('請先輸入完整地址或附近明確地標。');$('query').focus();return}
 origin=null;$('originLabel').hidden=true;$('mapPanel').hidden=true;$('coverage').hidden=true;$('results').innerHTML='';$('count').textContent='—';$('originCandidates').innerHTML='';setBusy(true);setStatus('正在將地址轉成地圖座標，請稍候…');
 try{const candidates=await geocode(q);if(!candidates.length){setStatus('地圖服務未找到這個地址。請補上縣市、行政區與門牌，或輸入附近明確地標；本站不會改用文字比對冒充地圖結果。');return}
 $('originCandidates').innerHTML='<p><strong>請確認你的出發位置</strong></p>'+candidates.map((p,i)=>'<button type="button" class="location-choice" data-origin="'+i+'">'+escapeHTML(p.label)+'<span>'+(p.precise?'門牌／地標位置':'較廣泛的位置，請核對是否適合作為出發點')+'</span></button>').join('');
 $('originCandidates').querySelectorAll('[data-origin]').forEach(b=>b.onclick=()=>confirmOrigin(candidates[Number(b.dataset.origin)]));setStatus('已取得地圖位置。請在上方選擇符合的地址，再比較校車站點。');
 }catch(e){setStatus('地址定位暫時無法連線。請切換下方定位服務後再試。'+(e.name==='AbortError'?'（連線逾時）':'（'+e.message+'）'))}finally{setBusy(false)}
}
function reset(){if(busy)return;origin=null;chosen='all';$('query').value='';$('district').value='';$('originCandidates').innerHTML='';$('originLabel').hidden=true;$('mapPanel').hidden=true;$('coverage').hidden=true;render()}
$('searchForm').onsubmit=e=>{e.preventDefault();searchAddress()};
$('district').onchange=render;$('radius').onchange=()=>{if(origin)renderNearby()};
$('provider').onchange=()=>{origin=null;located=[];$('originCandidates').innerHTML='';$('originLabel').hidden=true;$('mapPanel').hidden=true;$('coverage').hidden=true;render()};
document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{chosen=b.dataset.route;render()});
document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{$('query').value='臺南市'+b.dataset.query;setStatus('已填入範例。請補上完整地址後按定位按鈕。');$('query').focus()});
$('clear').onclick=reset;
document.querySelectorAll('.originals img').forEach(img=>{img.dataset.src=img.getAttribute('src');img.removeAttribute('src')});
$('sourceDetails').addEventListener('toggle',function(){if(this.open)this.querySelectorAll('img[data-src]').forEach(img=>{img.src=img.dataset.src;delete img.dataset.src})});
render();
