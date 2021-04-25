//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

// const PropertiesReader = require("properties-reader");

// // Setup sensitive information
// let properties = PropertiesReader("site.properties");

// let dbName = properties.get("db.name");
// let dbUser = properties.get("db.user.name");
// let dbPassword = properties.get("db.password");


let info = {
  dbUser: process.env.userName,
  dbPassword: process.env.userPassword,
  dbName: process.env.dbName
}

// Create express application
const app = express();

// Setup view engine for templating
app.set('view engine', 'ejs');

// Initialize body-parser
app.use(bodyParser.urlencoded({extended: true}));

// Setup use for static css files
app.use(express.static("public"));

// Setup database connection
mongoose.connect("mongodb+srv://" + info.dbUser + ":" + info.dbPassword + "@cluster0.o9x0h.mongodb.net/" + info.dbName + "?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

// Setup mongoose schema
const itemsSchema = {
  name: String
}

// Setup mongoose model
const Item = mongoose.model("Item", itemsSchema);

// Create default documents
const item1 = new Item ({
  name: "Welcome to your to do list."
});

const item2 = new Item ({
  name: "Hit the + button to add a new item."
});

const item3 = new Item ({
  name: "<-- Hit this to delete an item."
});

// Array
const defaultItems = [item1, item2, item3];

// New dynamic list schema
const listSchema = {
  name: String,
  items:[itemsSchema] // Items of items document
};

const List = mongoose.model("List", listSchema);

let homeInitialItems = false;


// Get root route for home page
app.get("/", function(req, res) {

  // Find database entries
  Item.find({}, function (err, items) {

    if (items.length === 0 && !homeInitialItems) {
      // Insert default items
      Item.insertMany(defaultItems, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully inserted multiple items");
        }
      });
      homeInitialItems = true;
      // Redirect to home route after adding default items
      res.redirect("/");
    } else {
      res.render("list", {listTitle: "Today", newListItems: items});
    }
  });

});

// Create dynamic route using express route parameters
app.get("/:customListName", function(req,res){
  // Get name of dynamic url 
  const customList = _.capitalize(req.params.customListName);

  // Check to see if these dynamic lists have already been created
  List.findOne({name: customList}, function (err, foundList) {
    // if so, make a new one
    if (!err) {
      if (!foundList) {
        // Create documents for dynamic lists
        const list = new List({
          name: customList,
          items: defaultItems
        });

        list.save();
        res.redirect("/" + customList);
      } else {
        // Show list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });

});

// Post route for data from browser
app.post("/", function(req, res){

  const itemName = req.body.newItem.toString().trim();
  const listName = req.body.list;

  const item = new Item ({
    name: itemName
  });

  // Check for home route or custom route
  if (listName === "Today") {
    item.save();
    res.redirect("/");
  } else {
    // Find which list was accessed and add to it
    List.findOne({name: listName}, function (err, foundList) {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }

});

// Delete route
app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkBox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully removed item " + checkedItemId);
        res.redirect("/");
      }
    });

  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundItem) {
      if (!err) {
        res.redirect("/" + listName);
      }
    });

  }
  
});

// Start listening for prot on heroku or local

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server has started successfully");
});
