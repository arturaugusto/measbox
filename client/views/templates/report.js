Template.report.helpers({
  currentRowInstrument: function(rows) {
    var inst = getInstrumentById(rows[0].uutInstrumentId);
    return inst;
  },
  lenOf: function(arr) {
    return arr.length;
  },
  keyResult: function(keys, report) {
    var res = keys.map(function(k) {
      return _.findWhere(report, {'parameterTemplateRes': k});
    });
    return res;
  },
  proceduresResultTemplates: function () {
    var templByProc = Spreadsheets.findOne().procedures.map(function(p) {
      return p.additionalOptions.resultsTemplate
    }).map(function(res) { 
      return res;
    });
    var resKeys = [];
    var res = [];
    _.flatten(templByProc)
      .map(function(t){
        var obj;
        var resKey = t.parameterTemplate;
        if ( (resKeys.indexOf(resKey) === -1) && (t.toReport) ) {
          obj = {};
          obj[resKey] = t.valueTemplate;
          obj['toReport'] = t.toReport || true;
          res.push(obj);
          resKeys.push(t.parameterTemplate);
        }
      });
    console.log(res);
    return {'res': res, 'keys': resKeys};
  },
  rowrangeTitle: function(rows) {
    var inst = getInstrumentById(rows[0].uutInstrumentId);
    var rangeId = rows[0].uutRangeId;
    var range = _.findWhere(inst.ranges, {"_id": rangeId} );
    return range;
  },
  reportData: function() {
    var allRows = _.flatten(
      Spreadsheets.findOne()
      .worksheets.map(
        function(ws){
          return _.pluck(ws.rows, "_results");
        }
      )
    );
    var allRowsByInstrument = _.groupBy(allRows, "uutInstrumentId");
    var calibratedInstrumentsData = [];
    var data;
    Spreadsheets.findOne().instruments.map(function(inst){
      var dataRangeGrouped = {};
      var rowsForRangeGroup = [];
      data = allRowsByInstrument[inst._id];
      if (data) {
        calibratedInstrumentsData.push(data);
      }
    });
    return calibratedInstrumentsData;
  }
});

Template.report.rendered = function() {
  var that = this;
  this.autorun(function() {

  });
};