angular.module('docs').controller('ImageEditor',
function ($scope, $stateParams, $timeout, $compile) {
  console.log('✓ Cropper', window.Cropper);
  console.log('[ImageEditor] registered to module docs');

  $scope.log = console.log;

  $scope.fileId   = $stateParams.fileId;
  $scope.fileName = $stateParams.fileName || 'edited.png';

  $scope.cropperReady = false;

  let currentDeg = 0;
  let cropper   = null;
  let inited    = false;
  let sharpenOn = false;
  let drawMode  = false;
  let rotationPending = false;  // 表示“旋转后未确认”
  let cropMode = false;
  /* ------------ 初始化 Cropper ------------ */
  $timeout(() => {
    const img = document.getElementById('editor-img');

    function init() {
      if (inited) return;

      const overlay = document.getElementById('draw-layer');
      if (!overlay) {
        // 说明模板还没插进去，延后一个 tick 再尝试
        return $timeout(init, 0);
      }

      inited = true;

      /* 调整画布尺寸与图片一致 */
      overlay.width  = img.naturalWidth;
      overlay.height = img.naturalHeight;
      overlay.style.width  = img.offsetWidth  + 'px';
      overlay.style.height = img.offsetHeight + 'px';

      /* Cropper */
      cropper = new Cropper(img, {
        viewMode: 1,
        dragMode: 'none',       // 🚫 禁止拖动裁剪
        autoCrop: false,        // 🚫 禁用默认 crop 框
        autoCropArea: 1,
        ready() {
          console.log('[Cropper] ready (before $timeout)');
          $timeout(() => {
            fitOverlayToCanvas();
            $scope.cropperReady = true;
            console.log('[Cropper] ready (inside $timeout) $scope.cropperReady =', $scope.cropperReady);
          });
        }
      });

      /* 绑定画笔事件，默认关闭 */
      setupDrawing(overlay);
      overlay.style.pointerEvents = 'none';

      const toolbar = document.getElementById('editor-toolbar');
//      if (toolbar && toolbar.parentElement !== document.body && !toolbar.__compiled) {
//        // 让 Angular 重新编译这一段 HTML
//        const $compile = angular.element(toolbar).injector().get('$compile');
//        $compile(toolbar)($scope);    // 隔离作用域
//        toolbar.__compiled = true;
//        // document.body.appendChild(toolbar);
//      }
    }

    img.complete ? init()
                 : img.addEventListener('load', init, { once:true });
  }, 0);

  // 进入剪裁模式
  $scope.enterCropMode = () => {
    if (drawMode) return alert('请先💾保存涂鸦');
    cropMode = true;
    rotationPending = false;

    cropper.clear(); // 清除当前 crop box
    cropper.setDragMode('crop'); // 开启 crop 模式

    alert('✂️ 已进入剪裁/旋转模式，完成后请点击“保存剪裁”');
  };

  /* ------------ ① 旋转 ------------ */

  $scope.rotate = (delta) => {
    if (drawMode) return alert('请先💾保存涂鸦');
    if (!cropMode) return alert('请先进入剪裁模式！');
    if (!cropper || !cropMode) return;

    currentDeg = ((currentDeg + delta) % 360 + 360) % 360;
    cropper.rotate(delta);
    rotationPending = true;    // 🚨 标记为未确认状态

    fitOverlayToCanvas();

    const container = document.getElementById('editor-container');
    container.style.flexDirection =
        (currentDeg === 90 || currentDeg === 270) ? 'column' : 'row';

    console.log('rotate →', delta, 'deg │ 总角度 =', currentDeg);
  };

//  $scope.confirmRotation = () => {
//    if (!rotationPending || !cropper) return;
//
//    // 强制进入裁剪模式（避免出现空框）
//    cropper.crop();
//
//    // 若需要，你还可以在这里获取裁剪框数据并重新应用
//    const data = cropper.getData(true);
//    cropper.setData(data);
//
//    rotationPending = false;
//    alert('✅ 旋转已保存，现在可以继续编辑');
//  };

  $scope.confirmCrop = () => {
    if (drawMode) return alert('请先💾保存涂鸦');
    if (!cropMode || !cropper) return alert('未开启✂️剪裁模式！');

    // 强制裁剪并导出裁剪区域作为新图像
    cropper.crop();

    const canvas = cropper.getCroppedCanvas({
      fillColor: '#fff'
    });

    if (!canvas) {
      alert('❌ 裁剪失败，请检查是否选中区域');
      return;
    }

    cropper.replace(canvas.toDataURL('image/png'));
    $timeout(() => fitOverlayToCanvas(), 0);  // 等待 Cropper 渲染完成后执行

    // 退出剪裁模式
    cropMode = false;
    rotationPending = false;
    alert('✅ 剪裁完成，可以继续编辑');
  };

  function fitOverlayToCanvas() {
    if (!cropper) return;

    // 1) 可视画布尺寸
    const cd = cropper.getCanvasData();          // { left, top, width, height, ... }

    // 2) 设置 overlay 大小与位置
    const overlay = document.getElementById('draw-layer');
    overlay.width  = cd.width;
    overlay.height = cd.height;
    overlay.style.left = cd.left + 'px';
    overlay.style.top  = cd.top  + 'px';
    overlay.style.width  = cd.width + 'px';
    overlay.style.height = cd.height + 'px';

    setupDrawing(overlay);
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    strokes = [];
    currentStroke = null;
  }

  /* ------------ ② 锐化滤镜 ------------ */
  $scope.toggleSharpen = () => {

    if (cropMode) return alert('请先保存剪裁再进行操作');
    if (drawMode) return alert('请先💾保存涂鸦');

    sharpenOn = !sharpenOn;
    console.log('toggleSharpen called →', sharpenOn);

    const canvasLayer = document.querySelector('.cropper-canvas');
    if (canvasLayer) {
      canvasLayer.style.filter = sharpenOn
        ? 'contrast(1.25) saturate(1.15)'
        : '';
    }
  };

  function applySharpen(ctx, w, h) {
    // 简单卷积核锐化： 0 -1 0 / -1 5 -1 / 0 -1 0
    const imgData = ctx.getImageData(0, 0, w, h);
    const src  = imgData.data;
    const dst  = new Uint8ClampedArray(src);
    const idx  = (x, y, c) => ((y*w + x)<<2) + c;

    const kernel = [0,-1,0,-1,5,-1,0,-1,0];
    for (let y=1; y<h-1; y++)
      for (let x=1; x<w-1; x++)
        for (let c=0; c<3; c++) {
          let sum = 0, k = 0;
          for (let ky=-1; ky<=1; ky++)
            for (let kx=-1; kx<=1; kx++)
              sum += src[idx(x+kx, y+ky, c)] * kernel[k++];
          dst[idx(x,y,c)] = Math.min(255, Math.max(0, sum));
        }
    imgData.data.set(dst);
    ctx.putImageData(imgData, 0, 0);
  }

  /* ------------ ③ 画笔 ------------ */
  let strokes = [];
  let currentStroke = null;   // 当前正在绘制的一笔

  function setupDrawing(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#ff0000';
    const pixelWidth = 3;  // 设定你想要的“视觉粗细”，单位是像素

    canvas.addEventListener('mousedown', e => {
      if (!drawMode) return;
      const x = e.offsetX;
      const y = e.offsetY;
      currentStroke = [[x, y]];
    });

    canvas.addEventListener('mousemove', e => {
      if (!drawMode || !currentStroke) return;
      const x = e.offsetX;
      const y = e.offsetY;

      currentStroke.push([x, y]);
      redrawAll(ctx);                                // 实时重绘
    });

    window.addEventListener('mouseup', () => {
      if (currentStroke && drawMode) {
        strokes.push(currentStroke);                 // 收尾，入栈
        currentStroke = null;
      }
    });
  }

  // 重绘全部 stroke（含正在绘制的一笔）
  function redrawAll(ctx) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff0000';

    const overlay = ctx.canvas;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const scaleX = overlay.width  / overlay.getBoundingClientRect().width;
    const scaleY = overlay.height / overlay.getBoundingClientRect().height;

    // 保存当前状态
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0); // X缩放, Y缩放

    const drawStroke = (pts) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(...pts[i]);
      ctx.stroke();
    };

    strokes.forEach(drawStroke);
    if (currentStroke) drawStroke(currentStroke);

    // 恢复原状态，避免影响其他绘图
    ctx.restore();
  }

  /* --- 画笔开关 --- */
  $scope.toggleDraw = () => {
    if (cropMode) return alert('请先保存剪裁再进行操作');

    const overlay = document.getElementById('draw-layer');
    drawMode = !drawMode;
    overlay.style.pointerEvents = drawMode ? 'auto' : 'none';
    overlay.style.cursor        = drawMode ? 'crosshair' : 'default';
  };

  /* --- 撤销最后一笔 --- */
  $scope.undoDraw = () => {
    if (cropMode) return alert('请先保存剪裁再进行操作');
    if (!strokes.length) { alert('⚠️ 当前没有涂鸦内容可撤销'); return; }

    if (!strokes.length) return;
    strokes.pop();                           // 移除最后一条
    const ctx = document.getElementById('draw-layer').getContext('2d');
    redrawAll(ctx);                          // 清屏后重绘剩余线条
  };

  /* --- 保存涂鸦（与之前相同，只把 overlay 换成重新绘制后的） --- */
  $scope.saveDraw = () => {

    if (cropMode) return alert('请先保存剪裁再进行操作');

    // 若没有任何 stroke，直接提示
    if (!strokes.length) { alert('⚠️ 当前没有涂鸦内容可保存'); return; }

    const overlay = document.getElementById('draw-layer');
    const ctxOL   = overlay.getContext('2d');
    redrawAll(ctxOL);                        // 先确保 overlay 是最新绘制状态

    /* ---- 以下逻辑保持与上一版一致 ---- */
    const imgInfo = cropper.getImageData();
    const tmp = document.createElement('canvas');
    tmp.width = imgInfo.naturalWidth;  tmp.height = imgInfo.naturalHeight;
    const tctx = tmp.getContext('2d');

    const fullCanvas = cropper.getCroppedCanvas({
      width: tmp.width, height: tmp.height, fillColor: '#fff'
    });

    tctx.drawImage(fullCanvas, 0, 0);

    const scale = tmp.width / overlay.width;
    tctx.strokeStyle = '#ff0000';
    tctx.lineWidth = 3 * scale;

    const drawStroke = pts => {
      if (pts.length < 2) return;
      tctx.beginPath();
      tctx.moveTo(pts[0][0] * scale, pts[0][1] * scale);
      for (let i = 1; i < pts.length; i++)
        tctx.lineTo(pts[i][0] * scale, pts[i][1] * scale);
      tctx.stroke();
    };
    strokes.forEach(drawStroke);

    cropper.replace(tmp.toDataURL('image/png'));

    // 清空缓存 & 画布，退出画笔
    strokes = [];
    const overlayCtx = overlay.getContext('2d');
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

    drawMode = false;
    overlay.style.pointerEvents = 'none';
    overlay.style.cursor        = 'default';

    alert('✅ 涂鸦已保存至图片');
  };

  /* ------------ ④ 保存 ------------ */
  $scope.cropAndUpload = function () {

    if (cropMode) return alert('请先保存剪裁再进行操作');

    console.log('[DEBUG] cropper =', cropper);
    console.log('[DEBUG] $scope.cropperReady =', $scope.cropperReady);
    console.log('[ImageEditor] scope ID =', $scope.$id);
    if (!cropper || !$scope.cropperReady || typeof cropper.getData !== 'function') {
      console.log('[DEBUG] cropper =', cropper);
      alert('⚠️ 图片还在加载或裁剪器未准备好，请稍后重试');
      return;
    }

    console.log('[ImageEditor] instantiated，fileId =', $stateParams.fileId);

    // ★ 若当前状态不是“已裁剪”，强制按现有框进入裁剪模式
    if (!cropper.isCropped) cropper.crop();
    // cropper.crop();

    // 检查裁剪框是否激活
    const data = cropper.getData();
    if (!data.width || !data.height) {
      alert('请先拖动裁剪框，选择裁剪区域');
      return;
    }
    /*改变旋转角度*/
    //cropper.rotateTo(currentDeg).crop();
    cropper.crop();
    const canvas = cropper.getCroppedCanvas({ fillColor: '#fff' });
    if (!canvas) {
      alert('⚠️ 裁剪区域为空，无法保存');
      return;
    }

    const w = canvas.width,  h = canvas.height;
    const ctx = canvas.getContext('2d');

    /* 如果开启锐化则执行 */
    if (sharpenOn) applySharpen(ctx, w, h);

    /* 上传 */
    canvas.toBlob(blob => {
      const fd = new FormData();
      fd.append('file', blob, $scope.fileName);
      fd.append('previousFileId', $scope.fileId);

      fetch('../api/file', { method:'PUT', body:fd, credentials:'include' })
        .then(() => { alert('✅ 已保存'); window.close(); })
        .catch(() => { alert('❌ 上传失败'); });
    }, 'image/png');
  };
});

