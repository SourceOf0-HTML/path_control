function loadComplete() {
}
function initComplete() {
  PathMain.load("./resource/path_data.bin", 0, loadComplete, true);
}
PathMain.init("./js/walk.js", initComplete);
