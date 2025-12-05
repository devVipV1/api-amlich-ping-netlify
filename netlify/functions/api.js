import express from "express";
import serverless from "serverless-http";

const app = express();

/* =============================
   📌 HÀM TÍNH ÂM LỊCH CHUẨN VN
==============================*/

function jdFromDate(dd, mm, yy) {
  let a = Math.floor((14 - mm) / 12);
  let y = yy + 4800 - a;
  let m = mm + 12 * a - 3;
  return (
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function getNewMoonDay(k, timeZone) {
  const PI = Math.PI;
  let T = k / 1236.85;
  let T2 = T * T;
  let T3 = T2 * T;
  let dr = PI / 180;

  let Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3;

  Jd1 +=
    0.00033 *
    Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

  let M =
    359.2242 +
    29.10535608 * k -
    0.0000333 * T2 -
    0.00000347 * T3;
  let Mpr =
    306.0253 +
    385.81691806 * k +
    0.0107306 * T2 +
    0.00001236 * T3;
  let F =
    21.2964 +
    390.67050646 * k -
    0.0016528 * T2 -
    0.00000239 * T3;

  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * M * dr) -
    0.4068 * Math.sin(Mpr * dr) +
    0.0161 * Math.sin(2 * Mpr * dr) -
    0.0004 * Math.sin(3 * Mpr * dr) +
    0.0104 * Math.sin(2 * F * dr) -
    0.0051 * Math.sin((M + Mpr) * dr) -
    0.0074 * Math.sin((M - Mpr) * dr) +
    0.0004 * Math.sin((2 * F + M) * dr) -
    0.0004 * Math.sin((2 * F - M) * dr) -
    0.0006 * Math.sin((2 * F + Mpr) * dr) +
    0.001 * Math.sin((2 * F - Mpr) * dr) +
    0.0005 * Math.sin((2 * Mpr + M) * dr);

  let JdNew = Jd1 + C1;
  return Math.floor(JdNew + 0.5 + timeZone / 24);
}

function getSunLongitude(jdn, timeZone) {
  const PI = Math.PI;
  let T = (jdn - 2451545.5 - timeZone / 24) / 36525;
  let T2 = T * T;
  let dr = PI / 180;

  let M =
    357.5291 +
    35999.0503 * T -
    0.0001559 * T2 -
    0.00000048 * T * T2;

  let L0 =
    280.46645 +
    36000.76983 * T +
    0.0003032 * T2;

  let DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) +
    0.00029 * Math.sin(3 * M * dr);

  let L = (L0 + DL) * dr;
  L = L - Math.floor(L / (2 * PI)) * 2 * PI;

  return Math.floor((L / PI) * 6);
}

function getLunarMonth11(yy, timeZone) {
  let off = jdFromDate(31, 12, yy) - 2415021.076998695;
  let k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  let sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) nm = getNewMoonDay(k - 1, timeZone);
  return nm;
}

function getLeapMonthOffset(a11, timeZone) {
  let k = Math.floor((a11 - 2415021.076998695) / 29.530588853);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);

  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);

  return i - 1;
}

function solarToLunar(dd, mm, yy, timeZone = 7) {
  let dayNumber = jdFromDate(dd, mm, yy);
  let k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);

  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k, timeZone);

  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = getLunarMonth11(yy + 1, timeZone);

  let lunarYear = yy;
  if (a11 > monthStart) lunarYear = yy - 1;

  let lunarDay = dayNumber - monthStart + 1;
  let diff = Math.floor((monthStart - a11) / 29);
  let lunarMonth = diff + 11;

  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear--;

  return { day: lunarDay, month: lunarMonth, year: lunarYear };
}

/* =============================
   📌 /home
==============================*/
app.get("/home", (req, res) => {
  res.json({
    api: "API Âm Lịch + Ping",
    author: "fsdfsdf",
    endpoints: {
      "/amlich": "Lấy ngày âm lịch hiện tại",
      "/ping?url=https://example.com": "Kiểm tra website online/offline"
    }
  });
});

/* =============================
   📌 /amlich
==============================*/
app.get("/amlich", (req, res) => {
  const now = new Date();
  const lunar = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear(), 7);

  res.json({
    status: "success",
    solar_date: `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
    lunar_date: `${lunar.day}/${lunar.month}/${lunar.year}`,
    time: now.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
  });
});

/* =============================
   📌 /ping
==============================*/
app.get("/ping", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl)
    return res.status(400).json({ error: "Thiếu ?url=" });

  try {
    const response = await fetch(targetUrl);
    res.json({
      status: "online",
      code: response.status,
    });
  } catch (err) {
    res.json({
      status: "offline",
      message: err.message
    });
  }
});

export const handler = serverless(app);
