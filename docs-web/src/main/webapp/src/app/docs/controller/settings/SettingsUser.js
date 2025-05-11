'use strict';

/**
 * Settings user page controller.
 */
angular.module('docs').controller('SettingsUser', function($scope, $state, Restangular) {
  /**
   * Load users from server.
   */
//  $scope.loadUsers = function() {
//    Restangular.one('user/list').get({
//      sort_column: 1,
//      asc: true
//    }).then(function(data) {
//      $scope.users = data.users;
//    });
//  };
//    $scope.loadUsers = function() {
//      Restangular.one('user/list').get({
//        sort_column: 1,
//        asc: true
//      }).then(function(data) {
//
//        data.users.forEach(function(u) {
//          u.disabled = !!u.disableTimestamp;
//        });
//        $scope.users = data.users;
//      });
//    };
    $scope.loadUsers = function() {
      Restangular.one('user/list').get({
        sort_column: 1,
        asc: true
      }).then(function(data) {
      // 添加 disabled 字段：如果 disableTimestamp 存在则为 true
        data.users.forEach(function(u) {
          //u.disabled = !!u.disableTimestamp; // ✅ 显式转换为布尔值字段
          if (u.disabled === undefined) {
            u.disabled = !!u.disableTimestamp;  // 兼容老逻辑
          }
        });
        $scope.users = data.users;
      });
    };

  
  $scope.loadUsers();
  
  /**
   * Edit a user.
   */
  $scope.editUser = function(user) {
    $state.go('settings.user.edit', { username: user.username });
  };
});