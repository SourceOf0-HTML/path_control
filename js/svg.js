
function setPathContainer(data) {
  PathCtr.pathContainer = data;
  PathCtr.pathContainer.context = PathCtr.subContext;
  PathCtr.pathContainer.setSize(PathCtr.viewWidth, PathCtr.viewHeight);
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
