# MeteorWhite
A real time whiteboard using Meteor and Paper.js

This was my final project for CS50. I never got around to make it perform well, and may have broken the actual performance in an attempt to perform well. I was married to vectorized drawings to get the effect I wanted, and unfortunately the library (paper.js) did not scale very well for this purpose. Because the drawn vectors would stay in memory as vector objects (as opposed to being rasterized) they would quickly get too big and the entire application would start lagging. I didn't care enough to figure out a good solution, and it wasn't performant enough to touch up. On the bright side, I have not seen a single such whiteboard application that uses vectorized lines and does not lag.
