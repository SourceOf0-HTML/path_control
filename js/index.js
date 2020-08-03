function loadComplete() {
  PathMain.loadBone("../resource/bones.json");
}
console.log(PathMain);
PathMain.init("../resource/path_data.bin", loadComplete, true);
