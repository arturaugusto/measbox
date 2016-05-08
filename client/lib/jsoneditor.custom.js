var commands, dom;
/*
JSONEditor.defaults.editors.dotdecimal = JSONEditor.defaults.editors.string.extend({
  sanitize: function(value) {
    value = (value + "").replace(',', '.');
    return (value + "").replace(/[^0-9\.\-eE]/g, "");
  }
});
*/

var generateId = function() {
  return Random.id();
}

JSONEditor.defaults.editors.random_number = JSONEditor.defaults.editors.string.extend({
  afterInputReady: function() {
    var curr = this.getValue();
    if (curr === "") {
      return this.setValue(generateId());
    } else {
      return false;
    }
  },
  unregister: function() {
    return this._super();
  }
});

JSONEditor.defaults.editors.code = JSONEditor.defaults.editors.string.extend({
  afterInputReady: function() {
    var mode, options, self;
    self = this;
    options = void 0;
    if (this.source_code) {
      if (this.options.wysiwyg && ["html", "bbcode"].indexOf(this.input_type) >= 0 && window.jQuery && window.jQuery.fn && window.jQuery.fn.sceditor) {
        options = $.extend({}, {
          plugins: (self.input_type === "html" ? "xhtml" : "bbcode"),
          emoticonsEnabled: false,
          width: "100%",
          height: 300
        }, JSONEditor.plugins.sceditor, self.options.sceditor_options || {});
        window.jQuery(self.input).sceditor(options);
        self.sceditor_instance = window.jQuery(self.input).sceditor("instance");
        self.sceditor_instance.blur(function() {
          var val;
          val = window.jQuery("<div>" + self.sceditor_instance.val() + "</div>");
          window.jQuery("#sceditor-start-marker,#sceditor-end-marker,.sceditor-nlf", val).remove();
          self.input.value = val.html();
          self.value = self.input.value;
          self.is_dirty = true;
          if (self.parent) {
            self.parent.onChildEditorChange(self);
          } else {
            self.jsoneditor.onChange();
          }
          self.jsoneditor.notifyWatchers(self.path);
        });
      } else if (this.options.froala && window.jQuery && window.jQuery.fn && window.jQuery().editable) {
        options = window.jQuery.extend({}, {
          inlineMode: false
        }, self.options || {});
        window.jQuery(self.input).editable(options);
        window.jQuery(self.input).parent().find(".froala-box").css("background", "#FFFFFF");
        window.jQuery(self.input).on('editable.contentChanged', function(e, editor) {
          var val;
          val = window.jQuery(self.input).editable("getHTML", true, true);
          self.input.value = val;
          self.value = val;
          self.is_dirty = true;
          if (self.parent) {
            self.parent.onChildEditorChange(self);
          } else {
            self.jsoneditor.onChange();
          }
          self.jsoneditor.notifyWatchers(self.path);
        });
      } else if (this.input_type === "markdown" && window.EpicEditor) {
        this.epiceditor_container = document.createElement("div");
        this.input.parentNode.insertBefore(this.epiceditor_container, this.input);
        this.input.style.display = "none";
        options = $extend({}, JSONEditor.plugins.epiceditor, {
          container: this.epiceditor_container,
          clientSideStorage: false
        });
        this.epiceditor = new window.EpicEditor(options).load();
        this.epiceditor.importFile(null, this.getValue());
        this.epiceditor.on("update", function() {
          var val;
          val = self.epiceditor.exportFile();
          self.input.value = val;
          self.value = val;
          self.is_dirty = true;
          if (self.parent) {
            self.parent.onChildEditorChange(self);
          } else {
            self.jsoneditor.onChange();
          }
          self.jsoneditor.notifyWatchers(self.path);
        });
      } else if (window.ace) {
        mode = this.input_type;
        if (mode === "cpp" || mode === "c++" || mode === "c") {
          mode = "c_cpp";
        }
        this.ace_container = document.createElement("div");
        this.ace_container.style.width = "100%";
        this.ace_container.style.position = "relative";
        this.ace_container.style.height = "400px";
        if (self.options.height) {
          this.ace_container.style.height = self.options.height;
        }
        this.input.parentNode.insertBefore(this.ace_container, this.input);
        this.input.style.display = "none";
        this.ace_editor = window.ace.edit(this.ace_container);
        this.ace_editor.$blockScrolling = Infinity;
        this.ace_editor.setValue(this.getValue(), -1);
        if (JSONEditor.plugins.ace.theme) {
          this.ace_editor.setTheme("ace/theme/" + JSONEditor.plugins.ace.theme);
        }
        mode = window.ace.require("ace/mode/" + mode);
        if (mode) {
          this.ace_editor.getSession().setMode(new mode.Mode());
        }
        this.ace_editor.on("change", function() {
          var val;
          val = self.ace_editor.getValue();
          self.input.value = val;
          self.refreshValue();
          self.ace_editor.resize();
          self.is_dirty = true;
          if (self.parent) {
            self.parent.onChildEditorChange(self);
          } else {
            self.jsoneditor.onChange();
          }
          self.jsoneditor.notifyWatchers(self.path);
        });
      }
    }
    self.theme.afterInputReady(self.input);
  }
});
/*
dom = ace.define.modules["ace/lib/dom"];

commands = ace.define.modules["ace/commands/default_commands"].commands;

commands.push({
  name: "Toggle Fullscreen",
  bindKey: "F11",
  exec: function(editor) {
    dom.toggleCssClass(document.body, "fullScreen");
    dom.toggleCssClass(editor.container, "fullScreen-editor");
    editor.resize();
  }
});
*/
/*
JSONEditor.defaults.resolvers.unshift(function(schema) {
  if (schema.type === "number") {
    return "dotdecimal";
  }
});
*/
JSONEditor.defaults.resolvers.unshift(function(schema) {
  if (schema.type === "random_number") {
    return "random_number";
  }
});

JSONEditor.defaults.resolvers.unshift(function(schema) {
  if (schema.type === 'object' && schema.format === 'hot') {
    return 'hot';
  }
});

JSONEditor.defaults.resolvers.unshift(function(schema) {
  if (schema.type === "code") {
    return "code";
  }
});

JSONEditor.plugins.selectize.enable = true;