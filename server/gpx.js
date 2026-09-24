// Lectura de tracks GPX: distancia, desnivel, perfil y subidas principales.

function haversine(a, b) {
  const R = 6371000, toR = x => x * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLon = toR(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function parseGpx(xml) {
  const pts = [];
  // trkpt o rtept, con atributos en cualquier orden
  const re = /<(?:\w+:)?(?:trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?(?:trkpt|rtept)>/g;
  let m;
  while ((m = re.exec(xml))) {
    const lat = parseFloat((m[1].match(/lat\s*=\s*["']([^"']+)/) || [])[1]);
    const lon = parseFloat((m[1].match(/lon\s*=\s*["']([^"']+)/) || [])[1]);
    const ele = parseFloat((m[2].match(/<(?:\w+:)?ele>([^<]+)</) || [])[1]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push({ lat, lon, ele: Number.isFinite(ele) ? ele : null });
  }
  if (pts.length < 2) throw new Error('El GPX no contiene puntos de track válidos');
  const name = (xml.match(/<name>([^<]{1,120})<\/name>/) || [])[1]?.trim() || null;

  // Distancia acumulada
  let dist = 0; pts[0].d = 0;
  for (let i = 1; i < pts.length; i++) { dist += haversine(pts[i - 1], pts[i]); pts[i].d = dist; }

  // Rellenar elevaciones que falten
  let last = pts.find(p => p.ele != null)?.ele ?? 0;
  for (const p of pts) { if (p.ele == null) p.ele = last; else last = p.ele; }

  // Suavizado por distancia (ventana ~100 m) y desnivel con histéresis de 4 m
  const sm = smooth(pts, 100);
  let up = 0, down = 0, ref = sm[0];
  for (const e of sm) {
    if (e - ref >= 4) { up += e - ref; ref = e; }
    else if (ref - e >= 4) { down += ref - e; ref = e; }
  }

  // Perfil cada ~200 m (máx 1500 puntos)
  const step = Math.max(200, dist / 1500);
  const profile = []; let next = 0;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].d >= next || i === pts.length - 1) { profile.push([+(pts[i].d / 1000).toFixed(2), Math.round(sm[i])]); next += step; }
  }

  return {
    name,
    distance_km: +(dist / 1000).toFixed(1),
    dplus_m: Math.round(up), dminus_m: Math.round(down),
    profile, climbs: findClimbs(profile),
    points: pts.length,
  };
}

function smooth(pts, win) {
  const out = new Array(pts.length); let a = 0, b = 0, sum = 0;
  for (let i = 0; i < pts.length; i++) {
    while (b < pts.length && pts[b].d - pts[i].d <= win / 2) { sum += pts[b].ele; b++; }
    while (pts[i].d - pts[a].d > win / 2) { sum -= pts[a].ele; a++; }
    out[i] = sum / (b - a);
  }
  return out;
}

// Subidas y bajadas de más de 300 m (tolerando contrapendientes de 40 m)
export function findClimbs(profile, minGain = 300) {
  const res = [];
  const scan = (dir) => {
    let i = 0;
    while (i < profile.length - 1) {
      let startIdx = i, extIdx = i, j = i + 1;
      while (j < profile.length) {
        const ext = profile[extIdx][1], e = profile[j][1];
        if ((e - ext) * dir > 0) extIdx = j;
        else if ((ext - e) * dir > 40) break;
        j++;
      }
      // Ajustar el inicio al punto más bajo (o más alto) antes del extremo
      for (let k = startIdx; k < extIdx; k++) if ((profile[k][1] - profile[startIdx][1]) * dir < 0) startIdx = k;
      const gain = (profile[extIdx][1] - profile[startIdx][1]) * dir;
      if (gain >= minGain) {
        const km = profile[extIdx][0] - profile[startIdx][0];
        res.push({ kind: dir > 0 ? 'subida' : 'bajada', from_km: profile[startIdx][0], to_km: profile[extIdx][0],
          gain_m: Math.round(gain), length_km: +km.toFixed(1), grade: km > 0 ? Math.round(gain / (km * 10)) : 0,
          top_m: Math.round(Math.max(profile[startIdx][1], profile[extIdx][1])) });
      }
      i = Math.max(extIdx, i + 1);
    }
  };
  scan(1); scan(-1);
  return res.sort((a, b) => a.from_km - b.from_km);
}
