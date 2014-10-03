'use strict';

var ctrls = angular.module('angr.controllers', ['dialogs.main']);

ctrls.controller('IndexCtrl', function($scope, $http, projects) {
    $scope.projects = projects;
});

ctrls.controller('ProjectCtrl', function($scope, $http, $routeParams, $interval, projects, dialogs) {
    for (var i = 0; i < projects.length; i++) {
        if (projects[i].name === $routeParams['name']) {
            $scope.project = projects[i];
            break
        }
    }
    $scope.tabs = [];
    $scope.activeTab = null;
    $scope.addTab = function () {
        var dlg = dialogs.create('/static/partials/add_tab.html', 'AddTabCtrl', {}, {
            size: 'lg'
        });
        dlg.result.then(function (data) {
            $scope.tabs.push(data);
            $scope.activeTab = $scope.tabs.length - 1;
        });
    };
    $scope.activateTab = function (tabIndex) {
        $scope.activeTab = tabIndex;
    };
    $scope.activating = false;
    $scope.activate = function() {
        $scope.activating = true;
        $http.post('/api/projects/' + $scope.project.name + '/activate')
            .success(function() {
                $scope.project.activated = true;
                $scope.activating = false;
            }).error(function() {
                $scope.activating = false;
            });
    };
    var handleCFG = function(data) {
        var prefix = "asdf";
        var blockToColor = {};
        var colors = randomColor({count: Object.keys(data.functions).length,
                                  luminosity: 'light'});
        var i = 0;
        for (var addr in data.functions) {
            var blocks = data.functions[addr];
            for (var j in blocks) {
                blockToColor[blocks[j]] = colors[i];
            }
            i += 1;
        }
        $scope.cfgNodes = {};
        for (var i in data.nodes) {
            var node = data.nodes[i];
            var id = node.type + (node.type === 'IRSB' ? node.addr : node.name);
            if (node.addr) {
                node.color = blockToColor[node.addr];
            }
            $scope.cfgNodes[id] = node;
        }
        $scope.cfgEdges = [];
        for (var i in data.edges) {
            var edge = data.edges[i];
            var fromId = edge.from.type + (edge.from.type === 'IRSB' ? edge.from.addr : edge.from.name);
            var toId = edge.to.type + (edge.to.type === 'IRSB' ? edge.to.addr : edge.to.name);
            $scope.cfgEdges.push({from: fromId, to: toId});
        }
        $scope.viewState = 'cfg';
    };
    $scope.genCFG = function() {
        $http.get('/api/projects/' + $scope.project.name + '/cfg')
            .success(function(data) {
                var periodic = $interval(function() {
                    $http.get('/api/tokens/' + data.token).success(function(res) {
                        if (res.ready) {
                            $interval.cancel(periodic);
                            handleCFG(res.value);
                        }
                    }).error(function() {
                        $interval.cancel(periodic);
                    });
                }, 1000);
            });
    };
    $scope.genDDG = function() {
        $http.get('/api/projects/' + $scope.project.name + '/ddg')
            .success(function(data) {
                console.log(data);
            });
    };
});

ctrls.controller('AddTabCtrl', function ($scope, $modalInstance) {
    $scope.data = {
        type: null
    };
    $scope.cancel = function () {
        $modalInstance.dismiss("Canceled");
    };
    $scope.add = function () {
        switch ($scope.data.type) {
            case 'CFG':
                $scope.data.title = 'CFG Tab';
                break;
            case 'SURVEYOR':
                $scope.data.title = 'Surveyor Tab';
                break;
            default:
                return;
        }
        $modalInstance.close($scope.data);
    };
});
