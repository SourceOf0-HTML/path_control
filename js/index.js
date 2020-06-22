function setPathContainer(data) {
  PathCtr.pathContainer = data;
  PathCtr.pathContainer.context = PathCtr.subContext;
  PathCtr.pathContainer.setSize(PathCtr.viewWidth, PathCtr.viewHeight);
  PathCtr.pathContainer.x = 0.3;
}

PathFactory.binFileLoad("./src/path_data.bin", setPathContainer);

window.addEventListener("load", function() {
  PathCtr.init();
});
