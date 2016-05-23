var EMPTY_CHART_DATA = [{
  values: [],
  key: ""
}];

var COLOR_SCHEMA = ["#4D4D4D", "#5DA5DA", "#FAA43A", "#60BD68", "#F17CB0", "#B2912F", "#B276B2", "#DECF3F", "#F15854"];

nv.utils.symbolMap.set('error-bar-line', function(size) {
  size = Math.sqrt(size)*4;
  return 'M' + (-size/2) + ',0' +
         'h' + size
});

nv.utils.symbolMap.set('thin-x', function(size) {
  size = Math.sqrt(size);
  return 'M' + (-size/2) + ',' + (-size/2) +
          'l' + size + ',' + size +
          'm0,' + -(size) +
          'l' + (-size) + ',' + size;
});

var buildRangeTitle = function(range, instrument) {
  var rangeTitle = instrument.name + 
  " (" + range.limits.start + 
  " .. " + 
  range.limits.end + " " + instrument.unit + 
  ")";
  return rangeTitle;
}


var setChartRangeTitle = function(rangeTitle, uutRangeId) {

  var $el = $("#rangeChartTitle");
  var prevRangeId = $el.data("rangeId");
  if (prevRangeId !== uutRangeId) {
    rangeChartNoData();
    $el.data({rangeId: uutRangeId});
    $el.html(rangeTitle);
  }  
}
// get only items from selected row range
var selectedRangeData = function(notDeleted) {
  // Return if no data exists
  if (!notDeleted.length) {
    return;
  }
  var selectedRowId;
  var selectedRowWorksheetId;

  var selectedRow = Session.get("selectedRow");
  if (!selectedRow) {
    selectedRowId = notDeleted[0]._id;
    selectedRowWorksheetId = notDeleted[0].worksheetId;
  } else {
    selectedRowId = selectedRow.id;
    selectedRowWorksheetId = selectedRow.worksheetId;
  }
  
  var selectedRowData = _.findWhere(
    notDeleted, {_id: selectedRowId}
  );

  if (!selectedRowData._results) return;

  var worksheets = Spreadsheets.findOne().worksheets
  var worksheet = _.findWhere(
    Spreadsheets.findOne().worksheets, 
    {_id: selectedRowWorksheetId}
  ) || worksheets[0];

  var uutName = selectedRowData._results.uutName;
  var uutRangeId = selectedRowData[uutName+"RangeId"];
  var instrument;
  try {
    var instrument = getInstrumentById(worksheet[uutName+"InstrumentId"]);
  }
  catch (e) {
    //
  }
  
  var uutRange = _.findWhere(instrument.ranges, {_id: uutRangeId});
  var rangeTitle = buildRangeTitle(uutRange, instrument);
  setChartRangeTitle(rangeTitle, uutRangeId);

  var selectedRowRangeData = _.filter(notDeleted, function(r) {
    return r[uutName+"RangeId"] === uutRangeId;
  });
  return selectedRowRangeData;
}

var rangeDatum = function() {
  var rows = Spreadsheets
    .findOne()
    .worksheets
    .map(function(w){
      return w.rows
    });
  
  var flattenRows = _.flatten(rows);

  var notDeleted = _.filter(flattenRows,
    function(r) {
      return !r._deleted
    }
  );

  var selectedRowRangeData = selectedRangeData(notDeleted);
  if (!selectedRowRangeData) return;

  // Set chart unit
  var axUnit = selectedRowRangeData[0]._results.uutUnit;
  rangeChart.xAxis.axisLabel("("+axUnit+")");
  rangeChart.yAxis.axisLabel("output (" + axUnit + ")");

  var definedPoints = _.filter(selectedRowRangeData.map(function(r){
    return r._results
    }), function(r){
      return r !== undefined
    }
  );
  
  /*
  var definedPointsLen = definedPoints.length;
  var size = (definedPoints[0].x - definedPoints[definedPointsLen-1].x) / (definedPointsLen)+10;
  */
  var size = 0;
  var pointsData = [];
  var pointsDataMPE = [];
  definedPoints.map(function(p, i) {
    // Trend line center
    pointsData.push({
      _group: p._groups.toString(),
      x: p.uutReadout,
      y: p.y,
    });
    // goto bottom error bar
    pointsData.push({
      _group: p._groups.toString(),
      x: p.uutReadout,
      y: p.y-p.U,
      shape: "error-bar-line",
      size: size
    });
    // goto top error bar
    pointsData.push({
      _group: p._groups.toString(),
      x: p.uutReadout,
      y: p.y+p.U,
      shape: "error-bar-line",
      size: size
    });
    pointsData.push({
      _group: p._groups.toString(),
      x: p.uutReadout,
      y: p.y,
      size: 0
    });
    // MPE+
    pointsDataMPE.push({
      _group: p._groups.toString(),
      _pos: "top",
      shape: "thin-x",
      x: p.uutReadout,
      y: +p.mpe
    });
    // MPE-
    pointsDataMPE.push({
      _group: p._groups.toString(),
      _pos: "bottom",
      shape: "thin-x",
      x: p.uutReadout,
      y: -p.mpe
    });

  });

  var pointsDataGrouped = _.groupBy(pointsData, "_group");
  var data = [];
  _.keys(pointsDataGrouped).map(function(k, i) {
    var obj = {
      key: k,
      yAxis: 1,
      type: "line",
      values: pointsDataGrouped[k],
      color: COLOR_SCHEMA[i]
    };
    data.push(obj);

    var groupMpeTOP = _.filter(pointsDataMPE, function(p){
      return (p._group === k) && (p._pos === "top");
    });
    var objMpeTop = {
      key: k + " (MPE+)",
      yAxis: 1,
      type: "line",
      values: groupMpeTOP,
      classed: 'dashed',
      color: COLOR_SCHEMA[i]
    };
    data.push(objMpeTop);

    var groupMpeTBOTTOM = _.filter(pointsDataMPE, function(p){
      return (p._group === k) && (p._pos === "bottom");
    });
    var objMpeBOTTOM = {
      key: k + " (MPE-)",
      yAxis: 1,
      type: "line",
      values: groupMpeTBOTTOM,
      classed: 'dashed',
      color: COLOR_SCHEMA[i]
    };
    data.push(objMpeBOTTOM);
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
      return obj.point._group+"<br>y: "+obj.point.y.toExponential(3);
    })
  ;
  //$("#rangeChartContainer")
  //.css({"padding-top": $(".middle-row").height()+"px"});
  
  try {
    rangeChart.update();
  } catch (e) {
    //
  }
  function addZoom(options) {
    // scaleExtent
    var scaleExtent = 10;
    
    // parameters
    var yAxis       = options.yAxis;
    var xAxis       = options.xAxis;
    var xDomain     = options.xDomain || xAxis.scale().domain;
    var yDomain     = options.yDomain || yAxis.scale().domain;
    var redraw      = options.redraw;
    var svg         = options.svg;
    var discrete    = options.discrete;
    
    // scales
    var xScale = xAxis.scale();
    var yScale = yAxis.scale();
    
    // min/max boundaries
    var x_boundary = xScale.domain().slice();
    var y_boundary = yScale.domain().slice();
    
    // create d3 zoom handler
    var d3zoom = d3.behavior.zoom();
    
    // ensure nice axis
    xScale.nice();
    yScale.nice();
       
    // fix domain
    function fixDomain(domain, boundary) {
      if (discrete) {
        domain[0] = parseInt(domain[0]);
        domain[1] = parseInt(domain[1]);
      }
      domain[0] = Math.min(Math.max(domain[0], boundary[0]), boundary[1] - boundary[1]/scaleExtent);
      domain[1] = Math.max(boundary[0] + boundary[1]/scaleExtent, Math.min(domain[1], boundary[1]));
      return domain;
    };
    
    // zoom event handler
    function zoomed() {
      yDomain(fixDomain(yScale.domain(), y_boundary));
      xDomain(fixDomain(xScale.domain(), x_boundary));
      redraw();
      $('#redrawRangeChartBtn').show();
    };

    // zoom event handler
    function unzoomed() {
      xDomain(x_boundary);
      yDomain(y_boundary);
      redraw();
      d3zoom.scale(1);
      d3zoom.translate([0,0]);
    };
    
    // initialize wrapper
    d3zoom.x(xScale)
        .y(yScale)
        .scaleExtent([1, scaleExtent])
        .on('zoom', zoomed);
        
    // add handler
    d3.select('#rangeChartContainer').call(d3zoom).on('dblclick.zoom', unzoomed);
  };

  // add zoom
  addZoom({
    xAxis  : rangeChart.xAxis,
    yAxis  : rangeChart.yAxis,
    yDomain: rangeChart.yDomain,
    xDomain: rangeChart.xDomain,
    redraw : function() { rangeChart.update() },
    svg    : d3.select("#rangeChartContainer svg")
  });    

  nv.utils.windowResize(function() { rangeChart.update(); });
  return rangeChart;
}

var rangeChartNoData = function() {
  // Remove tooltip
  try {
    $(rangeChart.tooltip.node()).remove();
  }  catch (e) {
    //
  }
  
  // Clean chart
  $("#rangeChartContainer svg").html("");
  addGraphRangeChart();
}


var addGraphRangeChart = function() {
  window.rangeChart = nv.models.lineChart()
    .interpolate("linear")
    .showLegend(true)
  ;
  nv.addGraph(rangeChartBuilder);
}

var renderChart = function() {
  if (!window.rangeChart) {
    addGraphRangeChart();
  };

  var datum = rangeDatum();
  if (!datum) return;
  d3.select("#rangeChartContainer svg")
  .datum(
    datum
  ).call(rangeChart);
  rangeChart.update();
  $('#redrawRangeChartBtn').hide();
};

Template.rangeChart.rendered = function() {
  var that = this;
  this.autorun(renderChart);

};


Template.rangeChart.events({
  'click #redrawRangeChartBtn': function(evt) {
    rangeChartNoData();
    renderChart();
  }
});
