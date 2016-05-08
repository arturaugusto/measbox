Template.showSpreadsheet.helpers({
  worksheetsWithIndex: function() {
    return this.worksheets.map(function(w, index) {
      var obj = w;
      obj.index = index;
      return obj;
    });
  },
  selectedWorksheetWithIndex: function() {
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
  isSelectedWorksheet: function(id) {
    return Session.get("selectedWorksheetId") === id;
  },
  worksheetName: function() {
    var procedure = getProcedureById(this.procedureId);
    if (procedure === undefined) return "new worksheet";
    return procedure.functionalityTags.toString()
  }

});

window.resizeGrid = function() {
  /*
  * Resize handler
  */

  var isDragging = false;
  var $handler = $(".middle-row-handler");
  var middleRowHeight = $handler.height();
  var startDragY = 0;

  var $topRow = $(".top-row");
  var $middleRow = $(".middle-row");
  var $bottomRow = $(".bottom-row");

  this.fixGrid = function(evt){
    if (isDragging) {
      var Y = evt.clientY;
      var delta = evt.clientY-startDragY;
      startDragY = Y;

      var windowHeight = viewPortHeight();
      
      var handlerHeight = $middleRow.height();
      //$("#rangeChartContainer").css({"padding-top": handlerHeight+"px"});

      var middleRowTop = $middleRow.offset().top;
      var middleRowBottom = middleRowTop + middleRowHeight;

      if ( (Y <= 0) || (Y > windowHeight) ) return;
      if ( (middleRowTop <= 0) && (delta < 1) ) return;
      if ( (middleRowBottom*1.02 >= windowHeight) && (delta > 0) ) return;

      var middleRowOffset = ($middleRow.offset().top+delta)/windowHeight;
      var bottomRowOffset = ($bottomRow.offset().top+delta)/windowHeight;

      $topRow.css({
        "height": ($handler.offset().top)+"px"
      });
      
      $middleRow.css({
        "top": (middleRowOffset*100)+"%"
      });

      $bottomRow.css({
        "top": ((bottomRowOffset)*100)+"%",
        "height": (100-(bottomRowOffset*100))+"%"
      });

      // Redraw range chart
      if (rangeChart) rangeChart.update();
      

      evt.preventDefault();
      evt.stopPropagation();
    }
  
  }

  $handler
  .mousedown(function(evt) {
    isDragging = true;
    startDragY = evt.clientY;
    //$handler.pos({x: evt.clientY});
    evt.preventDefault();
    evt.stopPropagation();
  });
  $(document).mouseup(function(evt) {
    isDragging = false;
  })
  .mousemove(fixGrid);
}


Template.showSpreadsheet.onRendered(function() {
  resizeGrid();
  // Fix grid when windows resize
  addEvent(window, "resize", function(event) {
    $(".middle-row").trigger("mousedown").trigger("mousemove").trigger("mouseup");
  });
});

