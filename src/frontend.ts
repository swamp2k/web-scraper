export const FRONTEND_HTML = `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Web Scraper</title>
<style>
:root{color-scheme:dark;--bg:#0d1016;--panel:#161b24;--line:#2a3241;--text:#edf1f7;--muted:#98a2b3;--accent:#d9ff52}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px system-ui,sans-serif}.wrap{max-width:1100px;margin:auto;padding:32px 20px}h1{margin:0 0 6px;font-size:32px}.muted{color:var(--muted)}.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px;margin-top:20px}.row{display:flex;gap:10px;flex-wrap:wrap}input,button{border:1px solid var(--line);border-radius:8px;padding:11px 12px;font:inherit}input{background:#10151d;color:var(--text)}#url{flex:1;min-width:280px}#pages{width:90px}button{background:var(--accent);color:#111;font-weight:700;cursor:pointer}button:disabled{opacity:.5}.status{margin-top:12px;color:var(--muted)}table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}th,td{padding:9px 8px;border-bottom:1px solid var(--line);text-align:left}th{color:var(--muted);font-weight:600}a{color:var(--accent)}.scroll{overflow:auto}.pill{display:inline-block;padding:3px 7px;border:1px solid var(--line);border-radius:999px;color:var(--muted)}
</style>
</head>
<body><main class="wrap">
<h1>Web Scraper</h1><div class="muted">Bilbasen + 123mc. Flere adapters kan tilføjes senere.</div>
<section class="card"><div class="row"><input id="url" placeholder="Indsæt en Bilbasen- eller 123mc-søge-URL"><input id="pages" type="number" min="1" max="250" value="10" title="Maks sider"><button id="go">Scrape</button></div><div id="status" class="status">Klar.</div></section>
<section id="results" class="card" hidden><div id="summary"></div><div class="scroll"><table><thead><tr><th>Titel</th><th>Pris</th><th>År</th><th>Km</th><th>Område</th><th>Sælger</th><th></th></tr></thead><tbody id="body"></tbody></table></div></section>
</main><script>
const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
$('go').onclick=async()=>{const url=$('url').value.trim();if(!url)return;const maxPages=Math.max(1,parseInt($('pages').value)||10);$('go').disabled=true;$('status').textContent='Henter…';$('results').hidden=true;try{const r=await fetch('/api/scrape?url='+encodeURIComponent(url)+'&maxPages='+maxPages);const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Ukendt fejl');$('status').textContent='Færdig.';$('summary').innerHTML='<strong>'+esc(d.listings.length)+'</strong> resultater · <span class="pill">'+esc(d.source)+'</span> · '+esc(d.pagesFetched)+' sider'+(d.totalListings?' · '+esc(d.totalListings)+' i alt':'');$('body').innerHTML=d.listings.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.priceText??x.price??'')+'</td><td>'+esc(x.year??'')+'</td><td>'+esc(x.mileageKm?.toLocaleString('da-DK')??'')+'</td><td>'+esc(x.location??'')+'</td><td>'+esc(x.sellerType??x.dealer??'')+'</td><td><a target="_blank" rel="noopener" href="'+esc(x.url)+'">Åbn</a></td></tr>').join('');$('results').hidden=false}catch(e){$('status').textContent='Fejl: '+e.message}finally{$('go').disabled=false}};
</script></body></html>`;
