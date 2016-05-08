(function() {var Darken = function() {
  /**
   * Converts an HSL color value to RGB. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
   * Assumes h, s, and l are contained in the set [0, 1] and
   * returns r, g, and b in the set [0, 255].
   *
   * @param   Number  h       The hue
   * @param   Number  s       The saturation
   * @param   Number  l       The lightness
   * @return  Array           The RGB representation
   */
  var that = this;
  this.HSL2RGB = function(h, s, l){
      var r, g, b;

      if (h < 0) h = 0;
      if (h > 1) h = 1;

      if (s < 0) s = 0;
      if (s > 1) s = 1;

      if (l < 0) l = 0;
      if (l > 1) l = 1;

      if(s == 0){
          r = g = b = l; // achromatic
      }else{
          function hue2rgb(p, q, t){
              if(t < 0) t += 1;
              if(t > 1) t -= 1;
              if(t < 1/6) return p + (q - p) * 6 * t;
              if(t < 1/2) return q;
              if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
          }

          var q = (l < 0.5) ? (l * (1 + s)) : (l + s - (l * s));
          var p = (2 * l) - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
      }

      return { r: r * 255, g: g * 255, b: b * 255 };
  }

  /**
   * Converts an RGB color value to HSL. Conversion formula
   * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
   * Assumes r, g, and b are contained in the set [0, 255] and
   * returns h, s, and l in the set [0, 1].
   *
   * @param   Number  r       The red color value
   * @param   Number  g       The green color value
   * @param   Number  b       The blue color value
   * @return  Array           The HSL representation
   */
  this.RGB2HSL = function(r, g, b){
      r /= 255, g /= 255, b /= 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h, s, l = (max + min) / 2;

      if(max == min){
          h = s = 0; // achromatic
      }else{
          var d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch(max){
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
      }

      return { h: h, s: s, l: l };
  }

  this.HEX2RGB = function(hex) {
      // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
      var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;

      hex = hex.replace(shorthandRegex, function(m, r, g, b) {
          return r + r + g + g + b + b;
      });

      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
      } : null;
  }

  this.RGB2HEX = function(r, g, b) {
      return "#" + parseInt(((1 << 24) + (r << 16) + (g << 8) + b)).toString(16).slice(1);
  }

  this.NAME2RGB = function(name) {
    var COLORS = {};

    var color = COLORS[name] || [0, 0, 0];

    return { r: color[0], g: color[1], b: color[2] };
  }

  this.darken = function(color, amount) {
    var r_g_b;

    if (/^#/.test(color)) {
      r_g_b = that.HEX2RGB(color);
    } else {
      r_g_b = that.NAME2RGB(color);
    }

    var h_s_l = that.RGB2HSL(r_g_b.r, r_g_b.g, r_g_b.b);

    if (/^\d+\%$/.test(amount)) {
      amount = {
        type: '%',
        val: parseFloat(amount.replace(/(%)$/, ''))
      };
    } else if (/^\d+\.\d+$/.test(amount)) {
      amount = {
        type: 'f',
        val: parseFloat(amount) * 100.0
      }
    } else {
      amount = {
        type: 'i',
        val: parseFloat(amount)
      }
    }

    var val = amount.val / -100;

    if ('%' == amount.type) {
      val = val > 0
        ? (100 - h_s_l['l']) * val / 100
        : h_s_l['l'] * (val / 100);
    }

    h_s_l['l'] += val;

    r_g_b = that.HSL2RGB(h_s_l.h, h_s_l.s, h_s_l.l);

    return that.RGB2HEX(r_g_b.r, r_g_b.g, r_g_b.b);
  }

  this.lighten = function(color, amount) {
    return that.darken(color, '-' + amount);
  }
}
window.Darken = Darken;})();