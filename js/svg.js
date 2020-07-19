function setPathContainer() {
  if(typeof DebugPath !== "undefined") {
    DebugPath.addEvents(PathCtr.pathContainer);
  }
}

SVGLoader.load([
  [SVGLoader.FILE_KIND_BASE, 1  , "base", "./resource/base/base_"],
  [SVGLoader.FILE_KIND_SMRT, 260, "walk", "./resource/walk_original/walk_original_"],
  [SVGLoader.FILE_KIND_SMRT,  50,  "face", "./resource/face/face_"],
//  [SVGLoader.FILE_KIND_BASE, 300, "base", "./resource/base_single/original_single_"],
], setPathContainer);

window.addEventListener("load", function() {
  PathCtr.init();
});
