Template.cells.helpers({
  readoutHtml: function(val, cellId) {
    return "<div>"+val+"</div>"
  }
});

//$(".editTable").find("td").each(function(i,el){el.textContent = "a"})

Template.cells.rendered = function() {
  var that = this;
  this.autorun(function() {
    var readout = that.data.readout;
    if (readout !== null) {
      var el = document.getElementById(that.data.cellId);
      el.textContent = that.data.readout;
    }
  });
};