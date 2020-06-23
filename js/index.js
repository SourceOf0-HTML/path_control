function setPathContainer() {
  PathCtr.pathContainer.x = 0.3;
  
  if(typeof DebugPath !== "undefined") {
    DebugPath.addEvents(PathCtr.pathContainer);
  }
}

BinaryLoader.load("./src/path_data.bin", setPathContainer);

window.addEventListener("load", function() {
  PathCtr.init();
});
