angular.module('docs').controller('FileViewToolbar',
function ($scope, $state, $stateParams) {

  // 通过 $scope.file (本来就从父作用域继承) 拿到 file.id / file.name
//  $scope.openEditor = function (file) {
//    const url = $state.href(
//      'editor',
//      { fileId: file.id, fileName: file.name },
//      { absolute: true }
//    );
//    window.open(url, '编辑图像', 'width=1200,height=800');
//  };
  // 通过 $scope.file (本来就从父作用域继承) 拿到 file.id / file.name
  $scope.openEditor = function (file) {
    // ① 不传 absolute:true，得到的只是 "#/editor?fileId=..."
    //    依旧相对当前的 /docs-web/src/
    const hashUrl = $state.href('editor', {
      fileId: file.id,
      fileName: file.name
    });
    // ② 直接用相对地址打开新窗口
    window.open(hashUrl, '编辑图像', 'width=1200,height=800');
  };
});
