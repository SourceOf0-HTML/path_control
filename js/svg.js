/*
PathMain.init(null, ()=> {
  SVGLoader.load("walk", 0, [
    [SVGLoader.FILE_KIND_BASE, 1120, "base", "./resource/base_single/original_single_"],
  //  [SVGLoader.FILE_KIND_BASE, 260, "base", "./resource/walk/walk_"],
  ], null, null);
});
/**/

PathMain.init(null, ()=> {
  SVGLoader.load("walk", 0, "./resource/filelist.csv", ["./resource/bones.json"], null);
});
/**/
