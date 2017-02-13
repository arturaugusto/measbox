window.CREATING_FIRST_ROW = false;
Session.set("updateTable", false);
//Session.set( "addedRowsIdsArr", [] ); //Not implemented yet
Template.worksheets.rendered = function() {


  // Default
  Session.set("selectedRow", {"id": '',"worksheetId": ''});

  this.autorun(function() {
    /*
    Not implemented yet
    var addedRowsIdsArr = Session.get("addedRowsIdsArr");
    if (addedRowsIdsArr.length && window.editor) {
      window.setTimeout(function() {
        //console.log(findIds(addedRowsIdsArr));
        window.editor.registerRows(findIds(addedRowsIdsArr));
        Session.set( "addedRowsIdsArr", [] );
      }, 10);
    }
    */
  });

  var that = this;
  this.cellChangeTimer = null;
  this.changedCellsTimeout = null;
  
  var editorDiv = $(".editTable")[0];
  if (!editorDiv) {
    return;
  }
  window.editor = new EditTable(editorDiv, {
    dataHistory: this.data.dataHistory,
    colOffset: 1,
    deleteWhenNull: function(td) {
      var path = td
      .getAttribute("db-path")
      .split(".")
      .splice(0,4)
      .join(".")+"._deleted";
      var data = {};
      data[path] = true;
      setData(data);
    },
    onStartEdit: function() {
      clearTimeout(that.changedCellsTimeout);
    },
    onChange: function(editor) {
      editor.changedRows().map(function(tr) {
        $(tr).attr("changed", true);
      });
      calculatePendingRows(that, 5000);
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
    },
    /*
    //Not implemented yet
    onRowDimiss: function(changes) {
      removeRows(_.pluck( changes, "id" ));
    },
    onRowRecovery: function(change) {
      console.log(change);
      addNewRow(
        1,
        change.y,
        [change.prevData],
        change.isRedo
      );
    },
    */
    beforeContextMenuShow: function(editor) {
      var $undoEl = editor.$contextMenuEl.find('a[name=undo]');
      var $redoEl = editor.$contextMenuEl.find('a[name=redo]');
      var $removeEl = editor.$contextMenuEl.find('a[name=removeRows]');
      if (editor.hasUndo()) {
        $undoEl.removeClass('menuItemDisabled');
      } else {
        $undoEl.addClass('menuItemDisabled');
      }
      if (editor.hasRedo()) {
        $redoEl.removeClass('menuItemDisabled');
      } else {
        $redoEl.addClass('menuItemDisabled');
      }
      if (editor.allRowsSelected()) {
        $removeEl.addClass('menuItemDisabled');
      } else {
        $removeEl.removeClass('menuItemDisabled');
      }


    },
    contextMenuFunctions: {
      removeRows: function(editor) {
        /*
        // Net yet implemented
        var changes = editor.dimissSelectedRow(function(rowId) {
          return _.findWhere(
            worksheetById(Session.get("selectedWorksheetId")).rows,
            { _id: rowId }
          )
        });
        */
        removeRows(_.pluck(editor.getSelectedRows(), "id"));
      },
      undo: function(editor) {
        editor.undo();
      },
      redo: function(editor) {
        editor.redo();
      },
      addRowAbove: function(editor) {
        var refRow = editor.getSelectedRows().first();
        var qtd = getAddRowQtd('addRowAboveVal');
        addNewRow(
          qtd,
          refRow.index()
        );
      },
      addRowBelow: function(editor) {
        var refRow = editor.getSelectedRows().last();
        var qtd = getAddRowQtd('addRowBelowVal');
        addNewRow(
          qtd, 
          refRow.index()+1
        );
      },
      calculate: function($editor) {
        $editor.getSelectedRows().map(function(_i, tr) {
          $(tr).attr("changed", true);
        });
        calculatePendingRows(that, 0);
      }
    },
    contextMenuHTML: `
    <div class="editTableContextMenu">
      <ul>
        <li>
          <span>
            <a href="#" name="addRowAbove">Insert row above</a>
            <p>&times</p>
            <input type="number" id="addRowAboveVal" step="1" value="1" min="1" max="20" />
          </span>
        </li>
        <li>
          <span>
            <a href="#" name="addRowBelow">Insert row below</a>
            <p>&times</p>
            <input type="number" id="addRowBelowVal" step="1" value="1" min="1" max="20" />
          </span>
        </li>
        <li><a href="#" name="removeRows">Remove row</a></li>
        <li><a href="#" name="undo">Undo</a></li>
        <li><a href="#" name="redo">Redo</a></li>
        <li><a href="#" name="calculate">Calculate (F9)</a></li>
      </ul>
    </div>`,
    "keyupFunctions": {
      120: function($editor) {
        $editor.getSelectedRows().map(function(_i, tr) {
          $(tr).attr("changed", true);
        });
        calculatePendingRows(that, 0);
      }
    }
  });

  // Update resizer elements handlers
  if (!window.resizeGrid) return;
  window.resizeGrid.setElements();
  window.resizeGrid.triggerFixGridEvents();
};

Template.worksheets.onCreated(function() {
});

Template.worksheets.onrendered = function() {
  //
};


Template.worksheets.helpers({
  randomId: function() {
    return Random.id();
  },
  /*readoutContent: function(content) {
    return '<span class="cellContentWrap">'+content+'</span>';
  },*/
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
        label: p.name,
        isSelected: isSelected
      };
    });
    return res;
  },
  noneWhenUndefined: function(procedureId) {
    if (procedureId === undefined) {
      return "none";
    }
    return "table";
  },
  updateTable: function() {
    return Session.get("updateTable");
  },
  colForVarIsFixed: function(varName) {
    var currentWorksheet = getCurrentWorksheet();
    
    if (!currentWorksheet) {
      return false;
    }

    var inst = getInstrumentById(currentWorksheet[varName+'InstrumentId']);
    if (inst === undefined) {
      return false;
    } else {
      return getInstrumentById(currentWorksheet[varName+'InstrumentId']).kind === "Fixed";
    }
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
  plusOne: function (x) {
    return x+1;
  },
  rowsWithIndex: function() {
    //var rows = this.rows;
    var currWorksheet = worksheetById(Session.get("selectedWorksheetId"));
    if (currWorksheet === undefined) {
      return;
    }
    var rows = currWorksheet.rows;
    
    /*var rowsWithDBIndex = [];
    for (var i = 0; i < rows.length; i++) {
      rows[i].dbIndex = _.findIndex(rows, function(r) {
        return r._id = rows[i]._id;
      });
      rowsWithDBIndex.push(rows[i]);
    }*/
    
    var rowsWithDBIndex = rows.map(function(r, index) {
      r.dbIndex = index;
      return r;
    })

    if (!rowsWithDBIndex.length && !window.CREATING_FIRST_ROW) {
      window.CREATING_FIRST_ROW = true;
      addNewRow(1, 0);
      // Compensates the small delay that blaze have
      // to re-render the template, avoiding seeding
      // multiple rows
      window.setTimeout(function(){
        window.CREATING_FIRST_ROW = false;
      }, 500);

    }
    var visibleIndex = 0;
    return rowsWithDBIndex.map(function(row, index) {
      var deleted;
      if (row._deleted === undefined) {
        deleted = false;
      } else {
        deleted = row._deleted
      }

      if (!deleted) {
        visibleIndex = visibleIndex + 1;
      }

      var visibilityClass;
      if (deleted) {
        visibilityClass = 'hidden-row';
      }
      obj = {
        row: row,
        visibleIndex: visibleIndex,
        id: row._id,
        dbIndex: row.dbIndex,
        deleted: deleted,
        visibilityClass: visibilityClass
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
      
      var n = v.kind === "Influence" ? 1 : Procedure.n;

      var readoutsIsUndefined = (readouts === undefined);
      var readoutsIsNotObject = (typeof readouts !== "object")
      if ( readoutsIsNotObject || readoutsIsUndefined) {
        readouts = [];
      }
      
      var readoutsIsEmpty = !readouts.length;
      var readoutsIsNull = (readouts === null);

      if ( readoutsIsNull || readoutsIsEmpty ) {
        // Create buffer array if variable dont exists on db
        for (var i = n; i > 0; i--) {
          readouts.push(null);
        }
        /*
        var dbPath = "worksheets."+worksheetIndex+".rows."+rowDBIndex+"."+v.name;
        var data = {};
        data[dbPath] = readouts;
        console.log(data);
        //setData(data);
        */
      }
      
      //////////////////////////////////////////////////////////
      // readouts pode fornecer o tamanho errado quando alteramos o procedimento
      var nColsToPad = Math.abs(readouts.length-n);
      for (var i = nColsToPad - 1; i >= 0; i--) {
        readouts.push("");
      }

      return readouts.slice(0, n).map(function(readout, readoutIndex) {
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
    var currVar;
    for (var i = 0; i < Procedure.variables.length; i++) {
      currVar = Procedure.variables[i];
      res.push({
        name: currVar.name,
        uiColor: currVar.color
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
