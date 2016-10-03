Meteor.methods({
  createSpreadsheet: function(content) {
    // data was encoded with:
    //JSON.stringify(Spreadsheets.findOne());
    // TODO: Enable base64 option
    //utoa(JSON.stringify(Spreadsheets.findOne()));
    // decode data:
    //var dataObj = JSON.parse(data);
    // TODO: Enable base64 option
    //var dataObj = JSON.parse(atou(data));
    console.log(content);
    var dataObj;
    if (!content) {
      dataObj = {"_id":"7yciWRmvZsyHfA5yc","instruments":[],"null":"","procedures":[],"undefined":[{"_id":"sM4Tg4t6KPHj7paix","name":"Flukex","unit":"V","kind":"Meter","ranges":[{"limits":{"start":0,"end":10,"fullscale":10,"autorangeConditions":"((readout >= rangeStart) and (readout <= rangeEnd)) or isFixed","resolution":"0.001"},"nominalValue":"readout = isFixed ? 0 : readout","uncertainties":[{"name":"Resolution","description":"Half of minimum step size","distribution":"uniform","formula":"u = resolution / 2"},{"name":"MPE","description":"Maximum Permissible Error","distribution":"uniform","formula":"mpe = 0.005 * readout"}],"_id":"hbjLk4ymAaebr34fA"},{"limits":{"start":0,"end":100,"fullscale":100,"autorangeConditions":"((readout >= rangeStart) and (readout <= rangeEnd)) or isFixed","resolution":"0.001"},"nominalValue":"readout = isFixed ? 0 : readout","uncertainties":[{"name":"Resolution","description":"Half of minimum step size","distribution":"uniform","formula":"u = resolution / 2"},{"name":"MPE","description":"Maximum Permissible Error","distribution":"uniform","formula":"mpe = 0.005 * readout"}],"_id":"rSrhh5rToezTJRyPe"}],"automation":{"code":"@Feat(None)def readout(self):    return (self.query('OUT?'))@readout.setterdef readout(self, value): self.write('OUT {:.8f} V'.format(value))"}},{"_id":"5tsaxnGB4SkHmCBzf","name":"87V","unit":"V","kind":"Meter","ranges":[{"limits":{"start":0,"end":10,"fullscale":10,"autorangeConditions":"((readout >= rangeStart) and (readout <= rangeEnd)) or isFixed","resolution":"0.1"},"nominalValue":"readout = isFixed ? 0 : readout","uncertainties":[{"name":"Resolution","description":"Half of minimum step size","distribution":"uniform","formula":"u = resolution / 2"},{"name":"MPE","description":"Maximum Permissible Error","distribution":"uniform","formula":"mpe = 0.05 * readout"}],"_id":"m6A43dmsrhP3BEF3b"},{"limits":{"start":0,"end":100,"fullscale":100,"autorangeConditions":"((readout >= rangeStart) and (readout <= rangeEnd)) or isFixed","resolution":"0.01"},"nominalValue":"readout = isFixed ? 0 : readout","uncertainties":[{"name":"Resolution","description":"Half of minimum step size","distribution":"uniform","formula":"u = resolution / 2"},{"name":"MPE","description":"Maximum Permissible Error","distribution":"uniform","formula":"mpe = 0.005 * readout"}],"_id":"6qfaxSkdc3nQsCuzD"}],"automation":{"code":"@Feat(None)def readout(self):    return (self.query('OUT?'))@readout.setterdef readout(self, value): self.write('OUT {:.8f} V'.format(value))"}}],"worksheets":[{"rows":[{"_id":"EBvmTiMTqRtW82CGA"}],"_id":"BiSnXbBPT5jxB87jK"}]};
    } else {
      dataObj = content;
    }

    delete dataObj._id;
    return Spreadsheets.insert( dataObj );
  },
  removeArrayItem: function(id, arrayFieldName, arrayFieldId) {
    var query = {};
    query[arrayFieldName] = {_id: arrayFieldId};
    Spreadsheets.update(id, {
      "$pull": query
    });
  },
  removeTableRow: function(id, wsId, rowIdArrOrCondition) {
    /*
    
    Sample resulting update operation:

    db.getCollection('Spreadsheets')
    .update(
      {_id: "BgkmDNsuGi7FgEMAH"},
      {$pull: 
        {"worksheets.0.rows": 
          {$or: 
            [
              {_id: 'kC5zRq2MN3jsqHXS7'},
              {_id: 'sH7Fp9zN7LjfaLnkt'}
            ]
          }
        }
      },
      { multi: true }
    )
    */
    var query = { _id: id };
    var target = {};
    target["worksheets."+wsId+".rows"] = rowIdArrOrCondition;
    var operation = { $pull: target };

    console.log(id, wsId, rowIdArrOrCondition);

    Spreadsheets.update(
      query,
      operation,
      { multi: true}
    )
  },
  setData: function(id, data) {
    Spreadsheets.update(
      {_id: id}, 
      {$set: data}
    )
  },
  newWorksheet: function() {
    Spreadsheets.update({
      _id: "BgkmDNsuGi7FgEMAH"
    },{
      $push:{
        "worksheets": {
          "rows": [], 
          "_id" : Random.id()
        }
      }
    })
  },
  setNestedFieldData: function(id, parent, parentId, field, data, operator) {
    var query = {
      _id: id
    };
    query[parent+"._id"] = parentId;
    
    var obj = {};
    obj[parent+".$."+field] = data;
    
    var operation = {};
    if (operator === undefined) {
      operation = {$set: obj}
    } else {
      operation[operator] = obj;
    }
    Spreadsheets.update(
      query,
      operation
    );
  }  
});

