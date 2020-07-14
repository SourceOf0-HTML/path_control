function setPathContainer() {
  BoneLoader.load("./resource/bones.json", PathCtr.pathContainer);
  
  document.getElementById("output-btn").disabled = "";
  
  if(typeof DebugPath !== "undefined") {
    DebugPath.addEvents(PathCtr.pathContainer);
  }
}
SVGLoader.load([
  [SVGLoader.FILE_KIND_BASE, 1,   "base", "./resource/base/base_"],
  [SVGLoader.FILE_KIND_BONE, 260, "walk", "./resource/walk/walk_"],
  [SVGLoader.FILE_KIND_SMRT,  50,  "face", "./resource/face/face_"],
//  [SVGLoader.FILE_KIND_BASE, 1120, "base", "./resource/base_single/original_single_"],
], setPathContainer);


window.addEventListener("load", function() {
  PathCtr.init();
});

function output_data() {
  if(!PathCtr.pathContainer) return;
  
  let buffer = SVGLoader.toBin(PathCtr.pathContainer);
  
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
