define(['knockout'], function (ko) {

  function roundRate(val) {
    const rate = Number(val) || 0;
    const clamped = Math.max(0, Math.min(5, rate));
    const rounded = Math.round(clamped * 4) / 4; // 0.25 steps

    const intPart = Math.floor(rounded);
    const decPart = +(rounded - intPart).toFixed(2);

    return { rounded, intPart, decPart };
  }

  function ratePercent(val, min = null) {
    const r = roundRate(val).rounded;
    var p = ((r / 5) * 100);
    if (min) p = p - 4;
    return p.toFixed(0) + '%';
  }

  function rateText(val) {
    const r = roundRate(val).rounded;
    // keep up to 2 decimals but remove trailing zeros
    return r.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  function eachStarRate(reviews) {
    // FIX: handle null/undefined safely
    reviews = Array.isArray(reviews) ? reviews : [];

    var counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    var percent = { 1: "0%", 2: "0%", 3: "0%", 4: "0%", 5: "0%" };
    var total = 0;

    for (const r of reviews) {
      const rate = Math.round(Number(r.rating));
      if (!Number.isFinite(rate) || rate < 1 || rate > 5) continue;

      counts[rate] += 1;
      total += 1;
    }

    for (var i = 1; i <= 5; i++) {
      percent[i] = total ? ((counts[i] / total) * 100).toFixed(0) + "%" : "0%";
    }
    return { counts, percent, total };
  }


  function formatDate(s) {
    const clean = String(s).replace(" ", "T").replace(/\.\d+$/, "");
    const d = new Date(clean);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  return {
    roundRate,
    ratePercent,
    rateText,
    eachStarRate,
    formatDate
  };
});
