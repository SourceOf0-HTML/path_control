/*
PathMain.init(null, ()=> {
  SVGLoader.load("walk", 0, [
    [SVGLoader.FILE_KIND_BASE, 1120, "base", "./resource/base_single/original_single_"],
  //  [SVGLoader.FILE_KIND_BASE, 260, "base", "./resource/walk/walk_"],
  ], null, null);
});
/**/

PathMain.init(null, ()=> {
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
  ], ["./resource/bones.json"], null);
});
/**/
