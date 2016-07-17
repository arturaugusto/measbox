Template.showSpreadsheet.events({
  'click #newWorksheet': function(evt) {
    Meteor.call("newWorksheet");
  },
  'click .select-worksheet': function(evt) {
    $(".editTable tbody").html("");
    Session.set("selectedWorksheetId", "");
    setTimeout(function() {
      Session.set("selectedWorksheetId", $(evt.target).data("worksheet"));
    }, 100);
  }  
});
