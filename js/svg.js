function setPathContainer() {
  if(typeof DebugPath !== "undefined") {
    DebugPath.addEvents(PathCtr.pathContainer);
  }
}

SVGLoader.load([
  ["./resource/base/original_base_", 1, "base"],
  ["./resource/base_bone/original_bone_", 260, "walk"],
  ["./resource/face/original_face_", 50, "face"],
//  ["./resource/base_single/original_single_", 1120, "base"],
], setPathContainer);

window.addEventListener("load", function() {
  PathCtr.init();
});
