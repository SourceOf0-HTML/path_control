
addEventListener("message", function(e) {
  let load = fileInfoList => {
    let fileIndex = 0;
    let domList = [];
    let getFrameNum=i=>("00000".substr(0, 5 - i.toString().length) + i + ".svg");
    
    let loadFile=fileInfo=> {
      let kind = fileInfo[0];
      let totalFrames = fileInfo[1];
      let actionName = fileInfo[2];
      let filePath = fileInfo[3];
      
      let loadFrame = 1;
      let request = new XMLHttpRequest();
      let loadSVG = request.onload = function(e) {
        let target = e.target;
        if(target.readyState != 4) return;
        if(target.status != 200 && target.status != 0) return;
        
        postMessage({
          cmd: "new-svg",
          actionName: actionName,
          frame: loadFrame,
          svg: target.responseText,
        });
        
        delete request;
        if(loadFrame <= totalFrames) {
          request = new XMLHttpRequest();
          request.open("GET", filePath + getFrameNum(loadFrame++), true);
          request.onreadystatechange = loadSVG;
          request.send();
          return;
        }
        
        if(++fileIndex < fileInfoList.length) {
          loadFile(fileInfoList[fileIndex]);
          postMessage({
            cmd: "load-add",
            kind: kind,
            actionName: actionName,
            totalFrames: totalFrames,
          });
        } else {
          postMessage({
            cmd: "load-complete",
            kind: kind,
            actionName: actionName,
            totalFrames: totalFrames,
          });
          close();
        }
      };
      request.open("GET", filePath + getFrameNum(loadFrame++), true);
      request.send();
    };
    
    loadFile(fileInfoList[fileIndex]);
  };
  
  let data = e.data;
  switch (data.cmd) {
    case "load":
      load(data.fileInfoList);
      break;
      
    default:
      console.error("unknown command: " + data.cmd);
      break;
  };
}, false);
