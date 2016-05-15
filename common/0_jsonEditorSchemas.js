JsonEditorSchemas = {};
JsonEditorInstances = {};

var postProcessingDefault = `kFmt            = fmtToFixed(k, 2)
uutPrefixVal    = prefixVal(uutPrefix)
UFmt            = fmtToPrecision(U / uutPrefixVal, 2)
UPrec           = decimalPlaces(UFmt)
uutReadoutFmt   = fmtToFixed(uutReadout / uutPrefixVal, decimalPlaces(uutResolution / uutPrefixVal) )
correctValueFmt = fmtToFixed(correctValue / uutPrefixVal, UPrec)
errFmt          = fmtToFixed(y / uutPrefixVal, UPrec)
mpeFmt          = fmtToFixed(mpe / uutPrefixVal, UPrec)
tur             = fmtToFixed(mpe/U, 2)
veffFmt         = veff > 9999 ? "∞" : round(veff)`;

var resultsTemplateDefault = `<span style="color:#00628C">
Reference: <%=correctValueFmt%> <%=uutPrefix%><%=uutUnit%>
U: <%=UFmt%> <%=uutPrefix%><%=uutUnit%>
</span>

<span style="color:rgb(170,0,0)">
<%=uutName%>: <%=uutReadoutFmt%> <%=uutPrefix%><%=uutUnit%>
MPE: <%=mpeFmt%> <%=uutPrefix%><%=uutUnit%>
</span>

Error: <%=errFmt%> <%=uutPrefix%><%=uutUnit%>
TUR: <%=tur%>

k: <%=kFmt%>

<i>v</i><sub>eff</sub>: <%=veffFmt%>`;

confirmDeleteFunc = function (arg) {
  return window.confirm("Confirm remove " + arg.item_title + "?");
}

JsonEditorSchemas.instruments = {
  type: "array",
  title: "Instruments",
  confirmDelete: confirmDeleteFunc, 
  items: {
    type: "object",
    title: "Instrument",
    headerTemplate: "{{ self.name }}",
    options: {
      collapsed: true,
      disable_edit_json: false,
      disable_properties: true,
      disable_collapse: false
    },
    properties: {
      _id: {
        type: "random_number",
        "default": "",
        options: {
          hidden: true
        }
      },
      name: {
        title: "Name",
        type: "string",
        "default": "New Instrument",
        propertyOrder: 1
      },
      unit: {
        title: "Unit",
        type: "string",
        propertyOrder: 2
      },
      kind: {
        propertyOrder: 3,
        type: "string",
        title: "Kind",
        "enum": ["Meter", "Source", "Fixed"],
        "default": "Meter"
      },
      ranges: {
        type: "array",
        title: "Ranges",
        uniqueItems: true,
        propertyOrder: 3,
        confirmDelete: confirmDeleteFunc,
        items: {
          type: "object",
          title: "Range",
          headerTemplate: "{{ self.limits.start }} .. {{ self.limits.end }}",
          options: {
            collapsed: true,
            disable_edit_json: true,
            disable_properties: true
          },
          properties: {
            limits: {
              type: "object",
              title: "Range Limits",
              format: "grid",
              propertyOrder: 4,
              options: {
                collapsed: true,
                disable_edit_json: true,
                disable_properties: true
              },
              properties: {
                start: {
                  title: "Range start",
                  propertyOrder: 1,
                  type: "number"
                },
                end: {
                  title: "Range end",
                  propertyOrder: 2,
                  type: "number"
                },
                fullscale: {
                  title: "Full Scale",
                  propertyOrder: 3,
                  type: "number"
                },
                autorangeConditions: {
                  title: "Autorange Conditions",
                  propertyOrder: 4,
                  type: "string",
                  format: "textarea",
                  "default": "((readout >= rangeStart) and (readout <= rangeEnd)) or isFixed"
                },
                resolution: {
                  title: "Resolution",
                  propertyOrder: 5,
                  type: "string",
                  "default": "0.001e-3"
                }
              }
            },
            nominalValue: {
              title: "Nominal Value",
              type: "string",
              format: "textarea",
              "default": "readout = isFixed ? 0 : readout",
              height: "100px"
            },
            uncertainties: {
              type: "array",
              title: "Uncertainties",
              confirmDelete: confirmDeleteFunc,
              uniqueItems: true,
              options: {
                collapsed: true
              },
              items: {
                type: "object",
                headerTemplate: "{{self.name}}",
                options: {
                  collapsed: true,
                  disable_edit_json: true,
                  disable_properties: false,
                  remove_empty_properties: true
                },
                properties: {
                  name: {
                    description: 'Uncertainties named "MPE" for the UUT will not be considered on final budget.',
                    title: "Name",
                    type: "string"
                  },
                  description: {
                    title: "Description",
                    type: "string"
                  },
                  distribution: {
                    type: "string",
                    title: "Distribution",
                    "enum": ["uniform", "normal", "triangular", "arcsine"],
                    "default": "uniform"
                  },
                  customDist: {
                    title: "Custom distribution",
                    type: "string",
                    format: "textarea",
                    "default": "uniform(-value, value)",
                    height: "100px"
                  },
                  k: {
                    type: "number",
                    title: "k",
                    "default": 2
                  },
                  ci: {
                    type: "number",
                    title: "ci",
                    "default": 0.95
                  },
                  formula: {
                    title: "Formula",
                    type: "string",
                    format: "textarea",
                    "default": "u = 0.01 * readout",
                    height: "100px"
                  }
                },
                defaultProperties: ["name", "description", "distribution", "formula"]
              },
              "default": [
                {
                  name: "Resolution",
                  description: "Half of minimum step size",
                  distribution: "uniform",
                  formula: "u = resolution / 2"
                }, {
                  name: "MPE",
                  description: "Maximum Permissible Error",
                  distribution: "uniform",
                  formula: "mpe = 0.005 * readout"
                }
              ]
            },
            _id: {
              type: "random_number",
              "default": "",
              options: {
                hidden: true
              }
            }
          }
        }
      },
      automation: {
        type: "object",
        title: "Automation",
        options: {
          collapsed: true,
          disable_edit_json: true,
          disable_properties: false
        },
        properties: {
          code: {
            type: "code",
            title: "Code",
            format: "python",
            propertyOrder: 4,
            options: {
              height: "100px"
            },
            "default": "@Feat(None)\n" + "def readout(self):\n" + "    return (self.query('OUT?'))\n\n" + "@readout.setter\n" + "def readout(self, value):\n" + " self.write('OUT {:.8f} V'.format(value))"
          }
        }
      }
    }
  }
};

JsonEditorSchemas.procedures = {
  type: "array",
  title: "Procedures",
  confirmDelete: confirmDeleteFunc,
  items: {
    headerTemplate: "{{ self.functionalityTags }}",
    type: 'object',
    title: 'Procedure',
    options: {
      disable_edit_json: false,
      disable_properties: true,
      disable_collapse: false,
      collapsed: true
    },
    properties: {
      _id: {
        type: "random_number",
        "default": "",
        options: {
          hidden: true
        }
      },
      functionalityTags: {
        propertyOrder: 1,
        type: "array",
        title: 'Functionality Tags',
        uniqueItems: true,
        items: {
          type: "string"
        }
      },
      variables: {
        propertyOrder: 2,
        title: 'Variables',
        description: 'The first item from this list will be treated as uut.',
        type: 'array',
        format: 'table',
        confirmDelete: confirmDeleteFunc,
        options: {
          collapsed: true
        },
        items: {
          options: {
            collapsed: true,
            disable_edit_json: false,
            disable_properties: false,
            disable_collapse: false
          },
          type: 'object',
          title: 'Variable',
          headerTemplate: '{{ self.name }}',
          properties: {
            name: {
              type: 'string',
              title: 'Name'
            },
            color: {
              type: 'string',
              format: 'color',
              title: 'Column color',
              "default": '#ffffff'
            },
            kind: {
              type: "string",
              title: "Kind",
              "enum": ["Readout", "Influence"],
              "default": "Readout"
            }
          }
        },
        "default": [
          {
            "name": "UUT",
            "color": "#ffffe7",
            "kind": "Readout"
          }, {
            "name": "Ref",
            "color": "#f2f1ff",
            "kind": "Readout"
          }
        ]
      },
      n: {
        propertyOrder: 3,
        type: 'number',
        title: 'Repetitions',
        "default": 4
      },
      func: {
        propertyOrder: 4,
        type: 'code',
        format: 'matlab',
        title: 'Mathematical model',
        "default": 'UUT - Ref',
        options: {
          height: '40px'
        }
      },
      additionalOptions: {
        propertyOrder: 5,
        type: 'object',
        title: 'Additional Options',
        options: {
          disable_edit_json: true,
          disable_properties: false,
          disable_collapse: false,
          collapsed: true
        },
        properties: {
          cl: {
            type: 'number',
            title: 'Confidence level',
            "default": 0.953
          },
          automation: {
            type: "code",
            title: "Automation Script",
            format: "python",
            options: {
              height: "200px"
            }
          },
          postProcessing: {
            type: 'code',
            format: 'python',
            title: 'Post Processing',
            "default": postProcessingDefault,
            options: {
              height: '200px'
            }
          },
          resultsTemplate: {
            type: 'code',
            format: 'markdown',
            title: 'Results Template',
            "default": resultsTemplateDefault,
            options: {
              height: '200px'
            }
          }   
        },
        defaultProperties: ["cl", "automation", "postProcessing"]
      }
    }
  }
};
