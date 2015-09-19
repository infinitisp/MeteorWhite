//Only single layer available for prototype
MLayers = new Meteor.Collection("layer");
MBoards = new Meteor.Collection("board");
Admin = new Meteor.Collection("admin");

Router.route('/', function() {
  var that = this;
  MBoards.insert({
    user: Meteor.userId()
  }, function(e, id) {
    that.redirect('/board/' + id);
  });
});

Router.route('/board/:_id', function() {
  var id = this.params._id;
  this.render('FreeBoard', {
    data: {
      boardId: id
    }
  });
});

var cool;


//Code to run on client
if (Meteor.isClient) {
  var user;
  Meteor.startup(function() {
    Tracker.autorun(function(comp) {
      if (Admin.findOne()) {
        var admin = Admin.findOne();
        user = admin.userCount;
        Admin.update(admin._id, {
          $set: {
            userCount: ++user
          }
        });
        comp.stop();
      }
    })
  });

  //install paper into window since using Javascript directly instead of Paperscript
  paper.install(window);

  Template.FreeBoard.rendered = function() {

    this.loading = true;

    var boardId = this.data.boardId;

    //Get reference to canvas object
    var canvas = document.getElementById('myCanvas');
    //Create empty project & view for the canvas
    paper.setup(canvas);

    //flag for transforming
    var transforming = 0;

    //set lastUpdated to zero time
    //var lastUpdated = new Date(86400000);

    /** WORK IN PROGRESS / NOT WORKING: MULTITOUCH
        var hammertime = Hammer(canvas).on('transform release', function(event) {
            var scrolledX;
            var scrolledY;
            switch (event.type) {

                case 'transform':

                    if (transforming == 0) {
                        transforming = 1;
                        scrolledX = 0;
                        scrolledY = 0;
                    }
                    var deltaX = event.gesture.deltaX - scrolledX;
                    var deltaY = event.gesture.deltaY - scrolledY;
                    project.view.scrollBy({x: deltaX, y: deltaY});
                    scrolledX = scrolledX + deltaX;
                    scrolledY = scrolledY + deltaY;
                    break;

                case 'release':
                    if (transforming == 1) {
                        transforming = 0;
                    }
                    break;
            }
        });
      **/

    //DRAWING Code starts

    //Setup default tool and temporary path variable
    var tool = new Tool();
    var toolColor = "#0000AA";
    tool.maxDistance = 45;
    var path;
    var pathId;

    tool.onMouseDown = function(event) {
      path = new Path();
      path.fillColor = pusher.color(toolColor).hue('+=' + (Math.random() * 20)).hex6();
      path.add(event.point);
      var x = path.exportJSON();

      //add database entry
      pathId = MLayers.insert({
        JSON: x,
        //modified: new Date(),
        usersUpToDate: [user],
        update: 0,
        pid: path._id,
        deleted: false,
        boardId: boardId,
        left: path.bounds.left,
        right: path.bounds.right,
        top: path.bounds.top,
        bottom: path.bounds.bottom
      });
    }

    tool.onMouseDrag = function(event) {
      if (transforming == 0) {

        //this code makes the thickness of the curve depend on drag speed
        var step = event.delta;
        step.length = (70 - Math.abs(22.5 - step.length)) / 30;
        step.angle += 90;

        var top = event.middlePoint.add(step);
        var bottom = event.middlePoint.subtract(step);
        path.add(top);
        path.insert(0, bottom);
        path.smooth();
        var x = path.exportJSON();

        //update database entry for realtime collaborative drawing
        MLayers.update(pathId, {
          $set: {
            JSON: x,
            usersUpToDate: [user],
            //modified: new Date(),
            deleted: false,
          }
        });
      }
    }

    tool.onMouseUp = function(event) {
      path.add(event.point);
      path.closed = true;
      path.reduce();
      path.simplify();
      var x = path.exportJSON()

      //update the bounds this time too
      MLayers.update(pathId, {
        $set: {
          JSON: x,
          //modified: new Date(),
          usersUpToDate: [user],
          deleted: false,
          left: path.bounds.left,
          right: path.bounds.right,
          top: path.bounds.top,
          bottom: path.bounds.bottom
        }
      });
    }

    //various keys, including delete
    tool.onKeyDown = function(event) {
        switch (event.key) {
          case 'e':
            mID = MLayers.findOne({
              deleted: false,
              boardId: boardId
            }, {
              sort: {
                modified: -1
              }
            })._id;
            MLayers.update(mID, {
              $set: {
                deleted: true,
                //modified: new Date(),
                usersUpToDate: []
              }
            });
            break;
          case 'r':
            mID = MLayers.findOne({
              deleted: true,
              boardId: boardId
            }, {
              sort: {
                modified: -1
              }
            })._id;
            MLayers.update(mID, {
              $set: {
                deleted: false,
                //modified: new Date(),
                usersUpToDate: []
              }
            });
            break;
          case 'w':
            project.view.scrollBy(new Point(0, 25));
            break;
          case 's':
            project.view.scrollBy(new Point(0, -25));
            break;
          case 'a':
            project.view.scrollBy(new Point(25, 0));
            break;
          case 'd':
            project.view.scrollBy(new Point(-25, 0));
            break;
          default:
            break;
        }
      }
      //DRAWING Code ends

    //METEOR Autorun / Sync Function
    Tracker.autorun(function() {
      if (MBoards.findOne(boardId)) {
        var nodes = MLayers.find({
          boardId: boardId,
          usersUpToDate: {
            $not: user
          },
          //modified: {$gt: lastUpdated}
        });
        console.log("FOUND NODES: " + nodes.count());
        var counter = 0;

        //variable used to set lastModified as the earliest modified of all returned nodes:
        //var earliest = new Date();
        //for each node, if it overlaps the current view, add it
        nodes.forEach(function(node) {
          console.log("Counter" + counter++);
          /*if (
              (
                (project.view.bounds.left < node.left && project.view.bounds.right > node.left)
                ||
                (project.view.bounds.left < node.right && project.view.bounds.right > node.right)
              )
              &&
              (
                (project.view.bounds.top < node.top && project.view.bounds.bottom > node.top)
                ||
                (project.view.bounds.top < node.bottom && project.view.bounds.bottom > node.bottom)
              )
            ) {
            */

          //earliest = earliest < node.modified ? earliest : node.modified;

          var i = node.pid;
          if (node.deleted) { //removes node
            _.each(project.activeLayer.children, function(c) {
              if (c._id === i) {
                c.remove();
              }
            });
            console.log("Node Removed " + i);
          } else { //imports node
            var replaced = false;
            _.each(project.activeLayer.children, function(c) {
              if (c._id === i) {
                c.importJSON(node.JSON);
                c._id = i;
                replaced = true;
              }
              console.log("Replaced node " + i);
            });

            if (!replaced) {
              var newNode = new Path();
              newNode.importJSON(node.JSON);
              newNode._id = i;
              console.log("added node: " + i);
            }
          }
          MLayers.update(node._id, {
              $push: {
                usersUpToDate: user
              }
            },
            function() {
              console.log("up to date!");
            });
        });
        //lastUpdated = earliest;
        project.view.draw();
      }
    });
    //METEOR Autorun ends

    //COLORMENU Code starts
    var notOnButton = true;
    var openColor = false;

    $(document).mousedown(function(e) {
      if (openColor && notOnButton) {
        closeColorMenu();
        openColor = !openColor;
      }
    }).mouseup(function(e) {});

    var colorButton = document.getElementById('colorButton');
    var colorWrapper = document.getElementById('colorMenu');

    colorButton.addEventListener('click', colorHandler, false);
    colorButton.addEventListener('mouseout', function() {
      notOnButton = true;
    }, false);
    colorButton.addEventListener('mouseover', function() {
      notOnButton = false;
    }, false);

    function colorHandler() {
      if (!openColor) {
        classie.add(colorWrapper, 'opened-color');
      } else {
        classie.remove(colorWrapper, 'opened-color');
      }
      openColor = !openColor;
    }

    function closeColorMenu() {
      classie.remove(colorWrapper, 'opened-color');
    }

    //Setup color menu selection
    document.getElementById('red').addEventListener('mousedown', function() {
      toolColor = "#AA0000";
      $("#colorButton").css("background-color", "#AA0000")
    }, false);
    document.getElementById('blue').addEventListener('mousedown', function() {
      toolColor = "#0000AA";
      $("#colorButton").css("background-color", "#0000AA")
    }, false);
    document.getElementById('green').addEventListener('mousedown', function() {
      toolColor = "#00AA00";
      $("#colorButton").css("background-color", "#00AA00")
    }, false);
    document.getElementById('black').addEventListener('mousedown', function() {
      toolColor = "#111111";
      $("#colorButton").css("background-color", "#111111")
    }, false);
    //COLORMENU Code ends
  }

}

if (Meteor.isServer) {
  Meteor.startup(function() {
    if (!(Admin.findOne())) {
      Admin.insert({
        userCount: 1
      });
    }
  });
}
