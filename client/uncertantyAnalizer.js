window.U_ANALIZER_TIMER = null;
this.UncertantyAnalizer = function($tr, rowDBPath, worksheetId) {
  var that = this;

  var worksheet = _.findWhere(
    Spreadsheets
    .findOne()
    .worksheets,
    {"_id": worksheetId}
  );

  this.scope = {};
  this.gumArg = {
    "variables": [],
    "influence_quantities": [],
    "cl": 0.953,
    "mc": true
  };
  this.results = {
    mpe:0
  };


  this.groups = [];

  this.rowDBPath = rowDBPath;
  var numberEx = new RegExp(/^[+-]?([\.,]\d+|\d+[\.,]|\d+|\d+[\.,]?\d+|\d*[\.,]?\d*[Ee][+-]?\d*)+/g);
  var propertiesToExport = ('U k uncertainties uncertainties_var_names uc ui veff y df ci');
  var propertiesToExportMC = ('M _iterations_mean d_high d_low gum_curve histogram p sci_limits uc');


  this.setRangeAttributesToScope = function (range) {
    that.scope.rangeStart = range.limits.start;
    that.scope.rangeEnd = range.limits.end;
    that.scope.fullscale = range.limits.fullscale;
    that.scope.isFixed = range.kind === "Fixed" ? true : false;
    that.scope.resolution = mathjsResult(range.limits.resolution, that.scope);
  }

  this.testRange = function (range) {
    if (range === undefined) {
      return false;
    }
    var rangeConditions = range.limits.autorangeConditions;
    that.setRangeAttributesToScope(range);
    var isThisRange = mathjsResult(rangeConditions, that.scope);
    return isThisRange;
  }

  this.parseReadout = function (readout) {
    // Clean whitespaces
    readout = readout.replace(/ /g, "");
    var numberMatch = readout.match(numberEx);
    if (numberMatch == null) {
      return null;
    }
    var number = parseFloat(numberMatch[0]);
    // expect to have only the prefix on prefixStr
    var prefixStr = readout.replace(numberMatch[0], "");
    var res = number*prefixVal(prefixStr);
    return {value: res, prefix: prefixStr};
  }
  
  this.pushUncertaintiesToGumArg = function (uncertainties, varName) {
    uncertainties.map(function (u) {
      if (u === undefined) return;
      var gumArgNode = _.findWhere(
        that.gumArg.variables,
        {"name": varName}
      );
      gumArgNode.uncertainties.push(u);
    })
  }

  this.setMPE = function () {
    // Increment mpe if if was defined on uncertainty
    if (that.scope.mpe !== undefined) {
      that.results.mpe += that.scope.mpe;
    }

  }

  this.solveUncertainties = function (u, varName) {
    // Clean monitoring variables from scope
    // before calculating uncertainty
    delete that.scope.mpe;
    var uVal = mathjsResult(u.formula, that.scope);
    // UUT MPE dont enter on budget
    if (varName === that.uutVarName && u.name === "MPE") {
      that.setMPE();
      return false;
    }
    return {
      "name": u.name,
      "value": uVal,
      "distribution": u.distribution
    };
  }

  this.getGroupInstrumentRange = function (instrument) {
    var isThisRange;
    for (var i = 0; i < instrument.ranges.length; i++) {
      range = instrument.ranges[i];
      isThisRange = that.testRange(range);
      if (isThisRange) {
        return range;
      }
    }
    return;
  }

  this.setRangeIdOnDB = function(rangeId, varName) {
    var path = that.rowDBPath + "." + varName + "RangeId";
    setData(path, rangeId);
  }

  this.setUUTResolution = function(range) {
    that.results.uutResolution = mathjsResult(range.limits.resolution, that.scope);
  }

  this.retrieveUncertainties = function() {
    var varGroups = _.keys(that.scope);
    varGroups.map(function(varName) {
      var instrument = getInstrumentById(worksheet[varName+"InstrumentId"]);
      if (instrument === undefined) return;

      that.scope["readout"] = that.scope[varName];
      var range = getGroupInstrumentRange(instrument);
      if (range === undefined) return;

      that.setRangeIdOnDB(range._id, varName);
      if (that.uutVarName === varName) {
        that.setUUTResolution(range);
        that.results.uutUnit = instrument.unit;
        that.results.uutName = varName;
      }
      var solvedUncertainties = [];
      var solvedUncertainty;
      for (var i = 0; i < range.uncertainties.length; i++) {
        solvedUncertainty = that.solveUncertainties(range.uncertainties[i], varName);
        if (solvedUncertainty) {
          solvedUncertainties.push(solvedUncertainty);
        }
      }
      that.pushUncertaintiesToGumArg(solvedUncertainties, varName);
      return;
    });
    return;
  }

  this.pushToGumArg = function (varName, readoutArr) {
    that.gumArg.variables.push({
      "name": varName,
      "value": readoutArr,
      "prefix": null,
      "uncertainties": []
    });
  }

  this.extractRowData = function (varName) {
    var res = [];
    var $elements = $tr.find("td[var-name='"+varName+"']");
    var parserResult;
    $.each($elements, function(readoutIndex, td) {
      parserResult = that.parseReadout($(td).text());
      if (varName === that.uutVarName && readoutIndex === 0) {
        that.results.uutPrefix = parserResult.prefix;
      }
      res.push(parserResult.value);
    });
    return res;
  }

  this.setScopeDataInfluence = function (v) {
    var readoutArr = that.extractRowData(v.name);
    var value = readoutArr[0];
    that.pushToGumArg(v.name, [value]);
    that.scope[v.name] = value;
    that.groups.push(v.name+ " = " + value.toString());
  }

  this.setScopeData = function (v) {
    var readoutArr = that.extractRowData(v.name);
    that.pushToGumArg(v.name, readoutArr);
    var mean = jStat.mean(readoutArr);
    that.scope[v.name] = mean;
    if (that.uutVarName === v.name) that.results.uutReadout = mean;
  }

  this.buildGumArg = function(worksheet) {
    that.procedure = getProcedureById(worksheet.procedureId);
    // TODO: Cache the function to better performance
    if (that.procedure === undefined) {
      return;
    }
    var node = mathjs.parse(that.procedure.func);
    that.results.funcLaTeX = node.toTex();
    that.gumArg.func = node.compile().eval;
    
    // Conventionally, the first variable is UUT
    that.uutVarName = that.procedure.variables[0].name;
    // First we need to iteratr thoug all itens
    // to set data and get uncertainties
    _.filter(that.procedure.variables, function(v) {
      return v.kind !== "Influence" })
    .map(setScopeData);
    
    // now for influence quantities
    _.filter(that.procedure.variables, function(v) {
      return v.kind === "Influence" })
    .map(setScopeDataInfluence);

    that.retrieveUncertainties();
    
  }
  
  this.postProcess = function() {
    propertiesToExport.split(" ").map(function(propName) {
      that.results[propName] = that.gum[propName];
    });
    
    that.results.mc = {};
    propertiesToExportMC.split(" ").map(function(propName) {
      that.results.mc[propName] = that.gum.mc[propName];
    });

    that.results.correctValue = that.results.uutReadout - that.results.y;

    that.postProcessingFuncStr = that.procedure.additionalOptions.postProcessing;
    that.postProcessingFunc = mathjs.compile(that.postProcessingFuncStr).eval;

    that.postProcessingRes = that.postProcessingFunc(that.results);
    
  }

  this.buildGumArg(worksheet);
  this.gum = new GUM(this.gumArg);
  this.postProcess();
  this.results._groups = this.groups;
  
  setData(this.rowDBPath+"._results", this.results);

}