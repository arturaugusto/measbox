window.CREATING_NEW_ROW = false;
Template.worksheets.rendered = function() {
  var that = this;
  this.changedCellsTimeout = null;
  this.cellChangeTimer = null;
  
  var editorDiv = $(".editTable")[0];
  if (!editorDiv) {
    return;
  }
  var editor = new EditTable(editorDiv, {
    colOffset: 1,
    cantMoveBelow: function(_td) {
      addNewRow(Session.get("selectedWorksheetId"));
    },
    deleteWhenNull: function(td) {
      var path = td
      .getAttribute("db-path")
      .split(".")
      .splice(0,4)
      .join(".")+"._deleted";
      setData(path, true);
    },
    onStartEdit: function(td) {
      //that.clearRowTimeout(td);
    },
    
    onChange: function(td) {
      $(td).attr("changed", true);
      clearTimeout(that.changedCellsTimeout);
      that.changedCellsTimeout = setTimeout(function() {
        setChangedCells(function(data) {
          var uniqChangedRowsPath = _.uniq(
            _.keys(data).map(function(path) {
              return path.split(".").slice(0,4).join(".");
            })
          );
          uniqChangedRowsPath.map(function(path) {
            // TODO: Use some lib to get item by dot-notation
            // Get rows for path
            var rows = _.findWhere(Spreadsheets.findOne().worksheets,
              {_id: Session.get("selectedWorksheetId")}
            ).rows;
            // Get data from row, by index from the path
            var rowData = rows[parseInt(path.split(".rows.")[1])];
            
            try {
              UncertantyAnalizer(rowData, path, that.data._id);
            }
            catch (e) {
              console.log(e);
            }
            
          });
        });
      }, 2000);
    },
    onSelectedCellChange: function(td) {
      var $row = $(td).parent();
      if ($row[0].tagName !== "TR") return;
      var id = $row.attr("id");
      if (!id || id === "") return;
      clearTimeout(that.cellChangeTimer);
      try {
        that.cellChangeTimer = setTimeout(function() {
          Session.set("selectedRow", {
            "id": $row.attr("id"),
            "worksheetId": Session.get("selectedWorksheetId")
          });
        }, 400);
      }
      catch (e) {
        console.log(e);
      }
    }
  });

};

Template.worksheets.onCreated(function() {
});


Template.worksheets.helpers({
  sessionVarUpdate: function() {
    return Session.get("selectedWorksheetId");
  },

  readoutContent: function(content) {
    return '<span class="cellContentWrap">'+content+'</span>';
  },
  procedureIdIsNothing: function() {
    return isNothing(this.procedureId);
  },
  instrumentIdIsNothing: function(worksheetIndex) {
    var worksheet = Spreadsheets
    .findOne()
    .worksheets[worksheetIndex];
    if (worksheet === undefined) {
      return;
    }
    var instrumentId = worksheet[this.name+"InstrumentId"];
    return isNothing(instrumentId);
  },  
  procedureLabelAndIdMap: function() {
    var that = this;
    var res = Spreadsheets
    .findOne()
    .procedures
    .map(function(p) {
      var isSelected = "";
      if (that.procedureId === p._id) {
        isSelected = "selected";
      }
      return {
        value: p._id,
        label:p.functionalityTags.toString(),
        isSelected: isSelected
      };
    });
    return res;
  },
  colHeaders: function() {
    var Procedure = getProcedureById(this.procedureId);
    if (Procedure === undefined) {
      return;
    }
    var res = Procedure.variables.map(function(v) {
      var arr = [];
      var n = v.kind === "Influence" ? 0 : Procedure.n-1;
      for (var i = 0; i <= n; i++) {
        arr.push({
          name: v.name,
          index: i,
          isInfluence: v.kind === "Influence"
        });
      }
      return arr;
    });
    resFlatten = _.flatten(res);
    return resFlatten;
  },
  plusOne: function  (x) {
    return x+1;
  },
  rowsWithIndex: function() {
    var rowsWithDBIndex = this.rows.map(function(r, index) {
      r.dbIndex = index;
      return r;
    })

    var nonDeletedRows = _.filter(rowsWithDBIndex, function(r) {
      if (r.hasOwnProperty("_deleted")) {
        return !r._deleted;
      }
      return true;
    });

    if (!nonDeletedRows.length && !window.CREATING_NEW_ROW) {
      window.CREATING_NEW_ROW = true;
      addNewRow(this._id);
      // Compensates the small delay that blaze have
      // to re-render the template, avoiding seeding
      // multiple rows
      window.setTimeout(function(){
        window.CREATING_NEW_ROW = false;
      }, 500);

    }
    return nonDeletedRows.map(function(row, index) {
      obj = {
        row: row,
        index: index+1,
        id: row._id,
        dbIndex: row.dbIndex
      };
      return obj;
    });
  },
  variablesWithIndex: function(procedureId, worksheetIndex, rowDBIndex, worksheet) {
    var that = this;
    var Procedure = getProcedureById(procedureId);
    if (Procedure === undefined) {
      return;
    }
    var res = Procedure.variables.map(function(v) {
      var readouts = that.row[v.name];

      /* TODO: for fixed instrument:
        set n = 0 
        set readonly cell
        set value of instrument on cell
      var varInstrumentId = (worksheet[v+"InstrumentId"]);
      getInstrumentById(varInstrumentId);
      */
      
      var n = v.kind === "Influence" ? 0 : Procedure.n-1;

      var readoutsIsUndefined = (readouts === undefined);
      var readoutsIsNotObject = (typeof readouts !== "object")
      if ( readoutsIsNotObject || readoutsIsUndefined) {
        readouts = [];
      }
      var readoutsIsEmpty = !readouts.length;
      var readoutsIsNull = (readouts === null);

      if ( readoutsIsNull || readoutsIsEmpty ) {
        // Create buffer array if variable dont exists on db
        for (var i = n; i >= 0; i--) {
          readouts.push(null);
        }
        var dbPath = "worksheets."+worksheetIndex+".rows."+rowDBIndex+"."+v.name;
        var data = {};
        data[dbPath] = readouts;
        setData(data);
      }

      return readouts.slice(0, n+1).map(function(readout, readoutIndex) {
        var color;
        if (_.findWhere(Procedure.variables, {name: v.name}) !== undefined) {
          color = _.findWhere(Procedure.variables, {name: v.name}).color;
        }
        var obj = {
          readout: readout,
          readoutIndex: readoutIndex,
          varName: v.name,
          color: color
        };
        return obj
      });
    });
    var resFlatten  = _.flatten(res);
    return resFlatten;
  },
  firstIndex: function (index) {
    return index === 0;
  },
  variables: function(procedureId) {
    var Procedure = getProcedureById(procedureId);
    if (Procedure === undefined) {
      return;
    }
    var res = [];
    for (var i = 0; i < Procedure.variables.length; i++) {
      res.push({
        name: Procedure.variables[i].name
      });
    }
    return res;
  },
  instrumentNameAndIdMap: function(varName, parent) {
    var res = Spreadsheets
    .findOne()
    .instruments
    .map(function(i) {
      var isSelected = "";
      if (parent[varName+"InstrumentId"] === i._id) {
        isSelected = "selected";
      }
      return {
        id: i._id,
        name: i.name,
        isSelected: isSelected
      }
    });
    return res;    
  }
});
Template.worksheets.events({
  'change select': function(evt) {
    setFieldData(evt.target);
  },
  'click .remove-worksheet': function(evt) {
    Meteor.call("removeArrayItem", getDocumentId(), "worksheets", this._id);
  }
});
