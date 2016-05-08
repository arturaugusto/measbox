(function() {var EditTable = function(el, options) {
  var that = this;
  this.editor = el;

  this.options = options || {};
  this.options.colOffset = this.options.colOffset || 0;

  // Used on undo/redo
  this.changeHistory = [];
  this.changeHistoryIndex = -1;
  this.prevCellHTML = undefined;
  // Hidden element to detect firt char to insert
  // when user is on navigation mode and start typing
  var charEl = '<input type="text" class="editTableInvisible" tabindex="-1">';
  this.charEl = $( charEl ).appendTo( el );
  // Hidden element used to emulate clipboard
  var clipEl = '<textarea class="editTableInvisible" tabindex="-1"></textarea>';
  this.clipEl = $( clipEl ).appendTo( el );
  this.selectedTd = undefined;
  this.preventChange = false;
  
  this.editor.getMouseEventCaretRange = function(evt) {
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
      return $(that.selectedTd).html() !== that.prevCellHTML;
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

  this.getTdPos = function(td) {
    var obj = {};
    obj.x = $(td).index();
    obj.y = $(td).parent().index();
    return obj;
  }

  this.onChangeCellValue = function() {
    var td = that.selectedTd;
    
    var pos = that.getTdPos(td);
    if (that.validateChange()) {
      // Store prev value on history
      var change = [{
        'kind': 'cellChange',
        'x': pos.x,
        'y': pos.y,
        'content': that.prevCellHTML
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
        var caretRange = that.editor.getMouseEventCaretRange(evt);
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

  this.setSelection = function(startx, endx, starty, endy) {
    that.clearSelection();
    var trRange = $(that.editor).find("tbody>tr").slice(starty, endy);
    for (var i = trRange.length - 1; i >= 0; i--) {
      $(trRange[i]).children().slice(startx, endx).addClass("editTableSelected");
    };
  }

  // Mouse is down and start selecting range
  $(this.editor).mouseover(function(evt) {
    if(that.mouseDown) {
      if (evt.target.nodeName === "TD" && $(evt.target).index() >= that.options.colOffset) {
        var targetPos = that.getTdPos(evt.target);
        that.rangeSelection.x = targetPos.x;
        that.rangeSelection.y = targetPos.y;
        that.selectionChanged();
      }
    }
  })


  $(this.editor)
    .mousedown(function(evt) {
      if (evt.shiftKey && that.navigationMode === "rangeSelection") {
        var targetPos = that.getTdPos(evt.target);
        that.rangeSelection.x = targetPos.x;
        that.rangeSelection.y = targetPos.y;
        that.selectionChanged();
      } else {
        that.clearSelection();
        if (that.selectedTd !== evt.target) {
          that.setContentEditble(false);
        } else {
          return;
        }
        that.setSelectedTd(evt.target);
      }
      evt.preventDefault();
    })

  this.removeSelectedClass = function() {
    $(that.editor).find(".editTableCurrent").removeClass("editTableCurrent");
  }

  // Focus without scroll
  this.cursorFocus = function(elem) {
    var x = window.scrollX, y = window.scrollY;
    $(that.charEl, that.clipEl).offset(
      { top: y, left: x }
      );
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
    
    that.cursorFocus(that.charEl);
    that.selectedTd = td;
    if (that.selectedTd !== undefined) {
      that.removeSelectedClass();
      $(that.selectedTd).addClass("editTableCurrent");
      that.rangeSelection = that.getTdPos(that.selectedTd);
      
      if (typeof that.options.onSelectedCellChange === "function") {
        that.options.onSelectedCellChange(td);
      }
      
    }
  }

  this.navigationMode = "cellSelection";


  this.selectedTdChanged = function (newSelectedTd) {
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
      var newSelectedTd, newSelectedTd;
      if (dir === "left") {
        newSelectedTd = $(that.selectedTd).prev("td")[0];

        if ($(newSelectedTd).index() < that.options.colOffset) {
          newSelectedTd = undefined;
        }

      }
      if (dir === "right") {
        newSelectedTd = $(that.selectedTd).next("td")[0];
      }
      var index = $(that.selectedTd).index();
      if (dir === "up") {
        newSelectedTd = $(that.selectedTd)
        .parent()
        .prev()
        .children()[index];
      }
      if (dir === "down") {
        newSelectedTd = $(that.selectedTd)
        .parent()
        .next()
        .children()[index];
      }
      var selectedTdIndex = $(that.selectedTd).index();
      var $rowCells = $(that.selectedTd).parent().find("td");
      if (dir === "pageDown" ) {
        var newSelectedTd = $(that.selectedTd)
        .parent()
        .parent()
        .parent()
        .find("tbody>tr")
        .last()
        .find("td")[selectedTdIndex];
        that.selectedTdChanged(newSelectedTd);
        that.rangeSelection.y = nRow-1;
      }
      if (dir === "pageUp") {
        var newSelectedTd = $(that.selectedTd)
        .parent()
        .parent()
        .parent()
        .find("tbody>tr")
        .first()
        .find("td")[selectedTdIndex];
        that.selectedTdChanged(newSelectedTd);
        that.rangeSelection.y = 0;
      }
      if (dir === "end") {
        var newSelectedTd = $rowCells.last()[0];
        that.selectedTdChanged(newSelectedTd);
        that.rangeSelection.x = nCol-1;
      }
      if (dir === "home") {
        var newSelectedTd = $rowCells[that.options.colOffset];
        that.selectedTdChanged(newSelectedTd);
        //that.rangeSelection.x = that.options.colOffset;
      }
      if (newSelectedTd === undefined) {
        console.log("nada", dir);

        that.selectedTdChanged(that.selectedTd);

        if (dir === "down") {
          if (typeof that.options.cantMoveBelow === "function") {
            that.options.cantMoveBelow(that.selectedTd);
          }
        }

      } else {
        that.selectedTdChanged(newSelectedTd);
      }
      return false;
    }
    if (that.navigationMode === "rangeSelection") {
      var tr = $(that.editor).find("tbody>tr");
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

  this.setPrevCellHTML = function(html) {
    if (html !== undefined){
      that.prevCellHTML = html;
    } else {
      that.prevCellHTML = $(that.selectedTd).html();
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
    that.selectedTd.focus();
    that.setPrevCellHTML();
    
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
    evt.clientX = parseInt(x+elWidth)-scrollOffset.x;
    evt.clientY = parseInt(y+elHeight/2)-scrollOffset.y;
    evt.target = that.selectedTd;
    var caretRange = that.editor.getMouseEventCaretRange(evt);
    // setCaret also sets contentEditable = true
    that.setCaret(caretRange);
  }

  $(window).click(function(evt) {
    // Check if user has clicked outside editor
    // TODO: Find faster way to do this
    if ($(that.editor).find(evt.target).length === 0) {
      that.removeSelectedClass();
      that.setContentEditble(false);
      that.selectedTd = undefined;
    }
  });

  this.applyChange = function(change) {
    if (change.kind == "cellChange") {
      var tr = $(that.editor).find("tbody>tr")[change.y];
      var td = $(tr).children()[change.x];
      // swap the content value, so 
      // user can redo
      var swap = td.innerText;
      td.innerText = change.content;
      change.content = swap;

      if (typeof that.options.onChange === "function") {
        that.options.onChange(td);
      }
    }
  }

  this.redo = function() {
    // Similar to undo comments
    if (that.changeHistoryIndex === (that.changeHistory.length-1)) {
      return;
    }
    var changes = that.changeHistory[that.changeHistoryIndex+1];

    // REVERSE THIS LOOP?
    for (var i = changes.length - 1; i >= 0; i--) {
      that.applyChange(changes[i]);
    };
    that.changeHistoryIndex++;
  }

  this.undo = function() {
    // The index correspond to changeHistory array index
    if (that.changeHistoryIndex === -1) {
      return;
    }
    var changes = that.changeHistory[that.changeHistoryIndex];

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
      clipBoardText = that.selectedTd.innerText;
    }
    var width = $(that.selectedTd).parent().find(".editTableSelected").length;
    for (var i = 0; i < elements.length; i++) {
      clipBoardText += elements[i].innerText;
      if ( (i+1) % width ) {
        clipBoardText += "\t";
      } else {
        clipBoardText += "\n";
      }
    };
    $(that.clipEl).val(clipBoardText);
    $(that.clipEl).select();

  }

  $(that.clipEl)
  .keyup(function(evt) {
    var keyCode = evt.keyCode;
    // Ctrl
    if (keyCode === 17) {
      $(that.charEl).select();
      //that.selectedTdChanged(that.selectedTd);
    }
  })

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
        // C (Copy)
        if (keyCode === 17) {
          evt.preventDefault();
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
        if (!evt.shiftKey) {
          that.clearSelection();// ***
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
            evt.preventDefault();
          }        
          that.setClipboardText();
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
        // Delete ***
        if (keyCode === 46) {
          // TODO: Selection delete
          that.setPrevCellHTML();
          if ($(that.selectedTd).html() === "") {
            if (typeof that.options.deleteWhenNull === "function") {
              that.options.deleteWhenNull(that.selectedTd);
            }
          } else {
            $(that.selectedTd).html("");
            that.onChangeCellValue();
          }
          evt.preventDefault();
          return;
        }
      } else {
        // Events on edit mode
        // Esc
        if (keyCode === 27) {
          that.preventChange = true;
          that.setContentEditble(false);
          that.cursorFocus(that.charEl);
          $(that.selectedTd).html(that.prevCellHTML);
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
        var charToInput = that.charEl.val();
        if (charToInput.length) {
          var prevHtml = $(that.selectedTd).html();
          that.selectedTd.innerHTML = charToInput;
          that.startEdit(evt);
          // ignore the change made by invisible input
          that.setPrevCellHTML(prevHtml);
          evt.preventDefault();
        }
      }, 0);
      // Clean input used to determine
      // if keystroke should start editing
      that.charEl.val("");
    })
  return this;
}
window.EditTable = EditTable;})();