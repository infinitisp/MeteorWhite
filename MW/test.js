Test = new Meteor.Collection("test");

Router.route('/test', function () {
  this.render('test');
});

if (Meteor.isClient) {
  var x = "hello";
  console.log(x);
}
