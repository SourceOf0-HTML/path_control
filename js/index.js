function loadComplete() {
  PathMain.load("./resource/path_data.bin", null, null, true);
}
PathMain.init();
PathMain.load("./resource/path_data_.bin", loadComplete, "./js/walk.js", true);
