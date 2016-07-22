//permitir alinhamento do texto a esquerda


(function() {var EditTable = function(el, options) {
  var that = this;
  this.editor = el;

  this.options = options || {};
  this.options.colOffset = this.options.colOffset || 1; // Forced to 1. TODO: Suport other values

  this.options.contextMenuFunctions = this.options.contextMenuFunctions || {};
  this.options.contextMenuHTML = this.options.contextMenuHTML || '';
  // Used on undo/redo
  this.changeHistory = [];
  this.changeHistoryIndex = -1;
  this.prevCellText = undefined;
  // Hidden element used to detect firt char to insert
  // when user is on navigation mode and start typing
  var $charEl = '<input type="text" class="editTableInvisible" tabindex="-1">';
  this.$charEl = $( $charEl ).appendTo( el );
  // Hidden element used to emulate clipboard
  var $clipEl = '<textarea class="editTableInvisible" tabindex="-1"></textarea>';
  this.$clipEl = $( $clipEl ).appendTo( el );
  this.selectedTd = undefined;
  this.preventChange = false;
  // Context menu
  this.$contextMenuEl = $( this.options.contextMenuHTML ).appendTo( el );

  this.$editor = $(this.editor);
  this.$headerEl = this.$editor.find('thead');
  this.$firstColHeader = this.$editor.find('tr th:first-child');

  this.destroy = function() {
    that.$editor.remove('.editTableInvisible, .editTableInvisible .editTableContextMenu');
  };

  // set fixed header, based on:
  //http://stackoverflow.com/questions/673153/html-table-with-fixed-headers
  this.editor.addEventListener("scroll",function(){
    // Header row
    var scrollTopVal = this.scrollTop;
    var scrollLeftVal = this.scrollLeft;
    var translateTop = "translate(0,"+scrollTopVal+"px)";
    this.querySelector("thead").style.transform = translateTop;
    // First Col
    var translateLeft = "translate("+scrollLeftVal+"px,0)";
    $(".editTable tr th:first-child, .editTable tr td:first-child").each(function(_i, el){
      if (_i === 0) {
        $(el).addClass('topLeftCorner');
      }
      el.style.transform = translateLeft;
    });
  });
  
  this.editor.buildCaretRange = function(evt) {
    var range, x = evt.clientX,
      y = evt.clientY;
    // Try the simple IE way first
    if (document.body.createTextRange) {
      range = document.body.createTextRange();
      range.moveToPoint(x, y);
    } else if (typeof document.createRange != "undefined") {
      // Try Mozilla's rangeOffset and rangeParent properties, 
      // which are exactly what we want
      if (typeof evt.rangeParent != "undefined") {
        range = document.createRange();
        range.setStart(evt.rangeParent, evt.rangeOffset);
        range.collapse(true);
      }
      // Try the standards-based way next
      else if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(x, y);
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
      // Next, the WebKit way
      else if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
      }
    }
    return range;
  }

  this.editor.selectRange = function(range) {
    if (range) {
      if (typeof range.select != "undefined") {
        range.select();
      } else if (typeof window.getSelection != "undefined") {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  this.validateChange = function() {
    // Avoid adding to history if user only enter edit mode
    // without change the content
    if (that.preventChange) {
      that.preventChange = false;
      return false;
    } else {
      return $(that.selectedTd).html() !== that.prevCellText;
    }
  }

  this.addToChangeHistory = function(change) {
    if (that.changeHistory.length > (that.changeHistoryIndex+1)) {
      that.changeHistory.splice(
        that.changeHistoryIndex+1
      );
    }
    that.changeHistory.push(change);
    that.changeHistoryIndex = that.changeHistory.length-1;

  }

  this.getTdPosIncludeHidden = function(td) {
    var $td = $(td);
    var obj = {};
    obj.x = $td.index();
    obj.y = $td.parent().index();
    return obj;
  }

  this.getTdPos = function(td) {
    var $td = $(td);
    var obj = that.getTdPosIncludeHidden(td);
    obj.y -= $td.parent().prevAll('tr:hidden').length;
    return obj;
  }

  this.onChangeCellValue = function() {
    var td = that.selectedTd;
    var pos = that.getTdPosIncludeHidden(td);
    if (that.validateChange()) {
      // Store prev value on history
      var change = [{
        'kind': 'cellChange',
        'x': pos.x,
        'y': pos.y,
        'content': that.prevCellText
      }];

      that.addToChangeHistory(change);
      if (typeof that.options.onChange === "function") {
        that.options.onChange(td);
      }
    }
  }

  this.setContentEditble = function(isEditable) {
    if (that.selectedTd !== undefined) {
      // Detect true to false editable transition
      if ( (that.selectedTd.contentEditable == "true") && !isEditable) {
        that.onChangeCellValue();
      }
      if (isEditable) {
        window.setTimeout(function() {
          // This class enable text selection.
          // It waits some miliseconts to avoid initial
          // double click selection
          $(that.selectedTd).addClass("editTableEditing");
        }, 100)
      } else {
        $(that.selectedTd).removeClass("editTableEditing");
      }
      that.selectedTd.contentEditable = isEditable;
    }
  };

  this.setCaret = function(caretRange) {
    // TODO: refactor to use that.startEdit(evt); instead of
    // reduntant set setContentEditble(true);
    that.setContentEditble(true);
    that.cursorFocus(that.selectedTd);
    that.editor.selectRange(caretRange);

  }

  this.editor.ondblclick = function(evt) {
    evt = evt || window.event;
    if (that.selectedTd !== undefined) {
      if (that.selectedTd.contentEditable != "true") {
        var caretRange = that.editor.buildCaretRange(evt);
        that.startEdit(evt);
        that.setCaret(caretRange);
      }
    };
  };

  $(this.editor).find('td').onblur = function(evt) {
    that.removeSelectedClass();
    that.setContentEditble(false);

  }

  this.mouseDown = 0;
  document.onmousedown = function() { 
    ++that.mouseDown;
  }
  document.onmouseup = function() {
    that.mouseDown = 0;
  }

  this.clearSelection = function() {
    $(that.editor).find("td").removeClass("editTableSelected");
    // TODO: Add feature similar to excel, that when
    // exists a selection, its is used as a "navigation scope"    
  }

  this.visibleRows = function() {
    return $(that.editor).find("tbody>tr:visible");
  }
  this.setSelection = function(startx, endx, starty, endy) {
    that.clearSelection();
    var trRange = that.visibleRows().slice(starty, endy);
    var $el;
    for (var i = trRange.length - 1; i >= 0; i--) {
      $el = $(trRange[i]).children().slice(startx, endx);
      if ($el.is(':visible')) {
        $el.addClass("editTableSelected");
      }
    };
  }

  // Mouse is down and start selecting range
  $(this.editor).mouseover(function(evt) {
    var top = $(evt.target).offset().top;
    var left = $(evt.target).offset().left;
    $(that.$charEl).offset({ top: top, left: left });
    $(that.$clipEl).offset({ top: top, left: left });
    if(that.mouseDown) {
      if (evt.target.nodeName === "TD" && $(evt.target).index() >= that.options.colOffset) {
        var targetPos = that.getTdPos(evt.target);
        that.rangeSelection.x = targetPos.x;
        that.rangeSelection.y = targetPos.y;
        that.selectionChanged();
      }
    }
  })

  document.addEventListener( "contextmenu", function(evt) {
    var displacement = 2;
    if (evt.target === that.selectedTd || $(evt.target).hasClass("editTableSelected")) {
      that.$contextMenuEl.offset({ top: evt.clientY+displacement, left: evt.clientX+displacement });
      that.$contextMenuEl.addClass("editTableContextMenuActive");
      evt.preventDefault();
    }
  });

  this.setContextMenuHomeHide = function() {
    that.$contextMenuEl.offset({ top: 0, left: 0 });
    that.$contextMenuEl.removeClass("editTableContextMenuActive");
  }

  $(this.editor)
    .mousedown(function(evt) {
      var rightClick = evt.button === 2 ? true : false;

      if (typeof that.options.beforeContextMenuShow === "function") {
        that.options.beforeContextMenuShow(that);
      }

      // If target is a child of context menu
      if (that.$contextMenuEl.has(evt.target).length) {
        // only execute callback if target element has name property.
        // and dont have menuItemDisabled class.
        // Note that elements without pointer events will pass parent target el  here
        if ((evt.target.attributes.name !== undefined) && (!$(evt.target).hasClass('menuItemDisabled'))) {
          var targetName = evt.target.attributes.name.value;
          var menuItemSelectedFun = that.options.contextMenuFunctions[targetName];

          if (typeof menuItemSelectedFun === "function") {
            menuItemSelectedFun(that);
          }
  
          setTimeout(function() {
            that.setContextMenuHomeHide();
          }, 60);
  
          evt.preventDefault();
        }

        return;
      }

      that.setContextMenuHomeHide();
      if (evt.shiftKey && that.navigationMode === "rangeSelection") {
        var targetPos = that.getTdPos(evt.target);
        that.rangeSelection.x = targetPos.x;
        that.rangeSelection.y = targetPos.y;
        that.selectionChanged();
      } else {
        var hasClickedOutSelection = !$(evt.target).hasClass("editTableSelected");
        if ( !rightClick || hasClickedOutSelection ) {
          that.clearSelection();
        }
        if (that.selectedTd !== evt.target) {
          that.setContentEditble(false);
        } else {
          // If editing, return early
          // dont prevent default.
          // this allow selecting range of contenteditable,
          // and other mouse actions will not intefer
          if (that.selectedTd.contentEditable == 'true') {
            return;
          }
        }
        if (hasClickedOutSelection || !rightClick) that.setSelectedTd(evt.target);
      }
      evt.preventDefault();
    });

  this.removeSelectedClass = function() {
    $(that.editor).find(".editTableCurrent").removeClass("editTableCurrent");
  }

  // Focus without scroll
  this.cursorFocus = function(elem) {
    elem.focus();
  }

  this.rangeSelection = {x:0, y:0};

  this.setSelectedTd = function(td) {

    if ($(td).index() < that.options.colOffset) {
      console.log("TODO: select row");
      return;
    }

    if (td.nodeName === "TH") {
      console.log("TODO: select col");
      return;
    }
    
    if (td.nodeName === "TD") {
      that.selectedTd = td;
      that.cursorFocus(that.$charEl);
      if (that.selectedTd !== undefined) {
        that.removeSelectedClass();
        $(that.selectedTd).addClass("editTableCurrent");
        that.rangeSelection = that.getTdPos(that.selectedTd);
        
        if (typeof that.options.onSelectedCellChange === "function") {
          that.options.onSelectedCellChange(td);
        }      
      }
    }
  }

  this.navigationMode = "cellSelection";

  this.scrollToSelected = function(
    el,
    offsetParam,
    scrollType,
    sizeParam,
    $offsetEl,
    scrollSizeFix
    ) {
    var $editor = $(that.editor);
    
    var headerTop = $offsetEl.offset()[offsetParam];
    // need to sum headerHeight to compensate the translate from header
    var offsetElSizeParam = $offsetEl[sizeParam]();

    var $el = $(el);
    var elOffset = $(el).offset();
    var elEnd = elOffset[offsetParam] + $el[sizeParam]()+offsetElSizeParam;
    var elStart = elOffset[offsetParam];

    var scroll = $editor[scrollType]();
    var editorOffset = $editor.offset();
    var cellsAreaTop = editorOffset[offsetParam]+offsetElSizeParam;
    var bRect = $editor[0].getBoundingClientRect();
    var cellsAreaBottom = editorOffset[offsetParam]+bRect[sizeParam]+offsetElSizeParam;

    if (elStart < cellsAreaTop) {
      var yGap = (elStart-(headerTop+offsetElSizeParam)-scrollSizeFix)
      $editor[scrollType](scroll+yGap);
      return
    }

    if (elEnd > cellsAreaBottom) {
      $editor[scrollType](scroll+(elEnd-cellsAreaBottom)+scrollSizeFix);
      return
    }

  };

  this.selectedTdChanged = function (newSelectedTd) {

    if (that.$headerEl === undefined) that.$headerEl = that.$editor.find('thead');
    that.scrollToSelected(
      newSelectedTd,
      'top',
      'scrollTop',
      'height',
      that.$headerEl,
      0
    );

    if (that.$firstColHeader === undefined) that.$firstColHeader = that.$editor.find('tr th:first-child');
    that.scrollToSelected(
      newSelectedTd,
      'left',
      'scrollLeft',
      'width',
      that.$firstColHeader, 
      10
    );

    that.setContentEditble(false);
    that.setSelectedTd(newSelectedTd);
  } 
  
  this.selectionChanged = function () {
    var start = that.getTdPos(that.selectedTd);
    var end = that.rangeSelection;
    // TODO: refactor this
    var startx = start.x < end.x ? start.x : end.x;
    var endx = start.x > end.x ? start.x+1 : end.x+1;
    var starty  = start.y < end.y ? start.y : end.y;
    var endy  = start.y > end.y ? start.y+1 : end.y+1;
    that.setSelection(startx, endx, starty, endy);
  } 

  this.moveSelected = function(dir) {
    if (that.navigationMode === "cellSelection") {
      var newSelectedTd, targetIsUndefined;
      var $selectedTd = $(that.selectedTd);

      if (dir === "left") {
        newSelectedTd = $selectedTd.prev("td")[0];

        if ($(newSelectedTd).index() < that.options.colOffset) {
          newSelectedTd = undefined;
        }
      }
      if (dir === "right") {
        newSelectedTd = $selectedTd.next("td")[0];
      }
      var index = $selectedTd.index();
      if (dir === "up") {
        newSelectedTd = $selectedTd
        .parent()
        .prevAll('tr:visible')
        .first()
        .children()[index];
      }
      if (dir === "down") {
        newSelectedTd = $selectedTd
        .parent()
        .nextAll('tr:visible')
        .first()
        .children()[index];
      }
      var selectedTdIndex = $selectedTd.index();
      var $rowCells = $selectedTd.parent().find("td");
      if (dir === "pageDown" ) {
        newSelectedTd = $selectedTd
        .parent()
        .parent()
        .parent()
        .find("tbody>tr")
        .last()
        .find("td")[selectedTdIndex];
        that.rangeSelection.y = nRow-1;
      }
      if (dir === "pageUp") {
        newSelectedTd = $selectedTd
        .parent()
        .parent()
        .parent()
        .find("tbody>tr")
        .first()
        .find("td")[selectedTdIndex];
        that.rangeSelection.y = 0;
      }
      if (dir === "end") {
        newSelectedTd = $rowCells.last()[0];
        that.rangeSelection.x = nCol-1;
      }
      if (dir === "home") {
        var newSelectedTd = $rowCells[that.options.colOffset];
        //that.rangeSelection.x = that.options.colOffset;
      }
      targetIsUndefined = newSelectedTd === undefined;
      if (targetIsUndefined) {
        //console.log("nada", dir);
        that.selectedTdChanged(that.selectedTd);
      } else {
        that.selectedTdChanged(newSelectedTd);
      }

      return false;
    }
    if (that.navigationMode === "rangeSelection") {
      var tr = that.visibleRows();
      var nRow = tr.length;
      var nCol = $(tr).first().find("td").length;
      if (dir === "left" && (that.rangeSelection.x > that.options.colOffset)) {
        that.rangeSelection.x--;
      }
      if (dir === "right" && (that.rangeSelection.x < (nCol-1))) {
        that.rangeSelection.x++;
      }
      var index = $(that.selectedTd).index();
      if (dir === "up" && (that.rangeSelection.y > 0)) {
        that.rangeSelection.y--;
      }
      if (dir === "down" && (that.rangeSelection.y < (nRow-1))) {
        that.rangeSelection.y++;
      }
      if (dir === "pageDown" ) {
        that.rangeSelection.y = nRow-1;
      }
      if (dir === "pageUp") {
        that.rangeSelection.y = 0;
      }
      if (dir === "end") {
        that.rangeSelection.x = nCol-1;
      }
      if (dir === "home") {
        that.rangeSelection.x = that.options.colOffset;
      }
      this.selectionChanged();
    };
  }

  this.setPrevCellText = function(html) {
    if (html !== undefined){
      that.prevCellText = html;
    } else {
      that.prevCellText = $(that.selectedTd).text();
    }
  }

  this.pageOffset = function() {
    // Jquery way of getting the page scroll offset
    var doc = document.documentElement;
    var x = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
    var y = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
    return( {x: x, y: y} );
  }

  this.startEdit = function(evt) {
    var $el = $(that.selectedTd);
    that.setPrevCellText();
    //that.selectedTd.focus();
    //setTimeout(function() {
    if (typeof that.options.onStartEdit === "function") {
      that.options.onStartEdit(that.selectedTd);
    };
    
    var scrollOffset = that.pageOffset();

    var editorOffset = $(that.editor).offset();
    var offset = $el.offset();
    var x = offset.left,
      y = offset.top;
    var elWidth = $el.width();
    var elHeight = $el.height();
    // Those calculations, specially 0.5 height helps 
    // to keep the startEdit to work when user zoom in
    // and zoom out the page
    evt.clientX = parseInt(x+elWidth-scrollOffset.x);
    evt.clientY = parseInt(y+elHeight/2-scrollOffset.y);

    // If cell text is aligned to right, set caret 
    // to right, like libreoffice does.
    if ($el.css("text-align") === "right") {
      evt.clientX += 5;
    }

    evt.target = that.selectedTd;
    var caretRange = that.editor.buildCaretRange(evt);
    // setCaret also sets contentEditable = true
    that.setCaret(caretRange);
    //}, 10);
      
  }

/*
  $(window).click(function(evt) {
    // Check if user has clicked outside editor
    // TODO: Find faster way to do this
    if ($(that.editor).find(evt.target).length === 0) {
      that.removeSelectedClass();
      that.setContentEditble(false);
      that.selectedTd = undefined;
    }
  });
*/
  this.applyChange = function(change) {
    var tr = $(that.editor).find("tbody>tr")[change.y];
    var $tr = $(tr)
    if (change.kind === "cellChange") {
      var td = $(tr).children()[change.x];
      // swap the content value, so 
      // user can redo
      var swap = $(td).text();
      $(td).text(change.content);
      change.content = swap;

      if (typeof that.options.onChange === "function") {
        that.options.onChange(td);
      }
    }
    if ( (change.kind === "hideRow") || (change.kind === "addRow") ) {
      var currClass;
      // recovery class from cells
      for (var i = 0; i < tr.cells.length; i++) {
        currClass = change.classForTd[i];
        if (currClass) {
          $tdCell = $(tr.cells[i]);
          $tdCell.addClass(currClass);
          if ($tdCell.hasClass("editTableCurrent")) {
            that.setSelectedTd($tdCell[0]);
          }
        }
      }
      // recovery selection
      that.rangeSelection = change.rangeSelection;
      if ((typeof that.options.onRowRecovery === "function") && $tr.is(':hidden')) {
        that.options.onRowRecovery(tr);
      }
      if ((typeof that.options.onRowDismiss === "function") && $tr.is(':visible')) {
        that.options.onRowDismiss(tr);
      }
      $tr.toggle();
    }
  }

  
  this.hasUndo = function() {
    return that.changeHistoryIndex > -1;
  }

  this.hasRedo = function() {
    return that.changeHistoryIndex !== (that.changeHistory.length-1);
  }
  
  this.redo = function() {
    // Similar to undo comments
    if (!that.hasRedo()) {
      return;
    }
    var changes = that.changeHistory[that.changeHistoryIndex+1];

    that.clearSelection();
    for (var i = changes.length - 1; i >= 0; i--) {
      that.applyChange(changes[i]);
    };
    that.changeHistoryIndex++;
  }

  this.undo = function() {
    // The index correspond to changeHistory array index
    if (!that.hasUndo()) {
      return;
    }
    var changes = that.changeHistory[that.changeHistoryIndex];
    
    that.clearSelection();
    for (var i = changes.length - 1; i >= 0; i--) {
      that.applyChange(changes[i]);
    };
    that.changeHistoryIndex--;
  }

  this.setClipboardText = function() {
    var clipBoardText = "";
    var index;
    var elements = $(that.editor).find(".editTableSelected");
    if (elements.length <= 1) {
      clipBoardText = that.selectedTd.innerHTML;
    }
    var width = $(that.selectedTd).parent().find(".editTableSelected").length;
    for (var i = 0; i < elements.length; i++) {
      clipBoardText += elements[i].innerHTML;
      if ( (i+1) % width ) {
        clipBoardText += "\t";
      } else {
        clipBoardText += "\n";
      }
    };
    $(that.$clipEl).val(clipBoardText);
    $(that.$clipEl).select();
  }

  this.getClipboardText = function() {
    return that.$clipEl.val();
  }

  this.getSelectedRows = function() {
    return $(that.editor).find(".editTableSelected, .editTableCurrent").parent();
  }

  this.registerRows = function(elements) {
    var changes = [];
    for (var i = 0; i < elements.length; i++) {
      var cells = elements[i].cells;
      changes.push({
        'kind': 'addRow',
        'y': that.getTdPosIncludeHidden(cells[0]).y,
        'classForTd': [],
        'rangeSelection': that.rangeSelection
      });
    }
    that.addToChangeHistory(changes);
  }
  
  this.hideSelectedRow = function() {
    var changes = [];
    var rowsToHide = that.getSelectedRows();
    var tr;
    rowsToHide.each(function(i, tr) {
      var cells = tr.cells;
      var classForTd = [];
      for (var i = 0; i < cells.length-1; i++) {
        classForTd.push(cells[i].classList.value);
        //$(cells[i]).removeClass(["editTableSelected","editTableCurrent"]);
      }
      changes.push({
        'kind': 'hideRow',
        'y': that.getTdPosIncludeHidden(cells[0]).y,
        'classForTd': classForTd,
        'rangeSelection': that.rangeSelection
      });
      
      if ($(tr).is(':visible')) {
        $(tr).hide();
      }
    });
    var $selectedTr = $(rowsToHide[rowsToHide.length-1]).next();
    var selectedColIndex = $(that.selectedTd).index();
    
    that.setSelectedTd($selectedTr.children()[selectedColIndex]);

    that.addToChangeHistory(changes);
    return rowsToHide;
  }

  $(that.$clipEl)
  .keyup(function(evt) {
    var keyCode = evt.keyCode;
    // Ctrl
    if (keyCode === 17) {
      $(that.$charEl).select();
      //that.selectedTdChanged(that.selectedTd);
    }
  })

  this.parseClipboard = function() {
    var content = that.$clipEl.val();
    var nChar = content.length;
    
    // Add a new line at end if dont 
    // exist. This fix some of input
    // format situation
    if (content[nChar-1] !== "\n") {
      content += "\n";
    }

    var lines = content.split("\n");
    lines.pop();
    var parsedContent =  lines.map(function(line) {
      return line.split("\t");
    })
    return parsedContent;
  }

  this.paste = function(parsedContent) {
    var $startCell = $nextCell = that.$editor.find(".editTableSelected").first();
    if (!$startCell.length) {
      var $startCell = $nextCell = $(that.selectedTd);
    }
    var startCellIndex = $startCell.index();
    var $startRow = $nextRow = $startCell.parent();
    var dataCells;
    var dataRows = parsedContent;
    var $possibleNext;
    var cellClipText;

    var changes = [];
    var change;
    var pos;

    // Assuming square or rectangular selection
    // get dimensions
    var selectionSize = that.$editor
      .find(".editTableSelected")
      .length;

    var selectionLineSize = $nextCell
      .parent()
      .find(".editTableSelected")
      .length;

    var sourceHeight = dataRows.length;
    var targetHeight;
    if (selectionSize === 0) {
      targetHeight = sourceHeight;
    } else {
      targetHeight = Math.max(
        sourceHeight, 
        Math.round(selectionSize/selectionLineSize)
      )
    };
    var sourceWidth;
    var targetWidth;
    
    for (var i = 0; i < targetHeight; i++) {
      dataCells = dataRows[i % sourceHeight];
      sourceWidth = dataCells.length;
      targetWidth = Math.max(
        sourceWidth,
        selectionLineSize
      );
      
      for (var j = 0; j < targetWidth; j++) {
        pos = that.getTdPosIncludeHidden($nextCell[0]);
        // loop no select
        change = {
          'kind': 'cellChange',
          'x': pos.x,
          'y': pos.y,
          'content': $nextCell.text()
        };
        changes.push(change);
        cellClipText = dataCells[j % sourceWidth];

        $nextCell.text(cellClipText);
        $nextCell.addClass("editTableSelected");

        $possibleNext = $nextCell.next();
        if (!$possibleNext.length) {
          break;
        }
        $nextCell = $possibleNext;
      }
      $nextRow = $nextCell.parent().next();
      if (!$nextRow.length) {
        break;
      }

      while ( $nextRow.is(':hidden') && $nextRow.length ) {
        console.log($nextRow);
        $nextRow = $nextRow.next();
      }
      
      $nextCell = $($nextRow.children()[startCellIndex]);
    }
    that.addToChangeHistory(changes);
  }

  // Key events
  $(that.editor)
    .keydown(function(evt) {
      if (that.selectedTd === undefined) {
        return false;
      }
      var keyCode = evt.keyCode;
      var strFromCharCode = String.fromCharCode(keyCode);
      //console.log("Key code: " + keyCode);console.log("Str From Char Code: " + strFromCharCode);
      // Tab
      if (keyCode === 9) {
        that.clearSelection();
        that.navigationMode = "cellSelection";
        var dir;
        // Check for shift to determine if its prev or next
        dir = evt.shiftKey ? "left" : "right";
        that.moveSelected(dir);
        evt.preventDefault();
      }
      // Ctrl key is pressed
      if (evt.ctrlKey) {
        if (keyCode === 17) {
          evt.preventDefault();
        }
        // V (Paste)
        if (keyCode === 86) {
          setTimeout(function() {
            that.paste(that.parseClipboard());
          }, 100);
        }
        // Y (Redo)
        if (keyCode === 89) {
          that.redo();
          evt.preventDefault();
        }
        // Z (Undo)
        if (keyCode === 90) {
          that.undo();
          evt.preventDefault();
        }
      } else {
        // Shift key is NOT pressed
        // and isnt Delete action
        if (!evt.shiftKey && (keyCode !== 46) ) {
          that.clearSelection();
          that.navigationMode = "cellSelection";
        } else {
          that.navigationMode = "rangeSelection";
        }
      }
      // Navigation mode
      if (that.selectedTd.contentEditable != "true") {
        if (evt.ctrlKey) {
          // V (Paste)
          if (keyCode === 86) {
            that.$clipEl.val("");
            that.cursorFocus(that.$clipEl);
            //evt.preventDefault();
          }
          // C (Copy)
          if (keyCode === 67) {
            that.setClipboardText();
          }
        }
        // Page Up
        if (keyCode === 33) {
          that.moveSelected("pageUp");
          evt.preventDefault();
        }
        // Page Down
        if (keyCode === 34) {
          that.moveSelected("pageDown");
          evt.preventDefault();
        }
        // End
        if (keyCode === 35) {
          that.moveSelected("end");
          evt.preventDefault();
        }
        // Home
        if (keyCode === 36) {
          that.moveSelected("home");
          evt.preventDefault();
        }
        // Left
        if (keyCode === 37) {
          that.moveSelected("left");
          evt.preventDefault();
        }
        // Right
        if (keyCode === 39) {
          that.moveSelected("right");
          evt.preventDefault();
        }
        // Delete
        if (keyCode === 46) {
          evt.preventDefault();
          that.setPrevCellText();
          if ($(that.selectedTd).html() === "") {
            if (typeof that.options.deleteWhenNull === "function") {
              that.options.deleteWhenNull(that.selectedTd);
            }
          }
          var changes = [];
          that.$editor.find(".editTableSelected, .editTableCurrent")
            //TODO: history
            .each(function(i, el) {
              var $el = $(el);
              var pos = that.getTdPosIncludeHidden(el);
              changes.push({
                'kind': 'cellChange',
                'x': pos.x,
                'y': pos.y,
                'content': $el.text()
              });
              $el.text("");
            })
          ;
          var changesContent = changes.map(function(change) {
            return change.content;
          });
          // Return early if deleted range had no data,
          // avoiding add no change to change history
          if (changesContent.join("") === "") {
            return;
          }
          that.addToChangeHistory(changes);
          return;
        }
      } else {
        // Events on edit mode
        // Esc
        if (keyCode === 27) {
          that.preventChange = true;
          that.setContentEditble(false);
          that.cursorFocus(that.$charEl);
          $(that.selectedTd).html(that.prevCellText);
          // Prevent esc trigger change
          evt.preventDefault();
        }
      }
      // UP
      if (keyCode === 38) {
        that.moveSelected("up");
        evt.preventDefault();
      }
      // DOWN or ENTER
      if ((keyCode === 40) || (keyCode === 13)) {
        that.moveSelected("down");
        evt.preventDefault();
      }
      // F2
      if (keyCode === 113) {
        that.startEdit(evt);
        evt.preventDefault();
      }
      // Use the hidden input to set the first letter when
      // user start typing on a sell that is current selected
      // but not on edit mode

      window.setTimeout(function() {
        var charToInput = that.$charEl.val();
        if (charToInput.length) {
          var prevHtml = $(that.selectedTd).text();
          that.selectedTd.innerHTML = charToInput;
          that.startEdit(evt);
          // ignore the change made by invisible input
          that.setPrevCellText(prevHtml);
          evt.preventDefault();
        }
      }, 0);
      // Clean input used to determine
      // if keystroke should start editing
      that.$charEl.val("");
    })
  return this;
}
window.EditTable = EditTable;})();
