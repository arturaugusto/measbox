Template.showSpreadsheet.helpers({
  worksheetsWithIndex: function() {
    if (!this.worksheets) return;
    return this.worksheets.map(function(w, index) {
      var obj = w;
      obj.index = index;
      return obj;
    });
  },
  selectedWorksheetWithIndex: function() {
    if (!this.worksheets) return;

    var selectedWorksheetId = Session.get("selectedWorksheetId");
    
    if (selectedWorksheetId === undefined && this.worksheets.length) {
      Session.set("selectedWorksheetId", this.worksheets[0]._id);
    }

    for (var i = 0; i < this.worksheets.length; i++) {
      if (this.worksheets[i]._id === selectedWorksheetId) {
        var obj = {};
        obj = this.worksheets[i];
        obj.index = i;
        return obj;
      }
    }
    return void 0;
  },
  isProcessing: function() {
    return Session.get("processing");
  },  
  isSelectedWorksheet: function(id) {
    return Session.get("selectedWorksheetId") === id;
  },
  worksheetName: function() {
    var procedure = getProcedureById(this.procedureId);
    if (procedure === undefined) return "new worksheet";
    return procedure.functionalityTags.toString()
  }

});

Template.showSpreadsheet.onRendered(function() {
  window.resizeGrid = new ResizeGrid();
  // Fix grid when windows resize
  addEvent(window, "resize", function(event) {
    window.resizeGrid.triggerFixGridEvents();
  });
});

