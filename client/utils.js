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

this.setNestedFieldData = function(el) {
  var parent = el.getAttribute("data-parent");
  var parentId = el.getAttribute("data-parent-id");
  var field = el.getAttribute("name");
  var data = el.value;
  Meteor.call("setNestedFieldData", getDocumentId(), parent, parentId, field, data);
}

this.setChangedCells = function(cb) {
  var data = {};
  $('td[changed=true]').each(function(i, td){
    var key = $(td).attr("db-path");
    data[key] = $(td).text();
    $(td).removeAttr("changed");
  });
  setData(data, cb);
}

this.setData = function(data, cb) {
  Meteor.call("setData", getDocumentId(), data, function(err, cbData) {
    // Run callback form client only when data is ready
    if (typeof cb === "function") {
      cb(data);
    }
  });
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

this.addNewRow = function (worksheetId) {
  Meteor.call(
    "setNestedFieldData",
    getDocumentId(),
    "worksheets",       //parent
    worksheetId,        //parentId
    "rows",             //field
    {_id: Random.id()}, //data
    "$push"            //operator
  );
}


this.mathjsResult = function (expr, scope) {
  var data = mathjs.eval(expr, scope);
  if (typeof data === "object") {
    var len = data.entries.length;
    return data.entries[len];
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
