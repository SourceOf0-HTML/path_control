function setPathContainer() {
  BoneLoader.load("./resource/bones.json", PathCtr.pathContainer);
  
  if(typeof DebugPath !== "undefined") {
    DebugPath.addEvents(PathCtr.pathContainer);
  }
}

BinaryLoader.load("./src/path_data.bin", setPathContainer);

window.addEventListener("load", function() {
  PathCtr.init();
});
