function loadComplete() {
  //PathMain.loadBone("../resource/bones.json");
  PathMain.postMessage({
    cmd: "change-action", 
    name: "walk",
  });
}
PathMain.init("../resource/path_data.bin", loadComplete, true);
