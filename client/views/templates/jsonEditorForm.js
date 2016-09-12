Template.jsonEditorForm.onRendered(function() {
  var that = this;
  var field = this.data.field;
  var $el = $(this.firstNode).find(".json-editor-holder");
  this.instance = JsonEditorInstances[field] = new JSONEditor($el[0], {
    theme: "bootstrap3",
    iconlib: "bootstrap3",
    enhanced_ui: "selectize",
    disable_collapse: false,
    form_name_root: false,
    schema: JsonEditorSchemas[field]
  });
  //$el.find("h3").first().hide();
  
  this.onChangeTimeoutId = false;

  // Defer on change to avoid blink of editor on start
  setTimeout(function() {
    JsonEditorInstances[field].on("change", function() {
      if (that.onChangeTimeoutId) {
        clearTimeout(that.onChangeTimeoutId);
      }

      that.onChangeTimeoutId = setTimeout(function() {

        var data = {};
        data[field] = that.instance.getValue();
        setData(data);
      }, 2000);
    });
  }, 10);
  var data = Spreadsheets.findOne()[field];
  if (data !== undefined) {
    JsonEditorInstances[field].setValue(data);  
  }
});

Template.jsonEditorForm.onCreated(function() {
});