'use strict';

angular.module('docs').controller('Register', function($scope, $state, User) {
  $scope.newUser = {};
  $scope.regSuccess = false;
  $scope.regError = null;

  $scope.submitRegistration = function() {
    $scope.regError = null;
    User.register($scope.newUser).then(function(response) {
      // 注册请求成功
      $scope.regSuccess = true;
      // 可选：自动跳转登录页
      $state.go('login');
    }, function(error) {
      // 注册失败，显示错误
      $scope.regError = error.data && error.data.message ? error.data.message : "注册失败";
    });
  };
});
