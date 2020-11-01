function loadComplete() {
  document.getElementById("output-btn").disabled = "";
}

function svgLoadComplete() {
  PathMain.loadBone("./resource/bones.json", loadComplete);
}

function loadWalk() {
  SVGLoader.load("walk", 0, [
    [SVGLoader.FILE_KIND_BASE,   1, "base", "./resource/walk_base/walk_base_"],
    [SVGLoader.FILE_KIND_BONE, 260, "walk", "./resource/walk/walk_"],
    [SVGLoader.FILE_KIND_SMRT,  50, "顔", "./resource/walk_顔/walk_顔_"],
    [SVGLoader.FILE_KIND_SMRT, 100, "目", "./resource/walk_目/walk_目_"],
    [SVGLoader.FILE_KIND_SMRT, 100, "瞼", "./resource/walk_瞼/walk_瞼_"],
    [SVGLoader.FILE_KIND_SMRT, 100, "左腕", "./resource/walk_左腕/walk_左腕_"],
    [SVGLoader.FILE_KIND_SMRT, 100, "服", "./resource/walk_服/walk_服_"],
    [SVGLoader.FILE_KIND_SMRT, 200, "右足", "./resource/walk_右足/walk_右足_"],
    [SVGLoader.FILE_KIND_SMRT, 200, "左足", "./resource/walk_左足/walk_左足_"],
  ], svgLoadComplete, true);
}

PathMain.init("./js/walk.js", loadWalk);

function output_data() {
  PathMain.outputBin();
}
