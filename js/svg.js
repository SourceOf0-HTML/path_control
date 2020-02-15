var pathContainer = null;
var frameTime = 1000 / 40;
var totalFrames = 50;
var frameNumber = 0;
var viewWidth = 0;
var viewHeight = 0;

function setPathContainer(data) {
  pathContainer = data;
  pathContainer.setSize(viewWidth, viewHeight);
}
PathFactory.svgFilesLoad([
//  ["./img/base/original_", 260, "base"],
  ["./img/base_bone/original_bone_", 260, "base"],
  ["./img/face/original_face_", 50, "face"],
//  ["./img/base_single/original_single_", 1120, "base"],
], setPathContainer);

window.addEventListener("load", function() {
  let canvas = document.getElementById("main-canvas");
  
  if(!canvas.parentNode) return;
  
  let context = canvas.getContext("2d");
  if(!context) return;
  
  let requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame ||
                              window.msRequestAnimationFrame;
  let cancelAnimationFrame = window.cancelAnimationFrame ||
                              window.mozCancelAnimationFrame;
  
  viewWidth = document.documentElement.clientWidth;
  viewHeight = document.documentElement.clientHeight;
  canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
  canvas.width = viewWidth;
  canvas.height = viewHeight;
  
  window.addEventListener("resize", function() {
    canvas.width = viewWidth = document.documentElement.clientWidth;
    canvas.height = viewHeight = document.documentElement.clientHeight;
    canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
    if(!!pathContainer) pathContainer.setSize(viewWidth, viewHeight);
  });
  
  let prevTimestamp = 0;
  (function draw(timestamp) {
    let elapsed = (timestamp - prevTimestamp) / 1000;
    prevTimestamp = timestamp;
    //console.log(elapsed, frameTime / 1000);
    
    if(!canvas.parentNode) {
      return cancelAnimationFrame(draw);
    }
    
    setTimeout(function() {
      requestAnimationFrame(draw);
      if(!pathContainer) return;
      
      context.clearRect(0, 0, viewWidth, viewHeight);
      pathContainer.context = context;
      pathContainer.draw(frameNumber, "face");
      frameNumber = (frameNumber + 1) % totalFrames;
      
    }, frameTime);
  })();
});

