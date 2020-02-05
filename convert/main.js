const $element = $(".svg");
const imagePath = "./destination";
const totalFrames = 1120;
var timeWhenLastUpdate;
var timeFromLastUpdate;
var frameNumber = 1;

function getFramePath(i) {
  return imagePath + "/trkgt_20200113c_" + "00000".substr(0, 5 - i.toString().length) + i + ".svg";
}

$(window).on("load", function() {
  let prevTimestamp = 0;
  (function draw(timestamp) {
    let elapsed = (timestamp - prevTimestamp) / 1000;
    let frameTime = 1/30;
    if(elapsed <= frameTime) {
      requestAnimationFrame(draw);
      return;
    }
    prevTimestamp = timestamp;
    
    $element.attr("src", getFramePath(frameNumber));
    timeWhenLastUpdate = timestamp;
    
    if (frameNumber >= totalFrames) {
      frameNumber = 1;
    } else {
      frameNumber = frameNumber + 1;
    }
    
    requestAnimationFrame(draw);
  })();
});

