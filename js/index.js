function loadComplete() {
  PathMain.postMessage({
    cmd: "change-action", 
    name: "walk",
  });
  /*
  PathMain.postMessage({
    cmd: "set-group-control",
    name: "bone11_hair",
    prop: {mRotation: 0},
    func: "this.mRotation += 0.01; this.rotation = this.mRotation;"
  });
  */
}

PathMain.init("../resource/path_data.bin", loadComplete, true);
