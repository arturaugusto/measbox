// gum.js 1.0
// (c) 2015 Artur Augusto Martins
// gum.js is freely distributable under the GPL v2 license.
// For all details and documentation:
// https://github.com/arturaugusto/gumjs
(function() {
  // Gamma related functions borrowed from: https://github.com/substack/gamma.js
  var g = 7;
  var p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  var g_ln = 607/128;
  var p_ln = [
    0.99999999999999709182,
    57.156235665862923517,
    -59.597960355475491248,
    14.136097974741747174,
    -0.49191381609762019978,
    0.33994649984811888699e-4,
    0.46523628927048575665e-4,
    -0.98374475304879564677e-4,
    0.15808870322491248884e-3,
    -0.21026444172410488319e-3,
    0.21743961811521264320e-3,
    -0.16431810653676389022e-3,
    0.84418223983852743293e-4,
    -0.26190838401581408670e-4,
    0.36899182659531622704e-5
  ];
  // Spouge approximation (suitable for large arguments)
  function lngamma(z) {

    if(z < 0) return Number('0/0');
    var x = p_ln[0];
    for(var i = p_ln.length - 1; i > 0; --i) x += p_ln[i] / (z + i);
    var t = z + g_ln + 0.5;
    return .5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x)-Math.log(z);
  }

  function gamma (z) {
    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    }
    else if(z > 100) return Math.exp(lngamma(z));
    else {
      z -= 1;
      var x = p[0];
      for (var i = 1; i < g + 2; i++) {
        x += p[i] / (z + i);
      }
      var t = z + g + 0.5;

      return Math.sqrt(2 * Math.PI)
        * Math.pow(t, z + 0.5)
        * Math.exp(-t)
        * x
      ;
    }
  };

  // End gamma functions

  // Create a sequence array
  var seq = function(start, end, step) {
    if ( (start === end) || !step ) {
      return [];
    }
    var i, res, _i;
    res = [];
    for (i = _i = start; step > 0 ? _i <= end : _i >= end; i = _i += step) {
      res.push(i);
    }
    return res;
  };

  // Sum array
  var sum = function(arr){
    var res = 0;
    // If first item of array is not number, check all valures and parse to float
    var parse_values = typeof arr[0] !== "number" ? true : false;
    if (parse_values){
      for (var i = arr.length - 1; i >= 0; i--) {
        res += parseFloat(arr[i]);
      };
    }else{
      for (var i = arr.length - 1; i >= 0; i--) {
        res += arr[i];
      };
    }
    return(res);
  }

  // take a array and sum v to all itens, returning new array
  var inc_arr = function(arr, v){
    var res = [];
    for (var i = 0; i < arr.length; i++) res.push(arr[i] + v);
    return res;
  }

  var sd = function(array, mean){
    var dev = array.map(function(itm){
      return (parseFloat(itm)-mean)*(parseFloat(itm)-mean); 
    });
    return Math.sqrt(dev.reduce(function(a, b){ return a+b; })/array.length);
  }

  // Get samples from function f at points from array arr
  var sampler = function(f, arr) {
    return arr.map(function(_x) {
      return f.call(void 0, _x);
    });
  };

  var area = function(x, y, h){
    var n = y.length;
    var sum_y_samples = sum(y);
    var sum_y = sum_y_samples - (y[0] + y[n-1])/2;
    var integral;
    var integral = sum_y*h;
    return(integral);
  }

  // Trapezoidal integration method.
  // translated from R: http://www.r-bloggers.com/trapezoidal-integration-conceptual-foundations-and-a-statistical-application-in-r/
  var trapezoidal = function(f, t_start, t_end, h){
    var x = seq(t_start, t_end, h);
    var y = sampler(f, x);
    return(area(x, y, h));
    var n = y.length;
    var sum_y_samples = sum(y);
    var sum_y = sum_y_samples - (y[0] + y[n-1])/2;
    var integral;
    var integral = sum_y*h;
    return(integral);
  }

  // T student distribution probabilities, at point t with v degrees of freedon
  function tdist(v, t){
    return gamma((v+1)/2) / (Math.sqrt(v * Math.PI) * gamma(v/2)) * Math.pow((1 + Math.pow(t, 2)/v), -((v+1)/2));
  }

  // Get coverage factor by
  // integrating tdist with v deg freedon until reach cl
  function invt(v, cl){
    if(cl >= 1 || cl <= 0){
      console.error("confidence level must be < 1 and > 0");
      return;
    }
    var v_max = 300;
    // limit deg freedom
    if(v > v_max){
      v = v_max;
    }
    var k = 0;
    var k_i = 0;
    var k_inc = 0.01;
    var curr_cl = 0;
    while (curr_cl < cl) {
      k_i = k;
      k += k_inc;
      // Integrate the t student curve to until get desired confidence level
      curr_cl += trapezoidal(
        function(t){
          return(tdist(v,t));
        }, k_i, k, 0.01) * 2; // * 2 to get both sides
    }
    return(k);
  }

  // Create a matrix of zeros
  function zero_matrix(cols, rows){
    var matrix;
    matrix = Array.apply(void 0, Array(cols)).map(
      function(){
        return(new Float32Array(rows));
      });
    return(matrix);
  }

  // Create a array of random n number for the suplied distribution and arguments (requies jStat)
  function rand_array(n, pdf, args){
    var arr = [];
    for (var i = n - 1; i >= 0; i--) {
      arr.push( pdf.sample.apply(void 0, args) );
    };
    return arr;
  }

  // Use richardon extrapolation: http://en.wikipedia.org/wiki/Richardson_extrapolation
  // to compute odf
  var richardson_ode_solver = function (f, x, opts) {
    if (opts.tolerance === "undefined") {
      opts.tolerance = 0.00000001;
    }
    if (opts.max_rows === "undefined") {
      opts.max_rows = 20;
    }
    var h_offset = 0.0001; // For cases that x = 0, so the algorithm will not fail
    var t_start = -x*2;
    var err = Infinity;
    var initial_h = Math.abs(x - t_start);
    var h = initial_h + h_offset;
    var A = zero_matrix(opts.max_rows, opts.max_rows);
    for (var i = 0; i <= opts.max_rows-1; i++) {
      A[i][0] = f(x + h) - f(x - h);
      A[i][0] = A[i][0] / (2 * h);
      if (i > 0) {
        for(var j = 1; j <= i; j++) {
          A[i][j] = A[i][j-1] + (A[i][j-1] - A[i-1][j-1]) / (Math.pow(4,j-1));
        };
        err = Math.abs(A[i][i] - A[i-1][i-1]);
        if (err < opts.tolerance) {
          return(A[i][i]);
        }
      }
      h = h/2;
    };
    return(A[opts.max_rows-1][opts.max_rows-1])
  }

  // Welch-Satterthwaite effective degrees of freedom
  var w_s = function(ci_ui, df, uc) {
    
    var divisor_array = [];
    divisor_array = ci_ui.map(function(_, i){
      return ( Math.pow(ci_ui[i], 4) / df[i] );
    })

    var divisor = sum(divisor_array)

    return (Math.pow(uc, 4) / divisor);
  }

  // string is returned if math model is single line, and object with entries property if multiline
  var math_res = function(fun, scope){
    var res = fun.eval(scope);
    return typeof res === "number" ? res : res.entries[res.entries.length-1];
  }

  var Xfunc = function(func, math_scope, target_var_name){
    var that = this;
    this.func = func;
    this.math_scope = math_scope;
    this.target_var_name = target_var_name;

    // define math function
    this.math_func = Function;
    if(typeof this.func === "string"){
      // use mathjs lib to compile the string
      this.math_func = math.compile(this.func);
    }

    // run a iteration of function
    this.iterate = function(x, by_ref){
      var scope_updt = {};
      var arg_type = typeof x;
      // Defines if scope will be copied by ref or reference
      if (typeof by_ref === 'undefined') { by_ref = false; }
      // If a object is passed, use it as scope
      // *** Será que preciso usar Object.create aqui? Isto demora muito!
      if(arg_type === "object"){
        by_ref ? scope_updt = x : scope_updt = Object.create(x);
      }else{
        by_ref ? scope_updt = that.math_scope : scope_updt = Object.create(that.math_scope);
      }
      
      // Accept numeric or string arguments. Strings can be accepted because 
      // they can contain informations such as complex numbers to be parsed 
      // on mathjs, but this was not tested.
      if ((arg_type === "number") || (arg_type === "string")){
        scope_updt[that.target_var_name] = x;
      }
      var res;
      if(typeof that.func === "string"){
        res = math_res(that.math_func, scope_updt);
      }else{
        res = that.func.call(void 0, scope_updt);
      }
      return res;
    }
  }

  // create a array of size n repeating val
  var rep = function(val, n){
    var out = [];
    // If its a object, return a new one, without passing the iriginal as referenca
    if(typeof val === "object"){
      for (var i = n - 1; i >= 0; i--) {
        out.push(Object.create(val));
      };
    }else{
      for (var i = n - 1; i >= 0; i--) {
        out.push(val);
      };
    }
    return out;
  }

  // Probability distributions
  var distributions = {
    "arcsine": Math.sqrt(2),
    "uniform": Math.sqrt(3),
    "normal": Math.sqrt(4),
    "triangular": Math.sqrt(6)
  }

  var get_distribution_div = function(val){
    // Use uniform by default if its undefined
    if(val === undefined){
      val = "uniform"
    }
    var dist_val = distributions[val];
    if(dist_val === undefined){
      // Case is set a numeric val
      return(parseFloat(val));
    }else{
      return(dist_val);
    }
  }

  get_prefix = function(k) {
    var k_val, prefixes;
    prefixes = {
      "Y": 1000000000000000000000000,
      "Z": 1000000000000000000000,
      "E": 1000000000000000000,
      "P": 1000000000000000,
      "T": 1000000000000,
      "G": 1000000000,
      "M": 1000000,
      "k": 1000,
      "h": 100,
      "da": 10,
      "d": 0.1,
      "c": 0.01,
      "m": 0.001,
      "u": 0.000001,
      "n": 0.000000001,
      "p": 0.000000000001,
      "f": 0.000000000000001,
      "a": 0.000000000000000001,
      "z": 0.000000000000000000001,
      "y": 0.000000000000000000000001
    };
    return k_val = (prefixes[k] === void 0 ? 1 : prefixes[k]);
  };


  var parse_newline_values = function(v){
    return v.split(/[\n,;]+/).map(function(v){
      return parseFloat(v);
    });
  }

  var build_scope = function(v){
    var mean_value = 0;
    var prefix = get_prefix(v.prefix)
    // copy the quantity of var
    var readout = v.value;
    if (typeof readout === "number"){
      mean_value = readout;
    }
    if (typeof readout === "string"){
      // If value is a string, split to convert csv or limited by \n to array of numbers
      readout = parse_newline_values(readout);
    }
    if (typeof readout === "object"){
      var n = readout.length;
      // Case n is 0 or 1, it will be a array with only none or one value,
      // so in this case, set readout as only one numeric value
      if(n === 0){
        mean_value = 0;
      } else {
        // The readout contain multiple lines
        // parse the data and set readout as the average of data
        /*
        for (var i = readout.length - 1; i >= 0; i--) {
          if (typeof readout[i] === "string") {
              var size = (readout[i].split(/[\n,;]+/).length)
              if (size > 0){
                var serie_readout = ( sum(parse_newline_values(readout[i]))/size );
                readout[i] = serie_readout;
              }
          }
        };
        */
        if (n === 1) {
          mean_value = parseFloat(readout[0]);
        } else {
          mean_value = (sum(readout)/n);

          // The array contain multiple values, 
          // so add type A uncertanty
          var values_sd = sd(readout, mean_value) * prefix;
          // Create a new uncertanty item
          var unc = {
            "name": "Repeatability",
            "value": values_sd,
            "type": "A",
            "distribution": "normal",
            "df": n - 1,
            "k": 2
          }
          // Add uncertanty relative to desviation of values
          this.uncertainties.push(unc);
          // repeat var name to array
          this.uncertainties_var_names.push(v.name);
        }
      }
      
    }
    this._scope[v.name] = mean_value * prefix;
  }

  var type_b_uncertainties = function(v){
    var that = this;
    // create reference to uncertanties
    v.uncertainties.map(function(u){
      var unc = {
        "name": u.name,
        "value": u.value,
        "type": "B",
        "distribution": u.distribution,
        "df": u.df,
        "k": u.k,
        "custom_pdf": u.custom_pdf
      }
      that.uncertainties.push(unc);
    });
    // Create the flat version of var_names repeating the name, uncertainties.length times
    this.uncertainties_var_names = this.uncertainties_var_names.concat( [], rep(v.name, v.uncertainties.length) );
  }

  var determine_sensitive_coefficients = function(v){
    this._xfunc.target_var_name = v.name;
    var ci = richardson_ode_solver(this._xfunc.iterate, this._scope[v.name], {'tolerance': 1e-9, 'max_rows': 10});
    if(ci === undefined){
      ci = 1;
    }
    this._variables_ci_obj[v.name] = Math.abs(ci);
  }

  // taken from http://stackoverflow.com/questions/26941168/javascript-interpolate-an-array-of-numbers
  function interpolateArray(data, fitCount) {

      var linearInterpolate = function (before, after, atPoint) {
          return before + (after - before) * atPoint;
      };

      var newData = new Array();
      var springFactor = new Number((data.length - 1) / (fitCount - 1));
      newData[0] = data[0]; // for new allocation
      for ( var i = 1; i < fitCount - 1; i++) {
          var tmp = i * springFactor;
          var before = new Number(Math.floor(tmp)).toFixed();
          var after = new Number(Math.ceil(tmp)).toFixed();
          var atPoint = tmp - before;
          newData[i] = linearInterpolate(data[before], data[after], atPoint);
      }
      newData[fitCount - 1] = data[data.length - 1]; // for new allocation
      return newData;
  };

  // javascript version of Matlab linspace
  var linspace = function(start, end, n){
    return interpolateArray([start, end], n);
  }

  var GUM = function(obj){
    var that = this;
    if (typeof obj === "object"){
      //this.obj = JSON.parse(JSON.stringify(obj)); // Copy obj data and avoid reference the original one
      this.obj = obj; // Copy obj data and avoid reference the original one
    }else if(typeof obj === "string"){
      this.obj = JSON.parse(obj);
    }else{
      console.error("Invalid argument.")
    }
    // Unpack uncertainties, var names and correponsing values
    this.uncertainties = [];
    this.uncertainties_var_names = []; // VI, VC, VC

    // Object scope
    this._scope = {};

    // Handle type B uncertanties, appending each uncertanty var name to uncertainties_var_names
    this.obj.variables.map(type_b_uncertainties.bind(this));
    
    // define scope values and handle type A uncertanties
    obj.variables.map(build_scope.bind(this));

    // Add influence quantities to scope, if exists
    if(obj.influence_quantities !== undefined){
      obj.influence_quantities.map(build_scope.bind(this));
    }
    

    // Create an Xfunc, that contains the math model scoped with variables quantities
    this._xfunc = new Xfunc(this.obj.func, this._scope, "");
    
    // Sensitive coefficients object
    this._variables_ci_obj = {};
    this.obj.variables.map(determine_sensitive_coefficients.bind(this));

    // Sensitive coefficients with the same 
    // size of uncertainties array and other related arrays
    this.ci = this.uncertainties_var_names.map(function(v){
      return(that._variables_ci_obj[v]);
    })


    // Standard Uncertainties
    this.ui = this.uncertainties.map(function(u, i){
      // Determine the divisor to unexpand the uncertanty
      var div;
      if(u.k !== undefined){
        div = u.k;
      }else if(u.distribution === "normal"){// Case of already unexpanded normal dist
        div = 1;
      }else if(u.distribution === "studentt"){
        div = invt(u.df, u.ci);
      }else{
        div = get_distribution_div(u.distribution);
      }
      // return standard uncertanty
      return(u.value / div);
    })

    // ci_ui
    this.ci_ui = this.uncertainties.map(function(_, i){
      return(that.ui[i] * that.ci[i]);
    })

    // contributions
    this._ci_ui_pow_2 = this.ci_ui.map(function(u){
      return(Math.pow(u, 2));
    })

    // combined uncertainty uc
    this.uc = Math.sqrt(sum(this._ci_ui_pow_2));

    // degrees of freedom
    this.df = this.uncertainties.map(function(u, i){
      // If deg of freedon was not defined, return Infinity
      return u.df === undefined ? 9999 : parseFloat(u.df);
    })

    // Effective degrees of freedom
    this.veff = w_s(this.ci_ui, this.df, this.uc);

    // compute coverage factor
    this.k = invt(this.veff, obj.cl)

    // expanded uncertainty
    this.U = this.uc*this.k;

    // Output
    this.y = this._xfunc.iterate();

    // UNDER DEVELOPMENT ***************************************
    // Monte Carlo
    // 
    this.mcm = function(){
      this.mc = {};
      this.mc._init_time = Date.now();
      this.mc.M = 2000;
      
      this.mc._iterations = [];
      // Compute simulations for model
      var mc_sd = Infinity
      var num_tolerance = 0;
      var n_dig = 2;
      var h = 1; // brusts of iterations

      var hist_x_min = 0;
      var hist_x_max = 0;
      var check_stable_h = 10;
      // Monitoring parameters
      var results_of_interest = {s_y: [], s_u: [], s_y_low: [], s_y_high: []};
      var stabilized;
      this.mc._trials_exceeded = false;
      //console.log("Computing...");
      while ( true ) {
        // Create MC scope, repeating the expectation values from GUM framework scope
        this.mc._scope = rep(this._scope, this.mc.M);
        // MC distributions inputs simulations
        this.uncertainties.map(mc_simulations.bind(this));

        for (var i = this.mc.M - 1; i >= 0; i--) {
          this.mc._iterations.push(this._xfunc.iterate(this.mc._scope[i], true));
        };
        // Mean value
        this.mc._iterations_mean = sum(this.mc._iterations) / (this.mc.M * h);
        
        // ref: 7.6 Estimate of the output quantity and the associated standard uncertainty JCGM_101_2008_E.pdf
        this.mc.uc = Math.sqrt(jStat.sumsqrd( inc_arr(this.mc._iterations, -this.mc._iterations_mean) ) * (1/((this.mc.M * h)-1)));
        // parameter to monitor on adaptative MC
        results_of_interest.s_u.push(this.mc.uc);
        results_of_interest.s_y.push(this.mc._iterations_mean);
        // Its slow to run this here
        // TODO: Think if its mandatory check sci parameters 
        // for stabilization
        /**
        // Sort iterations
        this.mc._iterations.sort(function sortNumber(a,b){return a - b});
        // ref: 7.7 Coverage interval for the output quantity
        this.mc.p = (1 - this.obj.cl);
        // The shortest coverage interval
        this.mc.sci_limits = sci(this.mc._iterations, this.mc.p);
        results_of_interest.s_y_low.push(this.mc.sci_limits[0]);
        results_of_interest.s_y_high.push(this.mc.sci_limits[1]);
        **/

        if (h >= check_stable_h){
          // Define numerical tolerance
          // ref: 7.9.2 Numerical tolerance associated with a numerical value JCGM_101_2008_E.pdf
          num_tolerance = parseFloat("1e"+(this.mc.uc/(Math.pow(10,n_dig-1))).toExponential().split("e")[1])/2;
          // standard desviation for adaptative MC

          // Check if all parameters of intesert are valid,
          // by comparing if its < 2*tolerance
          stabilized = true;
          Object.keys(results_of_interest).map(function(k){
            var item_size = results_of_interest[k].length;
            if (item_size > 0) {
              var mean = sum(results_of_interest[k]) / item_size;
              var s = sd(results_of_interest[k], mean);
              stabilized = stabilized && (num_tolerance > s*2);
              //console.log(k);
              //console.log(s*2);
            };
            return void 0;
          })

          if(h > check_stable_h*1){
            //console.warn("Monte carlo trials exceeded!");
            this.mc._trials_exceeded = true;
          };
          if (stabilized || this.mc._trials_exceeded){

            // Sort iterations
            this.mc._iterations.sort(function sortNumber(a,b){return a - b});
            // ref: 7.7 Coverage interval for the output quantity
            this.mc.p = (1 - this.obj.cl);
            // The shortest coverage interval
            this.mc.sci_limits = sci(this.mc._iterations, this.mc.p);

            // Compute a histogram
            this.mc.histogram = {}
            this.mc.histogram.y = jStat.histogram(this.mc._iterations, 100);
            iter_n = this.mc._iterations.length;
            hist_x_min = this.mc._iterations[0];
            hist_x_max = this.mc._iterations[iter_n-1];
            this.mc.histogram.x = seq(hist_x_min, hist_x_max, (hist_x_max - hist_x_min) / this.mc.histogram.y.length );

            //console.log("Finish!");
            break;
          }          
        }
        //console.log("Burst " + h);
        h = h + 1;
      }
      // Update M
      this.mc.M =  this.mc._iterations.length;
      // Equivalent interval for GUM
      for (var i = this.mc.histogram.x.length - 1; i >= 1; i--) {
        if ( (this.mc.histogram.x[i] >= this.U) && (this.mc.histogram.x[i-1] <= this.U) ){
          this.mc._hist_gum_eq_high_i = i;
        }
        else if ( (this.mc.histogram.x[i] >= -this.U) && (this.mc.histogram.x[i-1] <= -this.U) ){
          this.mc._hist_gum_eq_low_i = i;
        }
      };
      var step = this.mc.histogram.x[1]-this.mc.histogram.x[0];
      var hist_area = area(this.mc.histogram.x, this.mc.histogram.y, step);
      // apply correction to histogram samples
      this.mc.histogram.y = jStat( this.mc.histogram.y ).divide(hist_area)[0];
      // Studentt curve
      this.mc.gum_curve = this.mc.histogram.x.map(function(i){
        return jStat.studentt.pdf((i-that.mc._iterations_mean)/that.uc, that.veff)/that.uc;
      });

      // Validation
      this.mc.num_tolerance = num_tolerance;
      this.mc.n_dig = n_dig;
      // GUM validated?
      this.mc.d_low = Math.abs(this.y - this.U - this.mc.sci_limits[0])
      this.mc.d_high = Math.abs(this.y + this.U - this.mc.sci_limits[1])
      this.mc.GUF_validated = (this.mc.d_low < num_tolerance) && (this.mc.d_high < num_tolerance);
      this.mc._simulation_time = (Date.now() - this.mc._init_time);
      console.log("Simulation time: " + this.mc._simulation_time);
      //console.log(this.mc);      
    }
    
    if(this.obj.mc){
      this.mcm();
    }

    return(void 0);
  }

  // Determine The shortest coverage interval
  // JCGM 101:2008, item D.7
  var sci = function(values, alpha){
    /*
    Translated from: http://blogs.datall-analyse.nl/#post26
    #function for calculating the shortest coverage interval
    sci <- function (values, alpha=.05){
      sortedSim <- sort(values)
      nsim <- length(values)
      covInt <- sapply( 1:(nsim-round((1-alpha)*nsim) ), function(i) {
        sortedSim[1+round((1-alpha)*nsim)+(i-1)]-sortedSim[1+(i-1)]
      })
      lcl <- sortedSim[which(covInt==min(covInt))]
      ucl <- sortedSim[1+round((1-alpha)*nsim)+(which(covInt==min(covInt))-1)]
      c(lcl, ucl)
    }
    */

    var M = values.length;
    this.alpha = alpha === undefined ? 0.05 : alpha;
    var cov_interv = values.slice(0,M-Math.round((1-this.alpha)*M)).map(function(_, i) {
      return values[Math.round((1-this.alpha)*M)+i]-values[i];
    })
    //var lower_cl_i = cov_interv.indexOf(Math.min.apply(void 0, cov_interv));
    var lower_cl_i = cov_interv.indexOf(jStat.min(cov_interv));
    var lower_cl = values[lower_cl_i];
    var upper_cl_i = Math.round((1-this.alpha)*M)+(cov_interv.indexOf(jStat.min(cov_interv))-1);
    var upper_cl = values[upper_cl_i];
    //return [lower_cl, upper_cl, cov_interv];
    return [lower_cl, upper_cl];
  }



  // Set monte carlo inputs simulations, binded to main mc scope
  var mc_simulations = function(u, i){
    var that = this;
    if (u.value === 0){
      return;
    }
    var args = [];
    this.var_name = that.uncertainties_var_names[i];
    //var val = that.mc._scope[i][that.var_name];
    var effective_dist = u.distribution


    var pdf_sampler = undefined;
    if (u.custom_pdf === undefined) {
      if(u.distribution === "uniform"){
        args = [-u.value, u.value];
      }else if(u.distribution === "triangular"){
        args = [-u.value, u.value, 0];
      }else if(u.distribution === "studentt"){
        args = [u.df];
      }else if(u.distribution === "beta"){
        args = [u.alpha, u.beta];
      }else if(u.distribution === "arcsine"){
        // For arcsin, values will be post-processed from uniform (0,1) distribution
        effective_dist = "uniform";
        args = [0, 1];
      }else{ 
        args = [0, u.value]; // Arguments for normal distribution
      }
    } else {
      try {
        pdf_sampler_mathjs = math.compile(u.custom_pdf).eval;
        pdf_sampler = function(args){
          var res = pdf_sampler_mathjs(args);
          if (typeof res === "object") {
            return res.entries[res.entries.length - 1];
          }else{
            return res;
          };
        }
        args = [u];
      }
      catch(err) {
        console.warn("Could not parse custom pdf: " + u.custom_pdf + ". Failback to " + u.distribution);
      }      
    }

    if (pdf_sampler === undefined) {
      pdf_sampler = jStat[effective_dist].sample;
    }

    var sample;
    for (var i = that.mc.M - 1; i >= 0; i--) {
      sample = pdf_sampler.apply(void 0, args);
      // Sum samples to expectation/modified expectation
      // and update scope value for the iteration
      this.mc._scope[i][this.var_name] += sample;
    };

    // Transform the previous uniform distribution on a arcsin distribution
    // Ref: Item 6.4.6.4 from JCGM_101_2008_E.pdf
    if(u.distribution === "arcsine"){
      for (var i = that.mc.M - 1; i >= 0; i--) {
        sample = this.mc._scope[i][this.var_name];
        this.mc._scope[i][this.var_name] = ((-u.value + u.value)/2)+((u.value + u.value)/2) * Math.sin(2*Math.PI*sample);
      };
    }

  }

  window.GUM = GUM;
})();