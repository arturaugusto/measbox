// Routes
Router.route('/:_id', {
  template: 'showSpreadsheet',
  waitOn: function () {
    var that = this;
    this.spreadsheetId = this.params._id;
    return [
      Meteor.subscribe('currentSpreadsheet', this.spreadsheetId)
    ];
  },
  data: function () {
    var item = Spreadsheets.findOne( { _id: this.params._id } );
    return item;
  }
});