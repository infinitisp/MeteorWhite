Router.route('/', function () {
  this.render('home', {
    data: Tasks.find()
  });
});

// simple-todos.js
Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
    // At the top of our client code
  Meteor.subscribe("tasks");


  // This code only runs on the client
  Template.home.helpers({
    chat: function () {
      return Session.get("chat");
    }
  });

  // Inside the if (Meteor.isClient) block, right after Template.home.helpers:
  Template.home.events({
    // Add to Template.home.events
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    },
    "submit .new-task": function (event) {
      // This function is called when the new task form is submitted

      var text = event.target.text.value;

      Meteor.call("addTask", text);

      // Clear form
      event.target.text.value = "";

      // Prevent default form submit
      return false;
    }
  });

  // In the client code, below everything else
  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    }
  });

  // At the bottom of the client code
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

}

// At the bottom of simple-todos.js
if (Meteor.isServer) {
  Meteor.publish("tasks", function () {
    return Tasks.find();
  });
}

// At the bottom of simple-todos.js, outside of the client-only block
Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    //if (! Meteor.userId()) {
    //  throw new Meteor.Error("not-authorized");
    //}
    var x = Tasks.insert({
      text: text,
      createdAt: new Date()
    });
    console.log(x);
  },
  deleteTask: function (taskId) {
    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    Tasks.update(taskId, { $set: { checked: setChecked} });
  }
});
