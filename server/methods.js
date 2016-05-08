Meteor.methods({
  removeArrayItem: function(id, arrayFieldName, arrayFieldId) {
    var query = {};
    query[arrayFieldName] = {_id: arrayFieldId};
    Spreadsheets.update(id, {
      "$pull": query
    });
  },
  setData: function(id, path, data) {
    var obj = {};
    obj[path] = data;
    Spreadsheets.update(
      {_id: id}, 
      {$set: obj}
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

