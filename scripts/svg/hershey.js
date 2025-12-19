import { HERSHEY_ALPH, HERSHEY_DATA } from "./hersheyData.js";

function decodeGlyph(str) {
  const res = [];
  const spacing = str.charCodeAt(0) - 32;
  res.push(spacing);
  for (let i = 1; i < str.length; i++) {
    const ch = str[i];
    if (ch === "*") {
      res.push(-1, -1);
    } else {
      const cx = HERSHEY_ALPH.indexOf(ch);
      const cy = HERSHEY_ALPH.indexOf(str[++i]);
      res.push(cx - 7, cy - 7);
    }
  }
  return res;
}

function decodeFont(data) {
  const font = new Array(data.length);
  for (let i = 0; i < data.length; i++) font[i] = decodeGlyph(data[i]);
  return font;
}

let _font = null;

export function createHersheyText({ moveTo, lineTo }) {
  if (!_font) _font = decodeFont(HERSHEY_DATA);

  function draw(str = "", x0 = 0, y0 = 0, scale = 1) {
    // No “offset” hack here: caller passes plot coords.
    let pen = false;

    for (let c = 0; c < str.length; c++) {
      const idx = str.charCodeAt(c) - 32;
      const data = _font[idx] || _font[0];
      const spacing = data[0] * scale * 0.2;

      if (data.length > 1) {
        pen = false;
        for (let k = 1; k < data.length - 1; k += 2) {
          if (data[k] === -1) { pen = false; continue; }
          const xc = data[k] * scale * 0.2;
          const yc = data[k + 1] * scale * 0.2;
          const x = x0 + xc;
          const y = y0 - yc;
          if (pen) lineTo(x, y);
          else { moveTo(x, y); pen = true; }
        }
      }

      x0 += spacing;
      moveTo(x0, y0);
    }
  }

  function measure(str = "", scale = 1) {
    let w = 0;
    for (let c = 0; c < str.length; c++) {
      const idx = str.charCodeAt(c) - 32;
      const data = _font[idx] || _font[0];
      w += data[0] * scale * 0.2;
    }
    return w;
  }

  return { draw, measure };
}
