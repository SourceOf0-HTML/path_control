var charaData = null;

window.addEventListener("load", function() {
  let svgDataDom = document.getElementById("csvdata");
  let dom = svgDataDom.contentDocument.documentElement;
  
  if(!!dom) {
    charaData = PathCtr.initFromSvg(dom.querySelector("g"));
    document.getElementById("output-btn").disabled = "";
  }
});

function output_data() {
  if(!charaData) return;
  
  let buffer = PathCtr.dataTobin(charaData);
  
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  console.log(a);
  
  var blob = new Blob([buffer], {type: "octet/stream"}),
  url = window.URL.createObjectURL(blob);
  
  a.href = url;
  a.download = "path_data.bin";
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
