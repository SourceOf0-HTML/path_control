function loadComplete() {
  document.getElementById("output-btn").disabled = "";
}

//PathMain.setLoadPrint(true);
PathMain.init("./js/walk.js", ()=> {
  SVGLoader.load("walk", 0, "./resource/filelist.csv", ["./resource/bones.json", "./resource/bones_custom.json"], loadComplete);
});

function output_data() {
  PathMain.outputBin();
}
