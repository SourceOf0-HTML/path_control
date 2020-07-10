function setPathContainer() {
  if(typeof DebugPath !== "undefined") {
    DebugPath.addEvents(PathCtr.pathContainer);
  }
}

SVGLoader.load([
  ["./resource/base/base_", 1, "base"],
  ["./resource/walk_original/walk_original_", 260, "walk"],
  ["./resource/face/face_", 50, "face"],
//  ["./resource/base_single/original_single_", 1120, "base"],
], setPathContainer);

window.addEventListener("load", function() {
  PathCtr.init();
});
