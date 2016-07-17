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
  var selectedRow = Session.get("selectedRow")
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

this.histogramDatum = function() {
  var data = selectedRowData();
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

  var axUnit = data.row._results.uutUnit;
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

this.renderResults = function() {
  var data = selectedRowData();
  if (!data.worksheet) return;

  try {
    var procedure = getProcedureById(data.worksheet.procedureId);
    var resultsTemplate = procedure.additionalOptions.resultsTemplate;
    var resultsTemplateCompiled = _.template(resultsTemplate);
    var resultsRendered = kramed.parse(resultsTemplateCompiled(data.row._results));
    var resultsRenderedParsed = $.parseHTML(resultsRendered);
    $("#renderedResult").html(resultsRenderedParsed);
    // Add class to tables rendered from markdown on results
    var $tbl = $("#renderedResult table");
    $tbl.addClass("table table-bordered table-condensed");
    $tbl.prepend("<caption>Results</caption>");

  } catch (e) {
    $("#renderedResult").html("");
    console.log(e);
  }
}

Template.showResults.rendered = function() {
  var that = this;
  window.pdfChart = nv.models.lineChart()
    .margin({left: 100, bottom: 100})
    //.useInteractiveGuideline(true)
    .duration(250)
    .showXAxis(true)
  ;
  var axUnit = "unit";
  
  nv.addGraph(function() {
    pdfChart.xAxis
      .tickFormat(d3.format(',.1e'));
    pdfChart.yAxis
      .tickFormat(d3.format(',.1e'));
    pdfChart
      .showLegend(true);
    pdfChart.tooltip.contentGenerator(
      function (obj) {
        var dataSrc = obj.point || obj.data;
        return obj.series[0].key + 
               "<br>y: "+(dataSrc.y || 0).toExponential(3)+
               "<br>x: "+(obj.value || 0).toExponential(3);
      })
    ;

    d3.select("#pdfChartContainer svg").datum(
      histogramDatum()
    ).call(pdfChart);
    nv.utils.windowResize(function() { 
      pdfChart.update();
    });
    return pdfChart;
  });

  this.autorun(function() {

    renderResults();
    var datum = histogramDatum();
    if (!datum.length) return;

    d3.select("#pdfChartContainer svg")
    .datum(
      datum
    ).call(pdfChart);
    pdfChart.update();
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

    var max = Math.max.apply(void 0, results.ui);

    var datum = uncertainties.map(function(v, i) {
      var contribution = results.ui[i];
      return {
        label: results.uncertainties_var_names[i]+"."+v.name,
        value: v.value,
        coef: (1-Math.abs(results.ci[i])) < 0.005 ? 1 : results.ci[i].toExponential(2),
        contribution: contribution.toExponential(3)+" "+results.uutUnit,
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