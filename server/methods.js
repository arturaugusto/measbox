Meteor.methods({
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

