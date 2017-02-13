// From https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa
// ucs-2 string to base64 encoded asii
this.utoa = function(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}
// base64 encoded ascii to ucs-2 string
this.atou = function(str) {
  return decodeURIComponent(escape(window.atob(str)));
}
this.captalize = function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
this.uncaptalize = function (str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
};
this.captalizeAndSingularize = function(str){
  return captalize(Pluralize.singular(str));
}
this.traverseDataByPathArr = function(pathArr){
  var res = Spreadsheets.findOne();

  for (var i = 0; i < pathArr.length; i++) {
    if ((res !== undefined) && (res !== null)) {
      var n = parseInt(pathArr[i]);
      if (isNaN(n)) {
        res = res[pathArr[i]];
      } else {
        res = res[n];
      }
    }
  }
  return res;
}
this.getDocumentId = function() {
  return Spreadsheets.findOne()._id;
};

/*this.setNestedFieldData = function(el) {
  var parent = el.getAttribute("data-parent");
  var parentId = el.getAttribute("data-parent-id");
  var field = el.getAttribute("name");
  var data = el.value;
  Meteor.call("setNestedFieldData", getDocumentId(), parent, parentId, field, data);
}*/


this.findIds = function(idArr) {
  return $.find( idArr.map( function(id) { return "#"+id} ).toString() );
}

this.indexOfCurrentWorksheet = function() {
  var ids = _.pluck(Spreadsheets.findOne().worksheets, "_id");

  return _.indexOf(
    ids, 
    Session.get("selectedWorksheetId")
  );
}

this.addNewRow = function (n, position, rows, isRedo) {
  var data;
  //if ( (rows === undefined) || (rows[0] === undefined) || (!rows.length) ) {
  //if (!isRedo) {
  if (true) {
    rows = [];
    var id;
    for (var i = n - 1; i >= 0; i--) {
      id = Random.id();
      rows.push({
        _id: id
      });
    }
  }
  data = { 
    $each: rows,
    $position: position
  }

  Meteor.call(
    "setNestedFieldData",
    getDocumentId(),
    "worksheets",       //parent
    Session.get("selectedWorksheetId"), //parentId
    "rows",             //field
    data,               //data
    "$push",        //operator
    function(err, cbData) {
      refreshEditTable();
      /*
      //Not implemented yet
      if (!isRedo) {
        Session.set( "addedRowsIdsArr", _.pluck(rows, '_id') );
      } else {
        Session.set( "addedRowsIdsArr", [] );
      }
      */
    }
  );
}

this.getIndexOfCurrentWorksheet = function() {
  return _.indexOf(
    _.pluck(
      Spreadsheets.findOne().worksheets,
      "_id"
    ), 
    Session.get("selectedWorksheetId")
  )
}

this.getChangedRows = function() {
  return $('tr[changed=true]');
}

this.buildElRowData = function(el) {
  var rowId;
  rowId = el.getAttribute("id");
  var rowData;
  rowData = getSelectedWorksheetRowById(rowId);
  var extractedRowData;
  extractedRowData = extractRowDOMData(el);
  var varNameGroups;
  varNameGroups = _.groupBy(extractedRowData, 'varName');
  var varNameGroupsKeys;
  varNameGroupsKeys = _.keys(varNameGroups);
  varNameGroupsKeys.map(function(k) {
    var kData = []
    for (var i = 0; i < varNameGroups[k].length; i++) {
      kData.push(varNameGroups[k][i].value);
    }
    rowData[k] = kData;
  });
  var key = $(el).attr("db-path");
  var data = {};
  data[key] = rowData;
  return data;
}

this.changedRowsPaths = function() {
  that.uniqChangedRowsPath = _.uniq(
    _.keys(data).map(function(path) {
      //console.log(path);
      return path.split(".").slice(0,4).join(".");
    })
  );
}


this.updateWsHistory = function(dataHistory) {
  var dataToSetHistory = {};
  var pathToSetHistory = 'worksheets.'+indexOfCurrentWorksheet()+'.dataHistory';
  dataToSetHistory[pathToSetHistory] = dataHistory;
  setData(dataToSetHistory);  
}

this.computeUncertainties = function(scope) {
  var $changedRows = getChangedRows();

  $changedRows.each(function(i, el) {
    var path = el.getAttribute("db-path");
    // TODO: Use some lib to get item by dot-notation
    // Get rows for path
    var rows = _.findWhere(Spreadsheets.findOne().worksheets,
      {_id: Session.get("selectedWorksheetId")}
    ).rows;
    // Get data from row, by index from the path
    var rowData = rows[parseInt(path.split(".rows.")[1])];
    console.log(rowData);
    
    try {
      UncertantyAnalizer(rowData, path, scope.data._id);
      $(el).removeAttr('changed');
    }
    catch (e) {
      Session.set('processing', false);
      //nem sempre quando calcula, o resultado novo se mantem no db... pq?
      //$(el).removeAttr("changed");
      console.log(e);
    }
  });
  window.setTimeout(rangeChartMustRedraw, 1000);
  //$(el).removeAttr("changed");
}

this.rangeChartMustRedraw = function() {
  Session.set('rangeChartUpdate', true);
}

this.calculatePendingRows = function(scope, delay) {
  clearTimeout(scope.changedCellsTimeout);
  scope.changedCellsTimeout = setTimeout(function() {

    var that = this;
    var $changedRows = getChangedRows();
    var $changedRowsLen = $changedRows.length;
    $changedRows.each(function(i, el) {
      setData( buildElRowData(el) );
      if (i === $changedRowsLen - 1 ) {
        Session.set('processing', true);
        window.setTimeout(function() {
          computeUncertainties(scope);
        }, 1000);
        updateWsHistory(editor.dataHistory);
      }
    });
  }, delay);
  return;
}

this.removeRows = function(rowIds) {
  var rowIdObjArr = rowIds.map(function(id) {
    return {
      _id: id
    }
  });
  Meteor.call(
    "removeTableRow",
    getDocumentId(),
    getIndexOfCurrentWorksheet(),
    {$or: rowIdObjArr},
    function(err, cbData) {
      refreshEditTable();
    }    
  );  
}

this.getCurrentWorksheet = function() {
  var currWorksheet = _.findWhere(
    Spreadsheets.findOne()['worksheets'], 
    {'_id': Session.get("selectedWorksheetId")}
  );
  return currWorksheet;
}

this.getSelectedWorksheetRowById = function(id) {
  var currWorksheet = getCurrentWorksheet();
  return _.findWhere(currWorksheet.rows, {'_id': id});
}


this.extractRowDOMData = function(tr) {
  var varName;
  var data = [];
  var obj;
  $(tr).children().each(function(i, td){
    varName = td.getAttribute('var-name');
    if ((varName !== null) && (varName !== undefined)) {
      obj = {};
      obj.varName = varName;
      obj.value = td.innerHTML;
      data.push(obj);
    }
  });
  return data;
}

this.getAddRowQtd = function(id) {
  return qtd = parseInt(
    $(".editTableContextMenu").
    find("#"+id)
    .val()
  );
}

this.setData = function(data, cb) {
  Meteor.call("setData", getDocumentId(), data, function(err, cbData) {
    // Run callback form client only when data is ready
    if (typeof cb === "function") {
      cb(data);
    }
  });
}

this.setRowDeletedProp = function(row, toBeDeleted) {
  var dbPath;
  var data = {};
  dbPath = row.getAttribute('db-path');
  data[dbPath+"._deleted"] = toBeDeleted;
  setData(data);
}

this.setFieldData = function(el, cb) {
  var path = el.getAttribute("db-path");
  var data = {};
  var nodeName = el.nodeName;
  if (nodeName === "SELECT") {
    data[path] = el.value;
  } else {
    data[path] = $(el).text();
  }
  setData(data, cb);
}

this.mathjsResult = function (expr, scope) {
  var data = mathjs.eval(expr, scope);
  if (typeof data === "object") {
    var len = data.entries.length;
    return data.entries[len-1];
  } else {
    return data;
  }
}

this.isNothing = function (x) {
  return (x === null) || (x === "") || (x === undefined) || (x === NaN);
}

this.getArrayItemById = function (id, arrayName) {
  return _.findWhere(
    Spreadsheets
    .findOne()[arrayName],
    {_id: id}
  );
}


prefixVal = function(k) {
  var kVal, prefixes;
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
  return kVal = (prefixes[k] === void 0 ? 1 : prefixes[k]);
};

this.getInstrumentById = function (id) {
  return getArrayItemById(id, "instruments");
}
this.getProcedureById = function (id) {
  return getArrayItemById(id, "procedures");
}

this.viewPortHeight = function () {
  return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
}

percentToRGB = function(percent) {
  var b, g, r;
  if (percent === 100) {
    percent = 99;
  }
  r = void 0;
  g = void 0;
  b = void 0;
  if (percent < 50) {
    r = Math.floor(255 * percent / 50);
    g = 255;
  } else {
    r = 255;
    g = Math.floor(255 * (50 - (percent % 50)) / 50);
  }
  b = 0;
  return 'rgb(' + r + ',' + g + ',' + b + ')';
};

// http://stackoverflow.com/questions/641857/javascript-window-resize-event
this.addEvent = function(object, type, callback) {
  if (object == null || typeof(object) == 'undefined') return;
  if (object.addEventListener) {
    object.addEventListener(type, callback, false);
  } else if (object.attachEvent) {
    object.attachEvent("on" + type, callback);
  } else {
    object["on"+type] = callback;
  }
};

this.refreshEditTable = function(el) {
  Session.set("selectedWorksheetId", "");
  var $target;
  if (el !== undefined) {
    $target = $(el.target);
  } else {
    $target = $(".active .select-worksheet");
  }
  
  setTimeout(function() {
    Session.set("selectedWorksheetId", $target.data("worksheet"));
  }, 30);
}

this.createSpreadsheet = function(content) {  
  Meteor.call(
    "createSpreadsheet",
    content,
    function(err, newSpreadsheetId) {
      $(location).attr('href', './' + newSpreadsheetId);
    }
  );
}

this.rowsRangeData = function(rows, uutInstrument) {
  var rowsData = rows.map(function(row) {
    var result = {};
    var uutName = row._results.uutName;
    var uutRangeId = row[uutName+"RangeId"];
    var range = _.findWhere( uutInstrument.ranges, {"_id": uutRangeId} );
    return {
      res: row._results,
      range: range,
      uutRangeId: uutRangeId
    };
  });
  return _.groupBy( rowsData, "uutRangeId" );
}


this.reportedResultsFromRow = function(results, procedure) {
  var resultsTemplate = procedure.additionalOptions.resultsTemplate;
  var compiledRes = resultsTemplate.map(function(resTemplate) {
    var parameterTemplateCompiled = _.template(resTemplate.parameterTemplate);
    var valueTemplateCompiled = _.template(resTemplate.valueTemplate);
    var parameterTemplateRes = parameterTemplateCompiled(results);
    var valueTemplateRes = valueTemplateCompiled(results);
    return({
      parameterTemplateRes: parameterTemplateRes,
      valueTemplateRes: valueTemplateRes
    });
  });
  return compiledRes;
}

// Confirm before remove json-editor item 
document.addEventListener('click', function(e) {
  var target = e.target;
  var parent = target.parentNode;
  var elementToCheckDelete;
  if (parent.nodeName === 'BUTTON' || parent.nodeName === 'A') {
    elementToCheckDelete = parent;
  } else {
    elementToCheckDelete = target;
  }
  try {
    if ( elementToCheckDelete.className.indexOf('delete') > -1 ) {
      var confirm;
      confirm = window.confirm("Confirm delete this item?");
      if ( !confirm ) {
        e.stopPropagation();
      }
    }
  } catch (e) {
    //
  }
}, true);