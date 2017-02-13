var COLOR_SCHEMA = ["#4D4D4D", "#5DA5DA", "#FAA43A", "#60BD68", "#F17CB0", "#B2912F", "#B276B2", "#DECF3F", "#F15854"];

nv.utils.symbolMap.set('error-bar-line', function(size) {
  size = Math.sqrt(size)*4;
  return 'M' + (-size/2) + ',0' +
         'h' + size
});

nv.utils.symbolMap.set('thin-x', function(size) {
  size = Math.sqrt(size)*2;
  return 'M' + (-size/2) + ',' + (-size/2) +
          'l' + size + ',' + size +
          'm0,' + -(size) +
          'l' + (-size) + ',' + size;
});

Template.rangeChart.rendered = function() {
  var that = this;
  Session.set('rangeChartReference', '');
  this.rangeChartReferencePrev = undefined;


  var getDefinedPoints = function(selectedRowRangeData) {
    return _.filter(selectedRowRangeData.map(function(r){
      return r._results
      }), function(r){
        return r !== undefined
      }
    );
  }

  var determineAxUnit = function(selectedRowRangeData) {
    var axUnit = selectedRowRangeData[0]._results.outputUnit;
    if (axUnit === "") {
      axUnit =  "unit";
    }
    return axUnit;
  }

  var pointsHaveMpe = function(definedPoints) {
    for (var i = definedPoints.length - 1; i >= 0; i--) {
      if (definedPoints[i].mpe !== 0) {
        return true;
      }
    }
    return false;
  } 


  var buildPointsSequenceSchema = function(groupName, x, p, size, i) {
    return [
      {
        '_group': groupName,
        'x': x,
        'y': p.y,
        'size': size
      }
      ,
      {
        '_group': groupName,
        'x': x,
        'y': p.y-p.U,
        'shape': 'error-bar-line',
        'size': size
      }
      ,
      {
        '_group': groupName,
        'x': x,
        'y': p.y+p.U,
        'shape': 'error-bar-line',
        'size': size
      }
      ,
      {
        '_group': groupName,
        'x': x,
        'y': p.y,
        'size': size
      }
    ]
  }




  var buildMpeSequenceSchema = function(mpeTopGroupName, mpeBottomGroupName, x, p, size, i) {
    return [
      {
        '_group': mpeTopGroupName,
        'x': x,
        'y': +p.mpe,
        '_pos': 'top',
        'shape': 'thin-x',
        'classed': 'dashed',
        'size': size
      }
      ,
      {
        '_group': mpeBottomGroupName,
        'x': x,
        'y': -p.mpe,
        '_pos': 'bottom',
        'shape': 'thin-x',
        'classed': 'dashed',
        'size': size
      }
    ]
  }

  this.keyColorMap = {};

  var definedPointsData = function(definedPoints) {
    that.keyColorMap = {};
    var pointsData = [];
    var size = 1;
    definedPoints.map(function(p, i) {
      var uutName = p['uutName'];
      var xData = p[uutName];
      var x;
      if (typeof xData === 'object') {
        x = xData['readout'];
      } else {
        x = xData;
      }


      var groupName = p._groups.toString() !== '' ? p._groups.toString() : 'readout';
      that.keyColorMap[groupName] = that.keyColorMap[groupName] || COLOR_SCHEMA[i];

      var pointsSequenceDefinition = buildPointsSequenceSchema(groupName, x, p, size, i);


      var haveMpe = pointsHaveMpe(definedPoints);
      var sequenceDefinition;
      
      if (haveMpe) {
        var mpeTopGroupName = groupName + ' MPE+';
        var mpeBottomGroupName = groupName + ' MPE-';

        var mpeSequenceDefinition = buildMpeSequenceSchema(mpeTopGroupName, mpeBottomGroupName, x, p, size, i);

        that.keyColorMap[mpeTopGroupName] = that.keyColorMap[mpeTopGroupName] || COLOR_SCHEMA[i];
        that.keyColorMap[mpeBottomGroupName] = that.keyColorMap[mpeBottomGroupName] || COLOR_SCHEMA[i];

        sequenceDefinition = pointsSequenceDefinition.concat(mpeSequenceDefinition);
      } else {
        sequenceDefinition = pointsSequenceDefinition;
      }


      sequenceDefinition.map(function(s){
        pointsData.push(s);
      });
    });
    return pointsData;
  }

  var rangeDatum = function(selectedRowRangeData) {

    if (!selectedRowRangeData) return [];
    
    this.axUnit = determineAxUnit(selectedRowRangeData);

    this.definedPoints = getDefinedPoints(selectedRowRangeData);

    var pointsData = definedPointsData(this.definedPoints);


    var pointsDataGrouped = _.groupBy(pointsData, "_group");
    var data = [];
    _.keys(pointsDataGrouped).map(function(k, i) {
      var obj = {
        key: k,
        yAxis: 0,
        type: "line",
        values: pointsDataGrouped[k],
        color: that.keyColorMap[k]
      };
      data.push(obj);

    });
    return data;
  }


  var rangeChartBuilder = function() {
    rangeChart.xAxis
      .tickFormat(d3.format(',.1e'));
    rangeChart.yAxis
      .tickFormat(d3.format(',.1e'));
    rangeChart.tooltip.contentGenerator(
      function (obj) {
        try {
          var content = "";
          if (obj.point._group.length > 0) {
            content += obj.point._group + "<br>";
          }
          content += "x: "+obj.point.x.toExponential(3)+"<br>y: "+obj.point.y.toExponential(3);
          return content;
        } catch (e) {
          return '';
        }
      })
    ;  
    try {
      if (rangeChart) rangeChart.update();
    } catch (e) {
      //
    }  
    return rangeChart;
  }

  var addGraphRangeChart = function() {
    window.rangeChart = nv.models.lineChart()
      .options({
          duration: 0, // Animation generate bugs
          useInteractiveGuideline: false
      })
      .interpolate("linear")
      .showLegend(true)
    ;
    rangeChart.dispatch.on('renderEnd', function () {
      //console.log("rendered...");
    });
    nv.addGraph(rangeChartBuilder);
  }

  var renderChart = function(datum) {
    if (!datum) return;
    d3.select("#rangeChartContainer svg")
    .datum(
      datum
    ).call(rangeChart);
    rangeChart.update();
  };

  if (!window.rangeChart) {
    addGraphRangeChart();
  }
  
  var selectedWsProc = function() {
    return getProcedureById(
      selectedRowData().worksheet.procedureId
      )
    ;
  }

  findselectedProcWsUut = function() {
    return _.findWhere(
      selectedWsProc().variables,
      {'kind': 'UUT'}
      )
    ;
  }

  var selectedWsProcHasUut = function() {
    return !! findselectedProcWsUut()
    ;
  }

  var xAxisKey = function() {
    return selectedWsProcHasUut() ? findselectedProcWsUut().name : 'y';
  }

  var allRows = function() {
    var rows = Spreadsheets.findOne()
      .worksheets
      .map(function(w){
        return w.rows;
      })
    ;
    return _.flatten(rows);
  }

  var filterRowsBySelectedUutRangeId = function() {
    var uutVarName = xAxisKey();
    var uutRangeId = selectedRowData().row[uutVarName + 'RangeId'];
    Session.set('rangeChartReference', uutRangeId);
    var datum = _.filter(allRows(),
      function(r) {
        return r._results[uutVarName + 'RangeId'] === uutRangeId;
      }
    );
    return rangeDatum(datum);
  }

  var filterRowsByWsId = function() {
    var wsId = selectedRowData().worksheet._id;
    Session.set('rangeChartReference', wsId);
    var datum = _.filter(allRows(),
      function(r) {
        return r._results.worksheetId === wsId;
      }
    );
    return rangeDatum(datum);
  }

  var rangeChartDatum = function() {
    try {
      var datum;
      var xKey = xAxisKey();

      var itsACalibration;
      if (xKey === 'y') {
        itsACalibration = false;
      } else {
        itsACalibration = true;
      }

      if (itsACalibration) {
        datum = filterRowsBySelectedUutRangeId();
      } else {
        datum = filterRowsByWsId();
      }
      return datum;
    } catch (e) {
      
    }
  }

  this.autorun(function() {
    var datum = rangeChartDatum();
    var rangeChartReferenceCurr = Session.get('rangeChartReference');
    
    if ( ( Session.get('rangeChartReference') !== that.rangeChartReferencePrev ) || Session.get('rangeChartUpdate') ) {
      //$("#rangeChartContainer svg").html('');
      //renderChart([]);
      window.setTimeout(function() {
        renderChart(datum);
      }, 100);
      that.rangeChartReferencePrev = rangeChartReferenceCurr;
      Session.set('rangeChartUpdate', false);
    }
  });

};

Template.rangeChart.events({
  'click #redrawRangeChartBtn': function(evt) {
    rangeChartNoData();
    Session.set("selectedRowUutRangeId", undefined);
  }
});
