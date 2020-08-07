function loadComplete() {
  //PathMain.loadBone("../resource/bones.json");
  PathMain.postMessage({
    cmd: "set-group-control",
    name: "bone11_hair",
    prop: {mRotation: 0},
    func: "this.mRotation += 0.1; this.rotation = this.mRotation;"
  });
}
PathMain.init("../resource/path_data.bin", loadComplete, true);
