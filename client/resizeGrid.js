window.ResizeGrid = function() {
  var that = this;
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

  var jsonEditorHolders = $(".json-editor-holder");

  // Panels to adjust scroll
  this.panelListStr = ["procedures", "instruments"];
  this.panelListEl = this.panelListStr.map(function(panel) {
    return $("#"+panel);
  });

  this.$proceduresEl = $("#procedures");
  this.$instrumentsEl = $("#instruments");

  this.setElements = function() {
    that.$editTable = $(".editTable");
  }
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

      var editTableTop = that.$editTable.offset().top;
      // Fix editTable height
      that.$editTable.css({
        "height": (middleRowTop-editTableTop)+"px"
      });

      that.panelListEl.map(function($el){
        var elTop = $el.offset().top;
        $el.css({
          "height": (middleRowTop-elTop)+"px"
        });
      })

      evt.preventDefault();
      evt.stopPropagation();
    }
  
  }

  this.triggerFixGridEvents = function() {
    $(".middle-row").trigger("mousedown").trigger("mousemove").trigger("mouseup");
  }

  this.setElements();

  $handler
  .mousedown(function(evt) {
    isDragging = true;
    startDragY = evt.clientY;
    //$handler.pos({x: evt.clientY});
    evt.preventDefault();
    evt.stopPropagation();
  });
  $(document).mouseup(function(evt) {
    if (isDragging) {
      // Redraw range chart
      try {
        if (rangeChart) rangeChart.update();
        //rangeChartNoData();addGraphRangeChart();renderChart()

      } catch (e) {
        //
      }
    }
    isDragging = false;
  })
  .mousemove(that.fixGrid);
}