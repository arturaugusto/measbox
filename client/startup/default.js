Meteor.startup(function () {

  /*
  * Mathjs
  */

  var distsToImport;
  window.convertIfNotBigNum = function(num) {
    if (typeof num !== "object") {
      return new Decimal(parseFloat(num).toPrecision(15));
    } else {
      return num;
    }
  };

  mathjs["import"]({
    fmtToPrecision: function(x, sd) {
      x = window.convertIfNotBigNum(x);
      x = x.toPrecision(sd);
      // Is in exponential form
      // force to non exponential
      // but dont work correct for example:
      // mathjs.eval("fmtToPrecision(3.0, 2)") // Gives 3...
      // TODO: Solve this
      //if (x.indexOf("e")) {
      //  x = Decimal(x).toString();
      //}
      return x;
    },
    precision: function(x, includeZeros) {
      x = window.convertIfNotBigNum(x);
      return x.precision(includeZeros).toString();
    },
    decimalPlaces: function(x) {
      if (typeof x === "string") {
        x = x.replace(/[0-9]/g, "1");
      }
      x = window.convertIfNotBigNum(x);
      return x.decimalPlaces();
    },
    fmtToDecimalPlaces: function(x, dp) {
      x = window.convertIfNotBigNum(x);
      return x.toDecimalPlaces(dp).toString();
    },
    fmtToFixed: function(x, n) {
      x = window.convertIfNotBigNum(x);
      return x.toFixed(n).toString();
    },
    prefixVal: prefixVal
  });

  distsToImport = {};

  ('beta centralF cauchy chisquare exponential invgamma kumaraswamy lognormal noncentralt normal pareto studentt weibull uniform binomial negbin hypgeom poisson triangular').split(' ').map(function(distName) {
    var sampleFn;
    sampleFn = jStat[distName].sample;
    if (sampleFn !== void 0) {
      return distsToImport[distName] = jStat[distName].sample;
    }
  });

  mathjs["import"](distsToImport);
});