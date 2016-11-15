Template.showSpreadsheet.events({
  'click #newWorksheet': function(evt) {
    Meteor.call( "newWorksheet", Spreadsheets.findOne()._id );
  },
  // User created tabs to select existing worksheets
  'click .select-worksheet': function(evt) {
    refreshEditTable(evt);
    $("#worksheets-tab").tab("show");
  },
  // Upper tab to select worksheets
  'click #worksheets-tab': function(evt) {
    refreshEditTable();
  },
  'click .nav-tabs': function() {
    window.setTimeout(function() {
      resizeGrid.triggerFixGridEvents();
    }, 600); // the timer here needs to be more than 400, that is the fadeIn effect time
  }
});
