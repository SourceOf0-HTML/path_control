
set OUTPUT_FILE=path_control.js

del %OUTPUT_FILE%

type org\PathCtr.js >> %OUTPUT_FILE%
type org\Matrix.js >> %OUTPUT_FILE%
type org\Sprite.js >> %OUTPUT_FILE%
type org\PathObj.js >> %OUTPUT_FILE%
type org\GroupObj.js >> %OUTPUT_FILE%
type org\BoneObj.js >> %OUTPUT_FILE%
type org\PathContainer.js >> %OUTPUT_FILE%
type org\PathFactory.js >> %OUTPUT_FILE%

