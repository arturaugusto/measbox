Meteor.publish('currentSpreadsheet', function (spreadsheetId) {
  return Spreadsheets.find( { _id: spreadsheetId } );
});
