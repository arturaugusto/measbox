Template.jsonEditorForm.onRendered(function() {
  var that = this;
  var field = this.data.field;
  var $el = $(this.firstNode).find(".json-editor-holder");
  JsonEditorInstances[field] = new JSONEditor($el[0], {
    theme: "bootstrap3",
    iconlib: "bootstrap3",
    enhanced_ui: "selectize",
    disable_collapse: false,
    form_name_root: false,
    schema: JsonEditorSchemas[field]
  });
  
  //$el.find("h3").first().hide();
  /*
  JsonEditorInstances[field].on("change", function() {
    var data = JsonEditorInstances[field].getValue();
  });*/
  var data = Spreadsheets.findOne()[field];
  if (data !== undefined) {
    JsonEditorInstances[field].setValue(data);  
  }

});

Template.jsonEditorForm.onCreated(function() {
});

Template.jsonEditorForm.events({
  'click .set-field-data': function() {
    var field = this.field;
    var data = {};
    data[field] = JsonEditorInstances[field].getValue();
    // Triger click events for selected worksheet
    $(".active .select-worksheet").trigger("click");
    setData(data);
  }
});