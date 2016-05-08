var Collections = {};
Meteor.isClient && Template.registerHelper("Collections", Collections);

Spreadsheets = Collections.Spreadsheets = new Mongo.Collection('Spreadsheets');
//Spreadsheets.attachSchema(Schemas.Spreadsheet);
