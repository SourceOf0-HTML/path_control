var pathContainer = null;
var frameTime = 1 / 30;
var totalFrames = 1120;
var frameNumber = 0;
var canvas = null;

var request = new XMLHttpRequest();
request.addEventListener("load", function(event) {
  if(request.readyState != 4) return;
  if(request.status != 200 && request.status != 0) return;
  
  let buffer = request.response;
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
  
  let context = canvas.getContext("2d");
  if(!context) return;
  
  let requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame ||
                              window.msRequestAnimationFrame;
  let cancelAnimationFrame = window.cancelAnimationFrame ||
                              window.mozCancelAnimationFrame;
  
  let viewWidth = document.documentElement.clientWidth;
  let viewHeight = document.documentElement.clientHeight;
  
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
  
  let prevTimestamp = 0;
  (function draw(timestamp) {
    if(!canvas.parentNode) {
      return cancelAnimationFrame(draw);
    }
    
    let elapsed = (timestamp - prevTimestamp) / 1000;
    //console.log(elapsed, frameTime);
    
    if(!pathContainer || elapsed <= frameTime) {
      requestAnimationFrame(draw);
      return;
    }
    prevTimestamp = timestamp;
    
    requestAnimationFrame(draw);
    
    pathContainer.context = context;
    context.clearRect(0, 0, viewWidth, viewHeight);
    pathContainer.setFitSize(viewWidth, viewHeight);
    pathContainer.draw(frameNumber);
    frameNumber = (frameNumber + 1) % totalFrames;
  })();
});

