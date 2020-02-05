var pathContainer = null;
var frameTime = 1 / 30;
var totalFrames = 1120;
var frameNumber = 0;
var canvas = null;

var request = new XMLHttpRequest();
request.addEventListener("load", function(event) {
  if(request.readyState != 4) return;
  if(request.status != 200 && request.status != 0) return;
  
  var buffer = request.response;
  pathContainer = PathCtr.initFromBin(buffer);
  console.log("loading completed");
  //console.log(pathContainer);
});
request.open("GET", "./src/path_data.bin", true);
request.responseType = "arraybuffer";
request.send();

window.addEventListener("load", function() {
  canvas = document.getElementById("main-canvas");
  
  if(!canvas.parentNode) return;
  
  var context = canvas.getContext("2d");
  if(!context) return;
  
  var requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame ||
                              window.msRequestAnimationFrame;
  var cancelAnimationFrame = window.cancelAnimationFrame ||
                              window.mozCancelAnimationFrame;
  
  var viewWidth = document.documentElement.clientWidth;
  var viewHeight = document.documentElement.clientHeight;
  
  canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
  canvas.width = viewWidth;
  canvas.height = viewHeight;
  
  window.addEventListener("resize", function() {
    viewWidth = document.documentElement.clientWidth;
    viewHeight = document.documentElement.clientHeight;
    canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
    canvas.width = viewWidth;
    canvas.height = viewHeight;
  });
  
  var prevTimestamp = 0;
  (function draw(timestamp) {
    if(!canvas.parentNode) {
      return cancelAnimationFrame(draw);
    }
    
    var elapsed = (timestamp - prevTimestamp) / 1000;
    //console.log(elapsed, frameTime);
    
    if(!pathContainer || elapsed <= frameTime) {
      requestAnimationFrame(draw);
      return;
    }
    prevTimestamp = timestamp;
    
    pathContainer.context = context;
    context.clearRect(0, 0, viewWidth, viewHeight);
    pathContainer.setFitSize(viewWidth, viewHeight);
    pathContainer.draw(frameNumber);
    frameNumber = (frameNumber + 1) % totalFrames;
    
    requestAnimationFrame(draw);
  })();
});

