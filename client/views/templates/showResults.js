this.worksheetById = function(id) {
  var worksheet = _.findWhere(
    Spreadsheets
    .findOne()
    .worksheets,
    {"_id": id}
  );
  return worksheet;
};

this.selectedRowData = function() {
  var selectedRow = Session.get("selectedRow");
  if (selectedRow === undefined) return false;

  var worksheet = worksheetById(selectedRow.worksheetId);

  if (worksheet === undefined) return [];
  var row = _.findWhere(
    worksheet.rows, 
    {"_id": selectedRow.id}
  );
  if (!row) return false;
  return {row: row, worksheet: worksheet};
};

this.paddedLinesData = function(ciLow, ciHigh, yMax) {
  return [
    {x:ciLow,y:0.0},{x:ciLow,y:yMax}, // low endpoint

    {x:ciLow,y:null}, // pad center
    
    {x:ciHigh,y:0.0},{x:ciHigh,y:yMax} // high endpoint
  ]
}

var EMPTY_CHART_DATA = [{
  type: "line",
  yAxis: 1,
  values: [],
  key: ""
}];

this.histogramDatum = function(data) {
  if (data === undefined) return EMPTY_CHART_DATA;
  if (data.row === undefined) return EMPTY_CHART_DATA;
  if (data.row._results === undefined) return EMPTY_CHART_DATA;
  // MC data
  var hist = data.row._results.mc.histogram;
  var histRows = [];
  for (var i = 0; i < hist.x.length; i++) {
    histRows.push({x: hist.x[i], y: hist.y[i] });
  }

  // GUM data
  var gumCurve = data.row._results.mc.gum_curve;
  var y = data.row._results.y;
  var U = data.row._results.U;
  var sci = data.row._results.mc.sci_limits;
  var histSize = hist.x.length;

  //var gumMaxY = Math.max.apply(0,gumCurve); // TODO optimize
  var mcMaxY = Math.max.apply(0,hist.y);

  var axUnit = data.row._results.outputUnit;
  if (axUnit === "" || axUnit === undefined) axUnit = "unit";

  pdfChart.xAxis.axisLabel("("+axUnit+")");
  pdfChart.yAxis.axisLabel("Probability density/(1/" + axUnit + ")");


  var gumColor = "#EC0000";
  var mcColor = "#C1C1C1";

  return [
    {
      type: "line",
      yAxis: 1,
      values: gumCurve,
      key: "GUM",
      color: gumColor
    }
    ,
    {
      type: "line",
      yAxis: 1,
      values: paddedLinesData(y-U, y+U, mcMaxY),
      key: "GUM end points",
      color: gumColor,
      classed: 'dashed'
    }
    ,
    {
      type: "line",
      yAxis: 1,
      values: histRows,
      key: "MC",
      color: mcColor
    }
    ,
    {
      type: "line",
      yAxis: 1,
      values: paddedLinesData(sci[0], sci[1], mcMaxY),
      key: "MC end points",
      color: "#0018EC"
    }
  ];
};

Template.showResults.rendered = function() {
  var that = this;
  this.selectedRowUutRangeIdTOId = undefined;
  window.pdfChart = nv.models.lineChart()
    .margin({left: 100, bottom: 100})
    //.useInteractiveGuideline(true)
    .duration(250)
    .showXAxis(true)
  ;
  var axUnit = "unit";
  
  nv.addGraph(function() {
    pdfChart.xAxis
      .tickFormat(d3.format(',.5e'));
    pdfChart.yAxis
      .tickFormat(d3.format(',.1e'));
    pdfChart
      .showLegend(true);
    pdfChart.tooltip.contentGenerator(
      function (obj) {
        var dataSrc = obj.point || obj.data;
        return obj.series[0].key + 
               "<br>y: "+(dataSrc.y || 0).toExponential(10)+
               "<br>x: "+(obj.value || 0).toExponential(10);
      })
    ;


    pdfChart.dispatch.on('renderEnd', function () {
      //console.log("rendered pdf");
      if (Session.get("processing") === true) {
        that.selectedRowUutRangeIdTOId = setTimeout(function() {
          // Enable reactive render range chart
          Session.set("selectedRowUutRangeId", undefined);
        }, 1000);
      } else {
        clearTimeout(that.selectedRowUutRangeIdTOId);
      }
      
      Session.set("processing", false);
    });

    this.data = selectedRowData();
    d3.select("#pdfChartContainer svg").datum(
      histogramDatum(this.data)
    ).call(pdfChart);
    nv.utils.windowResize(function() { 
      pdfChart.update();
      // Fix when chart have long values on legend
      //$("#pdfChartContainer svg").width("120%");
    });
    return pdfChart;
  });

  this.autorun(function() {
    that.data = selectedRowData();
    if (!that.data) return;
    
    that.datum = histogramDatum(that.data);
    Session.set("pdfDatum", that.datum);
    if (!that.datum.length) return;
  });

  this.autorun(function() {
    var pdfDatum = Session.get("pdfDatum");
    if (!pdfDatum) return;
    d3.select("#pdfChartContainer svg")
    .datum(
      pdfDatum
    ).call(pdfChart);
  });

};


Template.showResults.helpers({
  rowData: function(argument) {
    var data = selectedRowData().row;
    return data;
  },
  uncertaintiesChartDatum: function() {

    var data = selectedRowData();
    if (!data) return [];
    if (!data.row) return [];
    var results = data.row._results;
    if (!results) return [];
    var worksheet = data.worksheet;
    var uncertainties = results.uncertainties;

    var max = Math.max.apply(void 0, results.ci_ui);

    var datum = uncertainties.map(function(v, i) {
      var contribution = results.ci_ui[i];
      return {
        label: results.uncertainties_var_names[i]+"."+v.name,
        value: v.value,
        //coef: (1-Math.abs(results.ci[i])) < 0.005 ? 1 : results.ci[i].toExponential(2),
        coef: results.ci[i].toExponential(1),
        contribution: contribution.toExponential(3)+" "+(results.outputUnit || ""),
        type: v.type,
        distribution: v.distribution,
        _barWidth: (contribution/max)*100,
        _barY: i*20,
        _barColor: percentToRGB((contribution/max)*85)
      }
    });

    var resultsSorted = _.sortBy(datum, "value");
    
    var resultsClean = [];
    // Remove zero and reverse array
    for (var i = resultsSorted.length - 1; i >= 0; i--) {
      if (resultsSorted[i].value > 0) {
        resultsClean.push(resultsSorted[i]);
      }
    }
    return resultsClean;

    // Idea: open range
    //x = $('#instruments [data-schematype="random_number"]').find("input[type='text']").filter(function(){return this.value === 'hbjLk4ymAaebr34fA'}).closest(".row").prev().position()
    //$(JsonEditorInstances.instruments.editors.root.toggle_button).click()

    //Scroll to range example
    //http://jsfiddle.net/x36Rm/

  }
})