var pathContainer = null;
var frameTime = 1000 / 24;
var totalFrames = 260;
var frameNumber = 0;
var context = null;
var viewWidth = 0;
var viewHeight = 0;

function setPathContainer(data) {
  PathCtr.pathContainer = data;
  PathCtr.pathContainer.context = PathCtr.subContext;
  PathCtr.pathContainer.setSize(PathCtr.viewWidth, PathCtr.viewHeight);
  
  document.getElementById("output-btn").disabled = "";
  
  if(typeof DebugPath !== "undefined") {
    DebugPath.addEvents(PathCtr.pathContainer);
  }
}
PathFactory.svgFilesLoad([
//  ["./resource/base/original_", 260, "base"],
  ["./resource/base_bone/original_bone_", 260, "base"],
  ["./resource/face/original_face_", 50, "face"],
//  ["./resource/base_single/original_single_", 1120, "base"],
], setPathContainer);


window.addEventListener("load", function() {
  PathCtr.init();
});

function output_data() {
  if(!PathCtr.pathContainer) return;
  
  let buffer = PathFactory.dataTobin(PathCtr.pathContainer);
  
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
