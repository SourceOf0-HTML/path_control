function loadComplete() {
  document.getElementById("output-btn").disabled = "";
  PathMain.postMessage({
    cmd: "set-group-control",
    name: "bone4_head",
    initFuncStr: `
      this.initIK();
    `,
    controlFuncStr: `
      if(!pathContainer.mouseX && !pathContainer.mouseY) {
        this.posIK.enable = false;
        return;
      }
      this.posIK.enable = true;
      this.posIK.x = pathContainer.mouseX;
      this.posIK.y = pathContainer.mouseY;
    `,
  });
}

function svgLoadComplete() {
  PathMain.loadBone("../resource/bones.json", loadComplete);
}

SVGLoader.init([
//  [SVGLoader.FILE_KIND_BASE, 1120, "base", "../resource/base_single/original_single_"],
//  [SVGLoader.FILE_KIND_BASE, 300, "base", "../resource/base_single/original_single_"],
  [SVGLoader.FILE_KIND_BASE,   1, "base", "../resource/base/base_"],
//  [SVGLoader.FILE_KIND_BONE, 260, "walk", "../resource/walk/walk_"],
//  [SVGLoader.FILE_KIND_SMRT, 260, "walk", "../resource/walk_original/walk_original_"],
  [SVGLoader.FILE_KIND_BONE, 260, "walk", "../resource/walk_original/walk_original_"],
  [SVGLoader.FILE_KIND_SMRT,  50, "face", "../resource/face/face_"],
  [SVGLoader.FILE_KIND_SMRT, 100, "pupils", "../resource/pupils/pupils_"],
  [SVGLoader.FILE_KIND_SMRT, 100, "eyelids", "../resource/eyelids/eyelids_"],
  [SVGLoader.FILE_KIND_SMRT, 100, "left_arm", "../resource/left_arm/left_arm_"],
  [SVGLoader.FILE_KIND_SMRT, 100, "jacket", "../resource/jacket/jacket_"],
  [SVGLoader.FILE_KIND_SMRT, 200, "right_leg", "../resource/right_leg/right_leg_"],
  [SVGLoader.FILE_KIND_SMRT, 200, "left_leg", "../resource/left_leg/left_leg_"],
], svgLoadComplete, true);


function output_data() {
  PathMain.outputBin();
}
