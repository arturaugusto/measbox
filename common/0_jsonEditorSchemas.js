JsonEditorSchemas = {};
JsonEditorInstances = {};

var postProcessingDefault = `outputUnit      = var0Unit
outputPrefix    = SIPrefix(y)
#outputPrefix    = var0Prefix
outputPrefixVal = prefixVal(outputPrefix)
kFmt            = fmtToFixed(k, 2)
UFmt            = fmtToPrecision(U / outputPrefixVal, 2)
UPrec           = decimalPlaces(UFmt)
outputFmt       = fmtToFixed(y / outputPrefixVal, UPrec)
veffFmt         = veff > 9999 ? "∞" : round(veff)

MC_ucFmt        = fmtToPrecision(mc.uc / outputPrefixVal, 2)
MC_ULowFmt      = fmtToPrecision((mc.sci_limits[1] - mc.y) / outputPrefixVal, 2)
MC_UHighFmt     = fmtToPrecision((mc.sci_limits[2] - mc.y) / outputPrefixVal, 2)
MC_dlowFmt      = fmtToPrecision(mc.d_low, 2)
MC_dhighFmt     = fmtToPrecision(mc.d_high, 2)
MC_tolerance    = fmtToPrecision(mc.num_tolerance, 2)
`;

var resultsTemplateDefault = [
  {
    "parameterTemplate": "Output",
    "valueTemplate": "<%=outputFmt%> <%=outputPrefix%><%=outputUnit%>",
    "toReport": true
  },
  {
    "parameterTemplate": "U",
    "valueTemplate": "<%=UFmt%> <%=outputPrefix%><%=outputUnit%>",
    "toReport": true
  },
  {
    "parameterTemplate": "k",
    "valueTemplate": "<%=kFmt%>",
    "toReport": true
  },
  {
    "parameterTemplate": "&#x1D708;<sub>eff</sub>",
    "valueTemplate": "<%=veffFmt%>",
    "toReport": true
  },
  {
    "parameterTemplate": "MC.M",
    "valueTemplate": "<%=mc.M%>",
    "toReport": false
  },
  {
    "parameterTemplate": "MC.uc",
    "valueTemplate": "<%=MC_ucFmt%> <%=outputPrefix%><%=outputUnit%>",
    "toReport": false
  },
  {
    "parameterTemplate": "MC.Interval",
    "valueTemplate": "[<%=MC_ULowFmt%>, <%=MC_UHighFmt%>] <%=outputPrefix%><%=outputUnit%>",
    "toReport": false
  },
  {
    "parameterTemplate": "<i>d</i><sub>low</sub>, <i>d</i><sub>high</sub>",
    "valueTemplate": "<%=MC_dlowFmt%>, <%=MC_dhighFmt%>",
    "toReport": false
  },
  {
    "parameterTemplate": "MC.Validated (δ=<%=MC_tolerance%>)",
    "valueTemplate": "<%=String(mc.GUF_validated)%>",
    "toReport": false
  }
]

JsonEditorSchemas.instruments = {
  type: "array",
  title: "Instruments",
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
                    "enum": ["uniform", "normal", "triangular", "arcsine", "studentt"],
                    "default": "uniform"
                  },
                  unit: {
                    type: "string",
                    title: "Unit",
                    "default": ""
                  },
                  customDist: {
                    title: "Custom distribution",
                    type: "string",
                    format: "textarea",
                    "default": "uniform(-value, value)",
                    height: "100px"
                  },
                  df: {
                    type: "number",
                    title: "df",
                    "default": 9999
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
                  },
                  estimate: {
                    type: "number",
                    title: "Estimate",
                    "default": 0
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
      }
    }
  }
};

JsonEditorSchemas.procedures = {
  type: "array",
  title: "Procedures",
  items: {
    headerTemplate: "{{ self.name }}",
    type: 'object',
    title: 'Procedure',
    options: {
      disable_edit_json: false,
      disable_properties: false,
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
      name: {
        propertyOrder: 1,
        type: "string",
        title: 'Name'
      },
      variables: {
        propertyOrder: 3,
        title: 'Variables',
        type: 'array',
        format: 'table',
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
              "enum": ["Standard", "UUT", "Influence"],// Readout
            }
          }
        },
        "default": [
          {
            "name": "UUT",
            "color": "#ffffe7",
            "kind": "UUT"
          }, {
            "name": "Ref",
            "color": "#f2f1ff",
            "kind": "Standard"
          }
        ]
      },
      n: {
        propertyOrder: 4,
        type: 'number',
        title: 'Repetitions',
        "default": 4
      },
      func: {
        propertyOrder: 5,
        type: 'code',
        format: 'matlab',
        title: 'Mathematical model',
        "default": 'UUT - Ref',
        options: {
          height: '40px'
        }
      },
      additionalOptions: {
        propertyOrder: 6,
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
          M: {
            type: 'number',
            title: 'Max. Adaptive Monte Carlo M',
            "default": 50e3,
            "enum": [50e3, 20e4, 50e4, 10e5, 50e5, 10e6, 50e6]
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
            type: 'array',
            title: 'Results',
            format: 'table',
            default: resultsTemplateDefault,
            items: {
              type: 'object',
              properties: {
                parameterTemplate: {
                  type: 'string',
                  title: 'Parameter'
                },
                valueTemplate: {
                  type: 'string',
                  title: 'Value'
                },
                toReport: {
                  type: 'boolean',
                  title: 'Report',
                  format: 'checkbox'
                }
              }
            }
          }
        },
        defaultProperties: ["cl", "M", "postProcessing", "resultsTemplate"]
      }
    }
  }
};

