export const CITIES = [
  { nameHe:'תל אביב', nameEn:'Tel Aviv', lat:32.0853, lng:34.7818 },
  { nameHe:'תל אביב - מרכז העיר', nameEn:'Tel Aviv Center', lat:32.0809, lng:34.7750 },
  { nameHe:'ירושלים', nameEn:'Jerusalem', lat:31.7683, lng:35.2137 },
  { nameHe:'חיפה', nameEn:'Haifa', lat:32.7940, lng:34.9896 },
  { nameHe:'באר שבע', nameEn:'Beer Sheva', lat:31.2518, lng:34.7913 },
  { nameHe:'אשדוד', nameEn:'Ashdod', lat:31.7923, lng:34.6496 },
  { nameHe:'אשקלון', nameEn:'Ashkelon', lat:31.6688, lng:34.5716 },
  { nameHe:'רמת גן', nameEn:'Ramat Gan', lat:32.0824, lng:34.8106 },
  { nameHe:'בני ברק', nameEn:'Bnei Brak', lat:32.0940, lng:34.8288 },
  { nameHe:'חולון', nameEn:'Holon', lat:32.0117, lng:34.7741 },
  { nameHe:'בת ים', nameEn:'Bat Yam', lat:32.0157, lng:34.7571 },
  { nameHe:'פתח תקווה', nameEn:'Petah Tikva', lat:32.0878, lng:34.8878 },
  { nameHe:'נתניה', nameEn:'Netanya', lat:32.3328, lng:34.8597 },
  { nameHe:'הרצליה', nameEn:'Herzliya', lat:32.1624, lng:34.8442 },
  { nameHe:'כפר סבא', nameEn:'Kfar Saba', lat:32.1769, lng:34.9105 },
  { nameHe:'רחובות', nameEn:'Rehovot', lat:31.8951, lng:34.8085 },
  { nameHe:'מודיעין', nameEn:"Modi'in", lat:31.8950, lng:35.0081 },
  { nameHe:'אילת', nameEn:'Eilat', lat:29.5581, lng:34.9482 },
  { nameHe:'עכו', nameEn:'Acre', lat:32.9279, lng:35.0833 },
  { nameHe:'נהריה', nameEn:'Nahariya', lat:33.0078, lng:35.0943 },
  { nameHe:'טבריה', nameEn:'Tiberias', lat:32.7944, lng:35.5294 },
  { nameHe:'חדרה', nameEn:'Hadera', lat:32.4340, lng:34.9156 },
  { nameHe:'ראשון לציון', nameEn:'Rishon LeZion', lat:31.9730, lng:34.7925 },
  { nameHe:'שדרות', nameEn:'Sderot', lat:31.5242, lng:34.6068 },
  { nameHe:'רעננה', nameEn:"Ra'anana", lat:32.1845, lng:34.8697 },
  { nameHe:'הוד השרון', nameEn:'Hod HaSharon', lat:32.1498, lng:34.8880 },
  { nameHe:'עפולה', nameEn:'Afula', lat:32.6068, lng:35.2895 },
  { nameHe:'קרית שמונה', nameEn:'Kiryat Shmona', lat:33.2086, lng:35.5699 },
  { nameHe:'קרמial', nameEn:'Karmiel', lat:32.9185, lng:35.2942 },
  { nameHe:'דימונה', nameEn:'Dimona', lat:31.0701, lng:35.0210 },
  { nameHe:'גבעתיים', nameEn:'Givatayim', lat:32.0737, lng:34.8052 },
  { nameHe:'נס ציונה', nameEn:'Nes Ziona', lat:31.9293, lng:34.7678 },
  { nameHe:'יבנה', nameEn:'Yavne', lat:31.8780, lng:34.7348 },
  { nameHe:'לוד', nameEn:'Lod', lat:31.9514, lng:34.8977 },
  { nameHe:'רמלה', nameEn:'Ramla', lat:31.9296, lng:34.8660 },
  { nameHe:'נתיבות', nameEn:'Netivot', lat:31.4192, lng:34.6016 },
  { nameHe:'גן יבנה', nameEn:'Gan Yavne', lat:31.8364, lng:34.7158 },
];

export function findCity(s) {
  if (!s) return null;
  const t = s.trim();
  const ex = CITIES.find(c => c.nameHe === t);
  if (ex) return ex;
  let best = null, bl = 0;
  for (const c of CITIES) { if (t.startsWith(c.nameHe) && c.nameHe.length > bl) { best = c; bl = c.nameHe.length; } }
  if (best) return best;
  for (const c of CITIES) { if (t.includes(c.nameHe)) return c; }
  return null;
}
