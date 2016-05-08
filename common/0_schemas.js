/*
var afDef = {
  mathjsCode: {
    type: 'ace',
    'data-ace-height': '100px',
    'data-ace-theme': 'clouds',
    'data-ace-mode': 'matlab'
  },
  inlineField: {
    afFieldInput: {
      class: "set-inline-table"
    }
  },
  inlinePanel: {
    afFieldInput: {
      class: "set-inline-table-on-parent-panel"
    }
  }
}

Schemas = {};

var _autoValueHiddenField = {
  type: String,
  autoValue: function() {
    if (this.operator !== "$pull") {
      return Random.id();
    }
  },
  autoform: {
    type: "hidden"
  },
  optional: true
}

// Variables

Schemas.Variable = new SimpleSchema({
  '_id': _autoValueHiddenField,
  name: {
    type: String,
    optional: true,
    autoform: afDef.inlinePanel
  },
  color: {
    type: String,
    optional: true,
    autoform: {
      type: "bootstrap-minicolors"
    }
  },
  isInfluence: {
    type: Boolean,
    optional: true
  },
  isReadout: {
    type: Boolean,
    optional: true
  }
});


// Procedures
Schemas.Procedure = new SimpleSchema({
  '_id': _autoValueHiddenField,
  'name': {
    type: String,
    label: "Procedure Name",
    optional: true
  },
  'variables': {
    type: [Schemas.Variable],
    optional: true
  },
  'func': {
    type: String,
    optional: true,
    autoform: afDef.mathjsCode
  },
  n: {
    type: Number,
    min: 1,
    max: 20,
    optional: true,
    autoform: afDef.inlineField
  },
  cl: {
    type: Number,
    defaultValue: 0.953,
    label: "Choose a confidence level",
    optional: true,
    autoform: afDef.inlineField
  },
  postProcessing: {
    type: String,
    autoform: afDef.mathjsCode,
    defaultValue:
      'k_fmt                = fmt_to_fixed(k, 2)\n' +
      'uut_prefix_val       = prefix_val(uut_prefix)\n' +
      'U_fmt                = fmt_to_precision(U / uut_prefix_val, 2)\n' +
      'U_prec               = decimal_places(U_fmt)\n' +
      'uut_readout_fmt      = fmt_to_fixed(uut_readout / uut_prefix_val, decimal_places(uut_resolution / uut_prefix_val) )\n' +
      'correct_value_fmt    = fmt_to_fixed(correct_value / uut_prefix_val, U_prec)\n' +
      'err_fmt              = fmt_to_fixed(y / uut_prefix_val, U_prec)\n' +
      'mpe_fmt              = fmt_to_fixed(mpe / uut_prefix_val, U_prec)\n' +
      'tur                  = fmt_to_fixed(mpe/U, 2)\n' +
      'veff_fmt             = veff > 9999 ? "∞" : round(veff)',

  }
})
// Uncertanties
Schemas.Uncertanty = new SimpleSchema({
  name: {
    type: String,
    optional: true,
    autoform: afDef.inlineField
  },
  distribution: {
    type: String,
    optional: true,
    autoform: afDef.inlineField
  },
  k: {
    type: Number,
    optional: true,
    autoform: afDef.inlineField
  },
  ci: {
    type: Number,
    optional: true,
    autoform: afDef.inlineField
  },
  formula: {
    type: String,
    autoform: afDef.mathjsCode,
    optional: true
  },
  description: {
    type: String,
    optional: true
  }
})

// Ranges
Schemas.Range = new SimpleSchema({
  '_id': _autoValueHiddenField,
  start: {
    type: Number,
    autoform: afDef.inlineField
  },
  end: {
    type: Number,
    autoform: afDef.inlineField
  },
  fullscale: {
    type: Number,
    autoform: afDef.inlineField
  },
  resolution: {
    type: String
  },
  autorangeConditions: {
    type: String
  },
  nominal: {
    type: String
  },
  uncertanties: {
    type: [Schemas.Uncertanty],
    optional: false
  }
})

// Instruments
Schemas.Instrument = new SimpleSchema({
  '_id': _autoValueHiddenField,
  name: {
    type: String,
    label: "Instrument Name",
    optional: true
  },
  unit: {
    type: String,
    optional: true,
    autoform: afDef.inlineField
  },
  kind: {
    label: "Ty" + "pe",
    type: String,
    optional: true,
    autoform: afDef.inlineField
  },
  description: {
    type: String,
    optional: true
  },
  ranges: {
    type: [Schemas.Range],
    optional: true
  }
})

// Cells

Schemas.Cell = new SimpleSchema({
  data: {
    type: String,
    optional: true
  }
})


// Groups

Schemas.Group = new SimpleSchema({
  cells: {
    type: [Schemas.Cell],
    optional: true
  }
})

// Rows

Schemas.Row = new SimpleSchema({
  groups: {
    type: [Schemas.Group],
    optional: true
  }
})


// Worksheets

Schemas.Worksheet = new SimpleSchema({
  '_id': _autoValueHiddenField,
  'procedure_id': {
    type: String,
    optional: true,
    autoform: {
      type: "select",
      options: function () {
        return _.filter(
          Spreadsheets
          .findOne()
          .procedures, function(p) {
            return p !== null
          })
        .map(function(p) {
          var obj = {"label": p.name, "value": p._id};
          return obj;
        });
      }
    }    
  },
  rows: {
    type: [Schemas.Row],
    optional: true,
    autoform: {
      type: "editTable"
    }
  }
})


// Spreadsheets
Schemas.Spreadsheet = new SimpleSchema({
  title: {
    type: String,
    label: "Title",
    max: 100
  },
  procedures: {
    type: [Schemas.Procedure],
    optional: true
  },
  instruments: {
    type: [Schemas.Instrument],
    optional: true
  },
  worksheets: {
    type: [Schemas.Worksheet],
    optional: true    
  }
})*/