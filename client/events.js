Template.showSpreadsheet.events({
  'click #newWorksheet': function(evt) {
    Meteor.call("newWorksheet");
  },
  'click .select-worksheet': function(evt) {
    Session.set("selectedWorksheetId", $(evt.target).data("worksheet"));
  }  
});
