Template.cells.helpers({
  readoutHtml: function(val, cellId) {
    return "<div>"+val+"</div>"
  }
});



Template.cells.rendered = function() {
  var that = this;

  this.autorun(function() {
    var readout = that.data.readout;
    if (readout !== null) {
      document.getElementById(that.data.cellId).textContent = that.data.readout;
    }
  });

};