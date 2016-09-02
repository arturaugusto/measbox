Template.showSpreadsheet.events({
  'click #newWorksheet': function(evt) {
    Meteor.call("newWorksheet");
  },
  'click .select-worksheet': function(evt) {
    refreshEditTable(evt);
  },
  'click #worksheets-tab': function(evt) {
  	console.log("lala");
    refreshEditTable();
  }
});
