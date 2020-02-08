var pathContainer = null;
var frameTime = 1000 / 40;
var totalFrames = 260;
var frameNumber = 0;
var context = null;

function setPathContainer(data) {
  pathContainer = data;
  pathContainer.context = context;
  document.getElementById("output-btn").disabled = "";
}
PathCtr.svgFilesLoad([
  ["./img/base/original_", 260, "base"],
  ["./img/face/original_face_", 50, "face"],
//  ["./img/base_single/original_single_", 1120, "base"],
], setPathContainer);


window.addEventListener("load", function() {
  let canvas = document.getElementById("main-canvas");
  
  if(!canvas.parentNode) return;
  
  context = canvas.getContext("2d");
  if(!context) return;
  
  let requestAnimationFrame = window.requestAnimationFrame ||
                              window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame ||
                              window.msRequestAnimationFrame;
  let cancelAnimationFrame = window.cancelAnimationFrame ||
                              window.mozCancelAnimationFrame;
  let width = 1280;
  let height = 720;
  canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + width + "px;height:" + height + "px;");
  canvas.width = width;
  canvas.height = height;
  
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
      
      context.clearRect(0, 0, width, height);
      pathContainer.draw(frameNumber);
      frameNumber = (frameNumber + 1) % totalFrames;
      
    }, frameTime);
  })();
});

function output_data() {
  if(!pathContainer) return;
  
  let buffer = PathCtr.dataTobin(pathContainer);
  
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  console.log(a);
  
  var blob = new Blob([buffer], {type: "octet/stream"}),
  url = window.URL.createObjectURL(blob);
  
  a.href = url;
  a.download = "path_data.bin";
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
