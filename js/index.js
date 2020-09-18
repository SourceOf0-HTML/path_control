function loadComplete() {
  PathMain.load("./resource/path_data.bin", null, true);
}
PathMain.init("./js/walk.js");
PathMain.load("./resource/path_data_.bin", loadComplete, true);
