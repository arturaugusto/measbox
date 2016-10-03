Template.chooseAction.helpers({
  sTemplates: function() {
    var sTemplates = Session.get("sTemplates");
    if (sTemplates) {
      return JSON.parse(sTemplates);
    } else {
      return [];
    }
  },
  hasTemplates: function(t) {
    return t.length > 0;
  }
});

Template.chooseAction.rendered = function() {
  var that = this;
  
  var octo = new Octokat();
  window.ghrepo = octo.repos("arturaugusto", "measbox-templates");
  this.autorun(function() {
    if ( !Spreadsheets.findOne() ) {
      $('.choose-action').modal('show');
      
      window.ghrepo.contents("templates").read(function(e,c){
        Session.set("sTemplates", c);
      });
    }
  });  
};

Template.showSpreadsheet.events({
  'click .newSpreadsheet': function(evt) {
    var fileName = $(evt.target).data("file");
    
    if (fileName) {
      window.ghrepo.contents("templates/examples.json").read(
        function(e,c){
          createSpreadsheet(JSON.parse(c));
        }
      );
    } else {
      createSpreadsheet();
    }
    return;
  }
});
