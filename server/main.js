Meteor.startup(function () {
  // FIXME
  // This publish only updates on page reload
  // Idea: Try using array of objects instead of array of ids?
  /*
  Meteor.publish('Procedures', function (proceduresIds) {
    if (proceduresIds !== undefined) {
      return Procedures.find({
        "_id": {
          "$in": proceduresIds
        }
      });
    } else {
      return [];
    }
  });
  Procedures.allow({
    insert: function () {
      return true;
    },
    remove: function () {
      return true;
    }
  });
  Spreadsheets.allow({
    insert: function () {
      return true;
    },
    update: function () {
      return true;
    },
    remove: function () {
      return true;
    }
  });  */
});
