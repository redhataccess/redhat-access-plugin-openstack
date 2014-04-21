/*! redhat_access_angular_ui - v0.0.0 - 2014-04-21
 * Copyright (c) 2014 ;
 * Licensed 
 */
var app = angular.module('RedhatAccess.tree-selector', []);

app.controller('TreeViewSelectorCtrl', ['TreeViewSelectorUtils', '$scope', '$http',
  function (TreeViewSelectorUtils, $scope, $http) {
    $scope.name = 'Attachments';
    $scope.attachmentTree = [];
    $scope.init = function () {
      $http({
        method: 'GET',
        url: 'attachments'
      }).success(function (data, status, headers, config) {
        var tree = new Array();
        TreeViewSelectorUtils.parseTreeList(tree, data);
        $scope.attachmentTree = tree;
      }).error(function (data, status, headers, config) {
        console.log("Unable to get supported attachments list");
      });
    };
    $scope.init();
  }
]);

app.directive('rhaChoiceTree', function () {
  return {
    template: '<ul><rha-choice ng-repeat="choice in tree"></rha-choice></ul>',
    replace: true,
    transclude: true,
    restrict: 'E',
    scope: {
      tree: '=ngModel'
    }
  };
});

app.directive('rhaChoice', function ($compile) {
  return {
    restrict: 'E',
    templateUrl: 'common/views/treenode.html',
    link: function (scope, elm, attrs) {
      scope.choiceClicked = function (choice) {
        choice.checked = !choice.checked;

        function checkChildren(c) {
          angular.forEach(c.children, function (c) {
            c.checked = choice.checked;
            checkChildren(c);
          });
        }
        checkChildren(choice);
      };
      if (scope.choice.children.length > 0) {
        var childChoice = $compile('<rha-choice-tree ng-show="!choice.collapsed" ng-model="choice.children"></rha-choice-tree>')(scope)
        elm.append(childChoice);
      }
    }
  };
});

app.factory('TreeViewSelectorUtils',
  function () {
    var parseTreeNode = function (splitPath, tree, fullFilePath) {
      if (splitPath[0] != null) {
        if (splitPath[0] != "") {
          var node = splitPath[0];
          var match = false;
          var index = 0;
          for (var i = 0; i < tree.length; i++) {
            if (tree[i].name === node) {
              match = true;
              index = i;
              break;
            }
          }
          if (!match) {
            var nodeObj = new Object();
            nodeObj.checked = isLeafChecked(node);
            nodeObj.name = removeParams(node);
            if (splitPath.length == 1) {
              nodeObj.fullPath = removeParams(fullFilePath);
            }
            nodeObj.children = new Array();
            tree.push(nodeObj);
            index = tree.length - 1;
          }
          splitPath.shift();
          parseTreeNode(splitPath, tree[index].children, fullFilePath);
        } else {
          splitPath.shift();
          parseTreeNode(splitPath, tree, fullFilePath);
        }
      }
    };

    var removeParams = function (path) {
      if (path) {
        var split = path.split('?');
        return split[0];
      }
      return path;
    };

    var isLeafChecked = function (path) {
      if (path) {
        var split = path.split('?');
        if (split[1]) {
          var params = split[1].split('&');
          for (var i = 0; i < params.length; i++) {
            if (params[i].indexOf("checked=true") != -1) {
              return true;
            }
          }
        }
      }
      return false;
    };

    var hasSelectedLeaves = function (tree) {

      for (var i = 0; i < tree.length; i++) {
        if (tree[i] !== undefined) {
          if (tree[i].children.length === 0) {
            //we only check leaf nodes
            if (tree[i].checked === true) {
              return true;
            }
          } else {
            if (hasSelectedLeaves(tree[i].children)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    var getSelectedNames = function (tree, container) {
      for (var i = 0; i < tree.length; i++) {
        if (tree[i] !== undefined) {
          if (tree[i].children.length === 0) {
            if (tree[i].checked === true) {
              container.push(tree[i].fullPath);
            }
          } else {
            getSelectedNames(tree[i].children, container);
          }
        }
      }
    };

    var service = {
      parseTreeList: function (tree, data) {
        var files = data.split("\n");
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          var splitPath = file.split("/");
          parseTreeNode(splitPath, tree, file);
        }
      },
      hasSelections: function (tree) {
        return hasSelectedLeaves(tree);
      },
      getSelectedLeaves: function (tree) {
        if (tree === undefined) {
          console.log("getSelectedLeaves: Invalid tree");
          return [];
        }
        var container = [];
        getSelectedNames(tree, container);
        return container;
      }
    };
    return service;
  });

app.config(function ($urlRouterProvider) {}).config(['$stateProvider',
  function ($stateProvider) {
    $stateProvider.state('choiceSelector', {
      url: "/treeselector",
      templateUrl: 'common/views/treeview-selector.html'
    })
  }
]);
angular.module('RedhatAccess.security', ['ui.bootstrap', 'RedhatAccess.template', 'ui.router'])
  .constant('AUTH_EVENTS', {
    loginSuccess: 'auth-login-success',
    loginFailed: 'auth-login-failed',
    logoutSuccess: 'auth-logout-success',
    sessionTimeout: 'auth-session-timeout',
    notAuthenticated: 'auth-not-authenticated',
    notAuthorized: 'auth-not-authorized'
  })
  .directive('rhaLoginStatus', function () {
    return {
      restrict: 'AE',
      scope: false,
      templateUrl: 'security/login_status.html'
    };
  })
  .controller('SecurityController', ['$scope', '$rootScope', 'securityService', 'AUTH_EVENTS',
    function ($scope, $rootScope, securityService, AUTH_EVENTS) {

      $scope.isLoggedIn = securityService.isLoggedIn;
      $scope.loggedInUser = '';

      $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
        setLoginStatus(true, securityService.loggedInUser);
      });

      function setLoginStatus(isLoggedIn, user) {
        $scope.isLoggedIn = isLoggedIn;
        securityService.isLoggedIn = isLoggedIn;

        if (user != null) {
          $scope.loggedInUser = user;
          securityService.loggedInUser = user;
        } else {
          $scope.loggedInuser = '';
          securityService.loggedInUser = '';
        }
      };

      strata.checkLogin(loginHandler);

      function loginHandler(result, authedUser) {

        if (result) {
          console.log("Authorized!");
          $scope.$apply(function () {
            setLoginStatus(true, authedUser.name);
          });
        } else {
          $scope.$apply(function () {
            setLoginStatus(false, '')
          });
        }
      };

      $scope.login = function () {
        securityService.login().then(function (authedUser) {
          if (authedUser) {
            setLoginStatus(true, authedUser.name);
          }
        });

      };
      $scope.logout = function () {
        strata.clearCredentials();
        setLoginStatus(false, '');
        $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
        location.reload(); //TODO: probably a neater way to do this with $state
      };
    }
  ])
  .service('securityService', ['$rootScope', '$modal', 'AUTH_EVENTS', '$q',
    function ($rootScope, $modal, AUTH_EVENTS, $q) {
      //bool isAuthed = false;
      this.isLoggedIn = false;
      this.loggedInUser = '';

      var modalDefaults = {
        backdrop: true,
        keyboard: true,
        modalFade: true,
        templateUrl: 'security/login_form.html',
        windowClass: 'rha-login-modal'
      };

      var modalOptions = {
        closeButtonText: 'Close',
        actionButtonText: 'OK',
        headerText: 'Proceed?',
        bodyText: 'Perform this action?',
        backdrop: 'static'

      };

      this.getBasicAuthToken = function () {
        var defer = $q.defer();
        var token = localStorage.getItem("rhAuthToken");
        if (token !== undefined && token !== '') {
          defer.resolve(token);
          return defer.promise;
        } else {
          var that = this;
          this.login().then(
            function (authedUser) {
              if (authedUser) {
                that.isLoggedIn = true;
                that.loggedInUser = authedUser.name;
                defer.resolve(localStorage.getItem("rhAuthToken"));
              }
            },
            function (error) {
              console.log("Unable to get user credentials");
              defer.resolve("");
            });
          return defer.promise;
        }
      };

      this.login = function () {
        return this.showLogin(modalDefaults, modalOptions);
      };

      this.getLoggedInUserName = function () {
        return strata.getAuthInfo().name;
      };

      this.showLogin = function (customModalDefaults, customModalOptions) {
        //Create temp objects to work with since we're in a singleton service
        var tempModalDefaults = {};
        var tempModalOptions = {};
        //Map angular-ui modal custom defaults to modal defaults defined in service
        angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);
        //Map modal.html $scope custom properties to defaults defined in service
        angular.extend(tempModalOptions, modalOptions, customModalOptions);
        if (!tempModalDefaults.controller) {
          tempModalDefaults.controller = ['$scope', '$modalInstance',
            function ($scope, $modalInstance) {
              $scope.user = {
                user: null,
                password: null
              };
              $scope.modalOptions = tempModalOptions;
              $scope.modalOptions.ok = function (result) {
                //Hack below is needed to handle autofill issues
                //@see https://github.com/angular/angular.js/issues/1460
                //BEGIN HACK
                $scope.user.user = $("#rha-login-user-id").val();
                $scope.user.password = $("#rha-login-password").val();
                //END HACK
                strata.setCredentials($scope.user.user, $scope.user.password,
                  function (passed, authedUser) {
                    if (passed) {
                      $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
                      $scope.user.password = '';
                      $scope.authError = null;
                      try {
                        $modalInstance.close(authedUser);
                      } catch (err) {}
                    } else {
                      // alert("Login failed!");
                      $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
                      $scope.$apply(function () {
                        $scope.authError = "Login Failed!";
                      });
                    }
                  });

              };
              $scope.modalOptions.close = function () {
                $modalInstance.dismiss();
              };
            }
          ];
        }

        return $modal.open(tempModalDefaults).result;
      };

    }
  ]);
/**
 * @ngdoc module
 * @name
 *
 * @description
 *
 */
angular.module('RedhatAccess.search', [
  'ui.router',
  'RedhatAccess.template',
  'RedhatAccess.security',
  'ui.bootstrap',
  'ngSanitize'
])
  .constant('RESOURCE_TYPES', {
    article: 'Article',
    solution: 'Solution',

  })
  .constant('SEARCH_PARAMS', {
    limit: 10

  })
  .config(['$stateProvider',
    function ($stateProvider) {
      $stateProvider.state('search', {
        url: "/search",
        controller: 'SearchController',
        templateUrl: 'search/views/search.html'
      }).state('search_accordion', { //TEMPORARY
        url: "/search2",
        controller: 'SearchController',
        templateUrl: 'search/views/accordion_search.html'

      });
    }
  ])
  .controller('SearchController', ['$scope',
    'SearchResultsService', 'SEARCH_PARAMS',
    function ($scope, SearchResultsService) {
      $scope.results = SearchResultsService.results;
      $scope.selectedSolution = SearchResultsService.currentSelection;
      $scope.searchInProgress = SearchResultsService.searchInProgress;
      $scope.searchResultInfo = SearchResultsService.searchResultInfo;

      clearResults = function () {
        SearchResultsService.clear();
      };


      $scope.solutionSelected = function (index) {
        var response = $scope.results[index];
        SearchResultsService.setSelected(response, index);

      };

      $scope.search = function (searchStr, limit) {

        SearchResultsService.search(searchStr, limit);
      };

      $scope.diagnose = function (data, limit) {
        SearchResultsService.diagnose(data, limit);
      };


      $scope.$watch(function () {
          return SearchResultsService.currentSelection
        },
        function (newVal) {
          $scope.selectedSolution = newVal;
        }
      );

    }
  ])
  .directive('rhaAccordionSearchResults', function () {
    return {
      restrict: 'AE',
      scope: false,
      templateUrl: 'search/views/accordion_search_results.html'
    };
  })
  .directive('rhaListSearchResults', function () {
    return {
      restrict: 'AE',
      scope: false,
      templateUrl: 'search/views/list_search_results.html'
    };
  })
  .directive('rhaSearchForm', function () {
    return {
      restrict: 'AE',
      scope: false,
      templateUrl: 'search/views/search_form.html'
    };
  })
  .directive('rhaStandardSearch', function () {
    return {
      restrict: 'AE',
      scope: false,
      templateUrl: 'search/views/standard_search.html'
    };
  })
  .directive('rhaResultDetailDisplay', ['RESOURCE_TYPES',
    function (RESOURCE_TYPES) {
      return {
        restrict: 'AE',
        scope: {
          result: '='
        },
        link: function (scope, element, attr) {
          scope.isSolution = function () {
            if (scope.result !== undefined && scope.result.resource_type !== undefined) {
              if (scope.result.resource_type === RESOURCE_TYPES.solution) {
                return true;
              } else {
                return false;
              }
            }
            return false;
          };
          scope.isArticle = function () {
            if (scope.result !== undefined && scope.result.resource_type !== undefined) {
              if (scope.result.resource_type === RESOURCE_TYPES.article) {
                return true;
              } else {
                return false;
              }
            }
            return false;
          };
          scope.getSolutionResolution = function () {
            var resolution_html = '';
            if (scope.result.resolution !== undefined) {
              resolution_html = scope.result.resolution.html;
            }
            return resolution_html;
          };

          scope.getArticleHtml = function () {
            if (scope.result === undefined) {
              return '';
            }
            if (scope.result.body !== undefined) {
              return scope.result.body;
            } else {
              return '';
            }
          };

        },
        templateUrl: 'search/views/resultDetail.html'
      };
    }
  ])
  .factory('SearchResultsService', ['$q', '$rootScope', 'AUTH_EVENTS', 'RESOURCE_TYPES', 'SEARCH_PARAMS',

    function ($q, $rootScope, AUTH_EVENTS, RESOURCE_TYPES, SEARCH_PARAMS) {
      var service = {
        results: [],
        currentSelection: {
          data: {},
          index: -1
        },
        searchInProgress: {
          value: false
        },

        searchResultInfo: {
          msg: null
        },
        add: function (result) {
          this.results.push(result);
        },
        clear: function () {
          this.results.length = 0;
          this.setSelected({}, -1);
          this.searchResultInfo.msg = null;
        },
        setSelected: function (selection, index) {
          this.currentSelection.data = selection;
          this.currentSelection.index = index;
        },
        search: function (searchString, limit) {
          var that = this;
          if ((limit === undefined) || (limit < 1)) limit = SEARCH_PARAMS.limit;
          this.clear();
          this.searchInProgress.value = true;
          var deferreds = [];
          strata.search(
            searchString,
            function (entries) {
              //retrieve details for each solution
              entries.forEach(function (entry) {
                var deferred = $q.defer();
                deferreds.push(deferred.promise);
                strata.utils.getURI(
                  entry.uri,
                  entry.resource_type,
                  function (type, info) {
                    if (info !== undefined) {
                      info.resource_type = type;
                    }
                    deferred.resolve(info);
                  },
                  function (error) {
                    deferred.resolve();
                  });
              });
              $q.all(deferreds).then(
                function (results) {
                  results.forEach(function (result) {
                    if (result !== undefined) {
                      that.add(result);
                    }
                  });
                  that.searchInProgress.value = false;
                },
                function (error) {
                  that.searchInProgress.value = false;
                }
              );
            },
            function (error) {
              console.log(error);
              $rootScope.$apply(function () {
                that.searchInProgress.value = false;
                if (error && error.statusText) {
                  that.searchResultInfo.msg = error.statusText;
                } else {
                  that.searchResultInfo.msg = "Error retrieving solutions";
                }
              });
            },
            limit,
            false
          );
        },
        // solution and article search needs reimplementation
        // searchSolutions: function (searchString, limit) {
        //   var that = this;
        //   if ((limit === undefined) || (limit < 1)) limit = SEARCH_PARAMS.limit;
        //   this.clear();
        //   strata.solutions.search(
        //     searchString,
        //     function (response) {
        //       $rootScope.$apply(function () {
        //         response.forEach(function (entry) {
        //           entry.resource_type = RESOURCE_TYPES.solution;
        //           that.add(entry);
        //         });
        //       });
        //     },
        //     function (error) {
        //       console.log("search failed");
        //     },
        //     limit,
        //     false
        //   );
        // },
        // searchArticles: function (searchString, limit) {
        //   var that = this;
        //   if ((limit === undefined) || (limit < 1)) limit = SEARCH_PARAMS.limit;
        //   this.clear();
        //   strata.articles.search(
        //     searchString,
        //     function (response) {
        //       response.resource_type = RESOURCE_TYPES.article;
        //       $rootScope.$apply(function () {
        //         that.add(response);
        //       });
        //     },
        //     function (error) {
        //       console.log("search failed");
        //     },
        //     limit,
        //     true
        //   );
        // },
        diagnose: function (data, limit) {
          var that = this;
          if ((limit === undefined) || (limit < 1)) limit = SEARCH_PARAMS.limit;
          this.clear();
          var deferreds = [];
          that.searchInProgress.value = true;
          strata.problems(
            data,
            function (solutions) {
              //retrieve details for each solution
              solutions.forEach(function (solution) {
                var deferred = $q.defer();
                deferreds.push(deferred.promise);
                strata.solutions.get(
                  solution.uri,
                  function (solution) {
                    deferred.resolve(solution);
                  },
                  function (error) {
                    deferred.resolve();
                  });
              });
              $q.all(deferreds).then(
                function (solutions) {
                  solutions.forEach(function (solution) {
                    if (solution !== undefined) {
                      solution.resource_type = RESOURCE_TYPES.solution;
                      that.add(solution);
                    }
                  });
                  that.searchInProgress.value = false;
                },
                function (error) {
                  that.searchInProgress.value = false;
                }
              );
            },
            function (error) {
              $rootScope.$apply(function () {
                that.searchInProgress.value = false;
                if (error && error.statusText) {
                  that.searchResultInfo.msg = error.statusText;
                } else {
                  that.searchResultInfo.msg = "Error retrieving solutions";
                }
              });
              console.log(error);
            },
            limit
          );
        }
      };

      $rootScope.$on(AUTH_EVENTS.logoutSuccess, function () {
        service.clear.apply(service);
      });
      return service;
    }
  ]);
angular.module('RedhatAccess.cases', [
  'ui.router',
  'ui.bootstrap',
  'ngTable',
  'RedhatAccess.template',
  'RedhatAccess.security',
  'RedhatAccess.search',
  'RedhatAccess.tree-selector'
])
.constant('STATUS', {
  open: 'open',
  closed: 'closed',
  both: 'both'
})
.config([
  '$stateProvider',
  function ($stateProvider) {

    $stateProvider.state('compact', {
      url: '/case/compact?sessionId',
      templateUrl: 'cases/views/compact.html',
      controller: 'Compact'
    });

    $stateProvider.state('compact.edit', {
      url: '/{id:[0-9]{1,8}}',
      templateUrl: 'cases/views/compact.edit.html',
      controller: 'CompactEdit'
    });

    $stateProvider.state('edit', {
      url: '/case/{id:[0-9]{1,8}}',
      templateUrl: 'cases/views/edit.html',
      controller: 'Edit'
    });

    $stateProvider.state('new', {
      url: '/case/new',
      templateUrl: 'cases/views/new.html',
      controller: 'New'
    });

    $stateProvider.state('list', {
      url: '/case/list',
      templateUrl: 'cases/views/list.html',
      controller: 'List'
    });
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('AttachLocalFile', [
  '$scope',
  'AttachmentsService',
  'securityService',
  function ($scope, AttachmentsService, securityService) {
    $scope.NO_FILE_CHOSEN = 'No file chosen';
    $scope.fileDescription = '';

    $scope.clearSelectedFile = function() {
      $scope.fileName = $scope.NO_FILE_CHOSEN;
      $scope.fileDescription = '';
    };

    $scope.addFile = function() {
      var data = new FormData();
      data.append('file', $scope.fileObj);
      data.append('description', $scope.fileDescription);

      AttachmentsService.addNewAttachment({
        file_name: $scope.fileName,
        description: $scope.fileDescription,
        length: $scope.fileSize,
        created_by: securityService.loggedInUser,
        created_date: new Date().getTime(),
        file: data
      });

      $scope.clearSelectedFile();
    };

    $scope.getFile = function() {
      $('#fileUploader').click();
    };

    $scope.selectFile = function() {
      $scope.fileObj = $('#fileUploader')[0].files[0];
      $scope.fileSize = $scope.fileObj.size;
      $scope.fileName = $scope.fileObj.name;
      $scope.$apply();
    };

    $scope.clearSelectedFile();
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
  .controller('AttachmentsSection', [
    '$scope',
    'AttachmentsService',
    'CaseService',
    function (
      $scope,
      AttachmentsService,
      CaseService) {

      $scope.AttachmentsService = AttachmentsService;
      $scope.CaseService = CaseService;

      $scope.doUpdate = function () {
        $scope.updatingAttachments = true;
        AttachmentsService.updateAttachments(CaseService.
        case .case_number).then(
          function () {
            $scope.updatingAttachments = false;
          }
        );
      };
    }
  ]);
'use strict';
angular.module('RedhatAccess.cases')
  .controller('BackEndAttachmentsCtrl', ['$scope',
    '$http',
    '$location',
    'AttachmentsService',
    'TreeViewSelectorUtils',
    function ($scope, $http, $location, AttachmentsService, TreeViewSelectorUtils) {
      $scope.name = 'Attachments';
      $scope.attachmentTree = []; //AttachmentsService.backendAttachemnts;
      var sessionId = $location.search().sessionId;
      $scope.init = function () {
        $http({
          method: 'GET',
          url: 'attachments?sessionId=' + encodeURIComponent(sessionId)
        }).success(function (data, status, headers, config) {
          var tree = new Array();
          TreeViewSelectorUtils.parseTreeList(tree, data);
          $scope.attachmentTree = tree;
          AttachmentsService.updateBackEndAttachements(tree);
        }).error(function (data, status, headers, config) {
          console.log("Unable to get supported attachments list");
        });
      };
      $scope.init();
    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
.controller('CommentsSection', [
  '$scope',
  'CaseService',
  'strataService',
  '$stateParams',
  function(
      $scope,
      CaseService,
      strataService,
      $stateParams) {

    strataService.cases.comments.get($stateParams.id).then(
        function(commentsJSON) {
          $scope.comments = commentsJSON;

          if (commentsJSON != null) {
            $scope.selectPage(1);
          }
        },
        function(error) {
          console.log(error);
        }
    );

    $scope.newComment = '';
    $scope.addingComment = false;

    $scope.addComment = function() {
      $scope.addingComment = true;

      strata.cases.comments.post(
          CaseService.case.case_number,
          {'text': $scope.newComment},
          function(response) {

            //refresh the comments list
            strata.cases.comments.get(
                CaseService.case.case_number,
                function(comments) {
                  $scope.newComment = '';
                  $scope.comments = comments;
                  $scope.addingComment = false;
                  $scope.selectPage(1);
                  $scope.$apply();
                },
                function(error) {
                  console.log(error);
                }
            );
          },
          function(error) {
            console.log(error);
          }
      );
    };

    $scope.itemsPerPage = 4;
    $scope.maxPagerSize = 3;

    $scope.selectPage = function(pageNum) {
      var start = $scope.itemsPerPage * (pageNum - 1);
      var end = start + $scope.itemsPerPage;
      end = end > $scope.comments.length ?
          $scope.comments.length : end;

      $scope.commentsOnScreen =
          $scope.comments.slice(start, end);
    };

    if ($scope.comments != null) {
      $scope.selectPage(1);
    }
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('Compact', [
  '$scope',
  function(
      $scope) {

  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('CompactCaseList', [
  '$scope',
  '$stateParams',
  'strataService',
  'CaseService',
  'CaseListService',
  function(
      $scope,
      $stateParams,
      strataService,
      CaseService,
      CaseListService) {

    $scope.CaseService = CaseService;
    $scope.CaseListService = CaseListService;
    $scope.loadingCaseList = true;
    $scope.selectedCaseIndex = -1;

    $scope.selectCase = function($index) {
      $scope.selectedCaseIndex = $index;

      CaseService.clearCase();
    };

    $scope.domReady = false; //used to notify resizable directive that the page has loaded
    $scope.filterCases = function() {
      strataService.cases.filter().then(
          function(cases) {
            $scope.loadingCaseList = false;
            CaseListService.defineCases(cases);
            $scope.domReady = true;
          },
          function(error) {
            console.log(error);
          }
      );
    };

    /**
     * Passed to rha-list-filter as a callback after filtering
     */
    $scope.filterCallback = function() {
      $scope.loadingCaseList = false;
    };

    $scope.onFilter = function() {
      $scope.loadingCaseList = true;
    };

    CaseService.populateGroups();

    $scope.filterCases();
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('CompactEdit', [
  '$scope',
  'strataService',
  '$stateParams',
  'CaseService',
  'AttachmentsService',
  function(
      $scope,
      strataService,
      $stateParams,
      CaseService,
      AttachmentsService) {

    $scope.caseLoading = true;
    $scope.domReady = false;

    strataService.cases.get($stateParams.id).then(
      function(caseJSON) {
        CaseService.defineCase(caseJSON);
        $scope.caseLoading = false;

        strataService.products.versions(caseJSON.product.name).then(
            function(versions) {
              CaseService.versions = versions;
            }
        );

        $scope.domReady = true;
      }
    );

    strataService.cases.attachments.list($stateParams.id).then(
        function(attachmentsJSON) {
          AttachmentsService.defineOriginalAttachments(attachmentsJSON);
        },
        function(error) {
          console.log(error);
        }
    );


  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('DescriptionSection', [
  '$scope',
  'CaseService',
  function(
      $scope,
      CaseService) {

    $scope.CaseService = CaseService;
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('DetailsSection', [
  '$scope',
  'strataService',
  'CaseService',
  function(
      $scope,
      strataService,
      CaseService) {

    $scope.CaseService = CaseService;

    if (!$scope.compact) {

      strataService.values.cases.types().then(
          function(response) {
            $scope.caseTypes = response;
          }
      );

      strataService.groups.list().then(
          function(response) {
            $scope.groups = response;
          }
      );
    }

    strataService.values.cases.status().then(
        function(response) {
          $scope.statuses = response;
        }
    );

    strataService.values.cases.severity().then(
        function(response) {
          $scope.severities = response;
        }
    );

    strataService.products.list().then(
        function(response) {
          $scope.products = response;
        }
    );

    $scope.updatingDetails = false;

    $scope.updateCase = function() {
      $scope.updatingDetails = true;

      var caseJSON = {};
      if (CaseService.case != null) {
        if (CaseService.case.type != null) {
          caseJSON.type = CaseService.case.type.name;
        }
        if (CaseService.case.severity != null) {
          caseJSON.severity = CaseService.case.severity.name;
        }
        if (CaseService.case.status != null) {
          caseJSON.status = CaseService.case.status.name;
        }
        if (CaseService.case.alternate_id != null) {
          caseJSON.alternate_id = CaseService.case.alternate_id;
        }
        if (CaseService.case.product != null) {
          caseJSON.product = CaseService.case.product.name;
        }
        if (CaseService.case.version != null) {
          caseJSON.version = CaseService.case.version;
        }
        if (CaseService.case.summary != null) {
          caseJSON.summary = CaseService.case.summary;
        }
        if (CaseService.case.group != null) {
          caseJSON.folderNumber = CaseService.case.group.number;
        }

        strata.cases.put(
            CaseService.case.case_number,
            caseJSON,
            function() {
              $scope.caseDetails.$setPristine();
              $scope.updatingDetails = false;
              $scope.$apply();
            },
            function(error) {
              console.log(error);
              $scope.updatingDetails = false;
              $scope.$apply();
            }
        );
      }
    };

    $scope.getProductVersions = function() {
      CaseService.versions = [];

      strataService.products.versions(CaseService.case.product.code).then(
          function(versions){
            CaseService.versions = versions;
          }
      );
    };
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('Edit', [
  '$scope',
  '$stateParams',
  '$filter',
  '$q',
  'AttachmentsService',
  'CaseService',
  'strataService',
  function(
      $scope,
      $stateParams,
      $filter,
      $q,
      AttachmentsService,
      CaseService,
      strataService) {

    $scope.AttachmentsService = AttachmentsService;
    $scope.CaseService = CaseService;
    CaseService.clearCase();

    $scope.caseLoading = true;

    strataService.cases.get($stateParams.id).then(
        function(caseJSON) {
          CaseService.defineCase(caseJSON);
          $scope.caseLoading = false;

          strataService.products.versions(caseJSON.product.name).then(
              function(versions) {
                CaseService.versions = versions;
              }
          );

          if (caseJSON.account_number != null) {
            strataService.accounts.get(caseJSON.account_number).then(
                function(account) {
                  CaseService.defineAccount(account);
                }
            );
          }

          //TODO: get recommendations
        }
    );

    $scope.attachmentsLoading = true;
    strataService.cases.attachments.list($stateParams.id).then(
        function(attachmentsJSON) {
          AttachmentsService.defineOriginalAttachments(attachmentsJSON);
          $scope.attachmentsLoading = false;
        },
        function(error) {
          console.log(error);
        }
    );

    strataService.cases.comments.get($stateParams.id).then(
        function(commentsJSON) {
          $scope.comments = commentsJSON;
        },
        function(error) {
          console.log(error);
        }
    );
  }]);


'use strict';

angular.module('RedhatAccess.cases')
.controller('List', [
  '$scope',
  '$filter',
  'ngTableParams',
  'STATUS',
  'strataService',
  'CaseListService',
  function ($scope, $filter, ngTableParams, STATUS, strataService, CaseListService) {
    $scope.CaseListService = CaseListService;

    var buildTable = function() {
      $scope.tableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          last_modified_date: 'desc'
        }
      }, {
        total: CaseListService.cases.length,
        getData: function($defer, params) {
          var orderedData = params.sorting() ?
              $filter('orderBy')(CaseListService.cases, params.orderBy()) : CaseListService.cases;

          var pageData = orderedData.slice(
              (params.page() - 1) * params.count(), params.page() * params.count());

          $scope.tableParams.total(orderedData.length);
          $defer.resolve(pageData);
        }
      });
    };

    $scope.loadingCases = true;
    strataService.cases.filter().then(
        function(cases) {
          CaseListService.defineCases(cases);
          buildTable();
          $scope.loadingCases = false;
        }
    );

    $scope.preFilter = function() {
      $scope.loadingCases = true;
    };

    $scope.postFilter = function() {
      $scope.tableParams.reload();
      $scope.loadingCases = false;
    };
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('ListAttachments', [
  '$scope',
  'AttachmentsService',
  function ($scope, AttachmentsService) {

    $scope.AttachmentsService = AttachmentsService;
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.controller('ListFilter', [
  '$scope',
  'strataService',
  'STATUS',
  'CaseListService',
  function ($scope, strataService, STATUS, CaseListService) {

    $scope.groups = [];
    strataService.groups.list().then(
        function(groups) {
          $scope.groups = groups;
        }
    );

    $scope.statusFilter = STATUS.both;

    var getIncludeClosed = function() {
      if ($scope.statusFilter === STATUS.open) {
        return false;
      } else if ($scope.statusFilter === STATUS.closed) {
        return true;
      } else if ($scope.statusFilter === STATUS.both) {
        return true;
      }

      return false;
    };

    $scope.onFilterKeyPress = function($event) {
      if ($event.keyCode === 13) {
        $scope.doFilter();
      }
    };

    $scope.doFilter = function() {

      if (angular.isFunction($scope.prefilter)) {
        $scope.prefilter();
      }

      var params = {
        include_closed: getIncludeClosed(),
        count: 50
      };

      if ($scope.keyword != null) {
        params.keyword = $scope.keyword;
      }

      if ($scope.group != null) {
        params.group_numbers = {
          group_number: [$scope.group.number]
        };
      }

      if ($scope.statusFilter === STATUS.closed) {
        params.status = STATUS.closed;
      }

      strataService.cases.filter(params).then(
          function(filteredCases) {
            if (filteredCases === undefined) {
              CaseListService.defineCases([]);
            } else {
              CaseListService.defineCases(filteredCases);
            }

            if (angular.isFunction($scope.postfilter)) {
              $scope.postfilter();
            }
          }
      );
    };
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
  .controller('New', [
    '$scope',
    '$state',
    '$q',
    'SearchResultsService',
    'AttachmentsService',
    'strataService',
    function ($scope, $state, $q, SearchResultsService, AttachmentsService, strataService) {
      $scope.versions = [];
      $scope.versionDisabled = true;
      $scope.versionLoading = false;
      $scope.incomplete = true;
      $scope.submitProgress = 0;
      AttachmentsService.clear();

      $scope.productsLoading = true;
      strataService.products.list().then(
          function(products) {
            $scope.products = products;
            $scope.productsLoading = false;
          }
      );

      $scope.severitiesLoading = true;
      strataService.values.cases.severity().then(
          function(severities) {
            $scope.severities = severities;
            $scope.severity = severities[severities.length - 1];
            $scope.severitiesLoading = false;
          }
      );

      $scope.groupsLoading = true;
      strataService.groups.list().then(
          function(groups) {
            $scope.groups = groups;
            $scope.groupsLoading = false;
          }
      );

      $scope.validateForm = function () {
        if ($scope.product == null || $scope.product == "" ||
          $scope.version == null || $scope.version == "" ||
          $scope.summary == null || $scope.summary == "" ||
          $scope.description == null || $scope.description == "") {
          $scope.incomplete = true;
        } else {
          $scope.incomplete = false;
        }
      };

      $scope.loadingRecommendations = false;

      $scope.setCurrentData = function () {
        $scope.currentData = {
          product: $scope.product,
          version: $scope.version,
          summary: $scope.summary,
          description: $scope.description
        };
      };

      $scope.setCurrentData();

      $scope.getRecommendations = function () {

        var newData = {
          product: $scope.product,
          version: $scope.version,
          summary: $scope.summary,
          description: $scope.description
        };

        if (!angular.equals($scope.currentData, newData) && !SearchResultsService.searchInProgress.value) {
          var data = {
            product: $scope.product,
            version: $scope.version,
            summary: $scope.summary,
            description: $scope.desecription
          };
          $scope.setCurrentData();

          SearchResultsService.diagnose(data,5);
        }
      };

      /**
       * Retrieve product's versions from strata
       *
       * @param product
       */
      $scope.getProductVersions = function (product) {
        $scope.version = "";
        $scope.versionDisabled = true;
        $scope.versionLoading = true;

        strata.products.versions(
          product.code,
          function (response) {
            $scope.versions = response;
            $scope.validateForm();
            $scope.versionDisabled = false;
            $scope.versionLoading = false;
            $scope.$apply();
          },
          function (error) {
            console.log(error);
          });
      };

      /**
       * Go to a page in the wizard
       *
       * @param page
       */
      $scope.gotoPage = function (page) {
        $scope.isPage1 = page == 1 ? true : false;
        $scope.isPage2 = page == 2 ? true : false;
      };

      /**
       * Navigate forward in the wizard
       */
      $scope.doNext = function () {
        $scope.gotoPage(2);
      };

      /**
       * Navigate back in the wizard
       */
      $scope.doPrevious = function () {
        $scope.gotoPage(1);
      };

      /**
       * Return promise for a single attachment
       */
      var postAttachment = function (caseNumber, attachment, progressIncrement) {

        var singleAttachmentSuccess = function (response) {
          $scope.submitProgress = $scope.submitProgress + progressIncrement;
        };

        var deferred = $q.defer();
        deferred.promise.then(singleAttachmentSuccess);

        strata.cases.attachments.post(
          attachment,
          caseNumber,
          function (response) {
            deferred.resolve(response);
          },
          function (error, error2, error3, error4) {
            console.log(error);
            deferred.reject(error);
          }
        );

        return deferred.promise;
      };

      $scope.submittingCase = false;

      /**
       * Create the case with attachments
       */
      $scope.doSubmit = function () {

        var caseJSON = {
          'product': $scope.product.code,
          'version': $scope.version,
          'summary': $scope.summary,
          'description': $scope.description,
          'severity': $scope.severity.name,
          'folderNumber': $scope.caseGroup == null ? '' : $scope.caseGroup.number
        };
        $scope.submittingCase = true;
        strata.cases.post(
          caseJSON,
          function (caseNumber) {
            if ((AttachmentsService.updatedAttachments.length > 0) || (AttachmentsService.hasBackEndSelections())) {
              AttachmentsService.updateAttachments(caseNumber).then(
                function () {
                  $state.go('edit', {
                    id: caseNumber
                  });
                  $scope.submittingCase = false;
                }
              );
            }
          },
          function (error) {
            console.log(error);
          }
        );

      };

      $scope.gotoPage(1);
    }
  ]);
'use strict';
/**
 * Child of Details controller
 **/

angular.module('RedhatAccess.cases')
.controller('Recommendations', [
  '$scope',
  function ($scope) {
    $scope.itemsPerPage = 4;
    $scope.maxSize = 10;

    $scope.selectPage = function(pageNum) {
      var start = $scope.itemsPerPage * (pageNum - 1);
      var end = start + $scope.itemsPerPage;
      end = end > $scope.recommendations.length ?
              $scope.recommendations.length : end;

      $scope.recommendationsOnScreen =
        $scope.recommendations.slice(start, end);
    };

    if ($scope.recommendations != null) {
      $scope.selectPage(1);
    }
  }]);


'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaAttachLocalFile', function () {
  return {
    templateUrl: 'cases/views/attachLocalFile.html',
    restrict: 'EA',
    controller: 'AttachLocalFile',
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaAttachProductLogs', function () {
  return {
    templateUrl: 'cases/views/attachProductLogs.html',
    restrict: 'EA',
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaCaseAttachments', function () {
  return {
    templateUrl: 'cases/views/attachmentsSection.html',
    restrict: 'EA',
    controller: 'AttachmentsSection',
    scope: {
    },
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaCaseComments', function () {
return {
  templateUrl: 'cases/views/commentsSection.html',
  controller: 'CommentsSection',
  restrict: 'EA',
  link: function postLink(scope, element, attrs) {
  }
};
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaCompactCaseList', function () {
  return {
    templateUrl: 'cases/views/compactCaseList.html',
    controller: 'CompactCaseList',
    scope: {
    },
    restrict: 'EA',
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaCaseDescription', function () {
return {
  templateUrl: 'cases/views/descriptionSection.html',
  restrict: 'EA',
  controller: 'DescriptionSection',
  link: function postLink(scope, element, attrs) {
  }
};
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaCaseDetails', function () {
  return {
    templateUrl: 'cases/views/detailsSection.html',
    controller: 'DetailsSection',
    scope: {
      compact: '='
    },
    restrict: 'EA',
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaListAttachments', function () {
  return {
    templateUrl: 'cases/views/listAttachments.html',
    restrict: 'EA',
    controller: 'ListAttachments',
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaListFilter', function () {
  return {
    templateUrl: 'cases/views/listFilter.html',
    restrict: 'EA',
    controller: 'ListFilter',
    scope: {
      prefilter: '=',
      postfilter: '='
    },
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaOnChange', function () {
  return {
    restrict: "A",
    link: function (scope, element, attrs) {
      element.bind('change', element.scope()[attrs.rhaOnChange]);
    }
  };
});
'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaPageHeader', function () {
  return {
    templateUrl: 'cases/views/pageHeader.html',
    restrict: 'EA',
    scope: {
      title: '=title'
    },
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccess.cases')
.directive('rhaResizable', [
  '$window',
  '$timeout',
  function ($window) {

    var link = function(scope, element, attrs) {

      scope.onResizeFunction = function() {
        var distanceToTop = element[0].getBoundingClientRect().top;
        var height = $window.innerHeight - distanceToTop;
        element.css('height', height);
      };

      angular.element($window).bind(
          'resize',
          function() {
            scope.onResizeFunction();
            scope.$apply();
          }
      );

      if (attrs.rhaDomReady !== undefined) {
        scope.$watch('rhaDomReady', function(newValue) {
          if (newValue) {
            scope.onResizeFunction();
          }
        });
      } else {
        scope.onResizeFunction();
      }


    };

    return {
      restrict: 'A',
      scope: {
        rhaDomReady: '='
      },
      link: link
    };
  }
]);

angular.module('RedhatAccess.cases')
.filter('bytes', function() {
  return function(bytes, precision) {
    if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
    if (typeof precision === 'undefined') precision = 1;
    var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
        number = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
  }
});
'use strict';

angular.module('RedhatAccess.cases')
  .service('AttachmentsService', [
    '$filter',
    '$q',
    'strataService',
    'TreeViewSelectorUtils',
    '$http',
    'securityService',
    function ($filter, $q, strataService, TreeViewSelectorUtils, $http, securityService) {
      this.originalAttachments = [];
      this.updatedAttachments = [];

      this.backendAttachments = [];

      this.clear = function () {
        this.originalAttachments = [];
        this.updatedAttachments = [];
        this.backendAttachments = [];
      };

      this.updateBackEndAttachements = function (selected) {
        this.backendAttachments = selected;
      };

      this.hasBackEndSelections = function () {
        return TreeViewSelectorUtils.hasSelections(this.backendAttachments);
      };

      this.removeAttachment = function ($index) {
        this.updatedAttachments.splice($index, 1);
      };

      this.getOriginalAttachments = function () {
        return this.originalAttachments;
      };

      this.getUpdatedAttachments = function () {
        return this.updatedAttachments;
      };

      this.addNewAttachment = function (attachment) {
        this.updatedAttachments.push(attachment);
      };

      this.defineOriginalAttachments = function (attachments) {
        if (!angular.isArray(attachments)) {
          this.originalAttachments = [];
        } else {
          this.originalAttachments = attachments;
        }

        this.updatedAttachments = angular.copy(this.originalAttachments);
      };


      this.postBackEndAttachments = function (caseId) {
        var selectedFiles = TreeViewSelectorUtils.getSelectedLeaves(this.backendAttachments);
        securityService.getBasicAuthToken().then(
          function (auth) {
            //we post each attachment separately
            var promises = [];
            for (var i = 0; i < selectedFiles.length; i++) {
              var jsonData = {
                authToken: auth,
                attachment: selectedFiles[i],
                caseNum: caseId
              };
              promises.push($http.post('attachments', jsonData));
            }
            return $q.all(promises);
          }
        )
      };

      this.updateAttachments = function (caseId) {
        var hasLocalAttachments = !angular.equals(this.originalAttachments, this.updatedAttachments);
        var hasServerAttachments = this.hasBackEndSelections;
        if (hasLocalAttachments || hasServerAttachments) {
          var promises = [];
          var updatedAttachments = this.updatedAttachments;
          if (hasServerAttachments) {
            promises.push(this.postBackEndAttachments(caseId));
          }
          if (hasLocalAttachments) {
            //find new attachments
            for (var i in updatedAttachments) {
              if (!updatedAttachments[i].hasOwnProperty('uuid')) {
                var promise = strataService.cases.attachments.post(
                  updatedAttachments[i].file,
                  caseId
                )
                promise.then(function (uri) {
                  updatedAttachments[i].uri = uri;
                });

                promises.push(promise);
              }
            }
            //find removed attachments
            jQuery.grep(this.originalAttachments, function (origAttachment) {
              var attachment =
                $filter('filter')(updatedAttachments, {
                  'uuid': origAttachment.uuid
                });

              if (attachment.length == 0) {
                promises.push(
                  strataService.cases.attachments.delete(
                    origAttachment.uuid,
                    caseId
                  )
                );
              }
            });
          }

          var parentPromise = $q.all(promises);
          parentPromise.then(
            angular.bind(this, function (AttachmentsService, two, three, four) {
              this.defineOriginalAttachments(angular.copy(updatedAttachments));
            }),
            function (error) {
              console.log("Problem creating attachments");
              console.log(error);
            }
          );

          return parentPromise;
        }
      };
    }
  ]);
'use strict';

angular.module('RedhatAccess.cases')
.service('CaseListService', [
  function () {
    this.cases = [];

    this.defineCases = function(cases) {
      this.cases = cases;
    }
  }
]);

'use strict';

angular.module('RedhatAccess.cases')
.service('CaseService', [
  'strataService',
  function (strataService) {
    this.case = {};
    this.versions = [];
    this.products = [];
    this.statuses = [];
    this.severities = [];
    this.groups = [];
    this.account = {};

    /**
     * Add the necessary wrapper objects needed to properly display the data.
     *
     * @param rawCase
     */
    this.defineCase = function(rawCase) {
      rawCase.severity = {'name': rawCase.severity};
      rawCase.status = {'name': rawCase.status};
      rawCase.product = {'name': rawCase.product};
      rawCase.group = {'number': rawCase.folder_number};
      rawCase.type = {'name': rawCase.type};

      this.case = rawCase;
    };

    this.defineAccount = function(account) {
      this.account = account;
    };

    this.clearCase = function() {
      this.case = {};
      this.versions = [];
      this.products = [];
      this.statuses = [];
      this.severities = [];
      this.groups = [];
      this.account = {};
    };

    this.populateGroups = function() {
      strataService.groups.list().then(
          angular.bind(this, function(groups) {
            this.groups = groups;
          })
      );
    };
}]);

'use strict';

angular.module('RedhatAccess.cases')
.factory('strataService', ['$q', function ($q) {
  return {
    products: {
      list: function() {
        var deferred = $q.defer();

        strata.products.list(
            function (response) {
              deferred.resolve(response);
            },
            function (error) {
              deferred.reject(error);
            }
        );

        return deferred.promise;
      },
      versions: function(productCode) {
        var deferred = $q.defer();

        strata.products.versions(
            productCode,
            function (response) {
              deferred.resolve(response);
            },
            function (error) {
              deferred.reject(error);
            }
        );

        return deferred.promise;
      }
    },
    groups: {
      list: function() {
        var deferred = $q.defer();

        strata.groups.list(
            function (response) {
              deferred.resolve(response);
            },
            function (error) {
              deferred.reject(error);
            }
        );

        return deferred.promise;
      }
    },
    accounts: {
      get: function(accountNumber) {
        var deferred = $q.defer();

        strata.accounts.get(
          accountNumber,
          function(response) {
            deferred.resolve(response);
          },
          function(error) {
            deferred.reject(error);
          }
        );

        return deferred.promise;
      }
    },
    cases: {
      attachments: {
        list: function(id) {
          var deferred = $q.defer();

          strata.cases.attachments.list(
              id,
              function (response) {
                deferred.resolve(response);
              },
              function (error) {
                deferred.reject(error);
              }
          );

          return deferred.promise;
        },
        post: function(attachment, caseNumber) {
          var deferred = $q.defer();

          strata.cases.attachments.post(
              attachment,
              caseNumber,
              function(response, code, xhr) {
                deferred.resolve(xhr.getResponseHeader('Location'));
              },
              function(error) {
                console.log(error);
                deferred.reject(error);
              }
          );

          return deferred.promise;
        },
        delete: function(id, caseNumber) {

          var deferred = $q.defer();

          strata.cases.attachments.delete(
              id,
              caseNumber,
              function(response) {
                deferred.resolve(response);
              },
              function(error) {
                deferred.reject(error);
              }
          );

          return deferred.promise;
        }
      },
      comments: {
        get: function(id) {
          var deferred = $q.defer();

          strata.cases.comments.get(
              id,
              function (response) {
                deferred.resolve(response);
              },
              function (error) {
                deferred.reject(error);
              }
          );

          return deferred.promise;
        }
      },
      get: function(id) {
        var deferred = $q.defer();

        strata.cases.get(
            id,
            function (response) {
              deferred.resolve(response);
            },
            function (error) {
              deferred.reject(error);
            }
        );

        return deferred.promise;
      },
      filter: function(params) {
        var deferred = $q.defer();
        if (params == null) {
          params = {};
        }
        if (params.count == null) {
          params.count = 50;
        }

        strata.cases.filter(
            params,
            function(allCases) {
              deferred.resolve(allCases);
            },
            function(error) {
              deferred.reject(error);
            }
        );

        return deferred.promise;
      }
    },
    values: {
      cases: {
        severity: function() {
          var deferred = $q.defer();

          strata.values.cases.severity(
              function (response) {
                deferred.resolve(response);
              },
              function (error) {
                deferred.reject(error);
              }
          );

          return deferred.promise;
        },
        status: function() {
          var deferred = $q.defer();

          strata.values.cases.status(
              function (response) {
                deferred.resolve(response);
              },
              function (error) {
                deferred.reject(error);
              }
          );

          return deferred.promise;
        },
        types: function() {
          var deferred = $q.defer();

          strata.values.cases.types(
              function (response) {
                deferred.resolve(response);
              },
              function (error) {
                deferred.reject(error);
              }
          );

          return deferred.promise;
        }
      }
    }
  };
}]);

//var testURL = 'http://localhost:8080/LogCollector/';
// angular module
angular.module('RedhatAccess.logViewer',
	[ 'angularTreeview', 'ui.bootstrap', 'RedhatAccess.search'])

.config(function($urlRouterProvider) {
}).config([ '$stateProvider', function($stateProvider) {
	$stateProvider.state('logviewer', {
		url : "/logviewer",
		templateUrl : 'log_viewer/views/log_viewer.html'
	})
} ]).value('hideMachinesDropdown', false)

.factory('files', function() {
	var fileList = '';
	var selectedFile = '';
	var selectedHost = '';
	var file = '';
	var retrieveFileButtonIsDisabled = {check : true};
	return {
		getFileList : function() {
			return fileList;
		},

		setFileList : function(fileList) {
			this.fileList = fileList;
		},
		getSelectedFile : function() {
			return selectedFile;
		},

		setSelectedFile : function(selectedFile) {
			this.selectedFile = selectedFile;
		},
		getFile : function() {
			return file;
		},

		setFile : function(file) {
			this.file = file;
		}, 

		setRetrieveFileButtonIsDisabled : function(isDisabled){
			retrieveFileButtonIsDisabled.check = isDisabled;
		},

		getRetrieveFileButtonIsDisabled : function() {
			return retrieveFileButtonIsDisabled;
		}
	};
})

.service('accordian', function() {
	var groups = new Array();
	return {
		getGroups : function() {
			return groups;
		},
		addGroup : function(group) {
			groups.push(group);
		},
		clearGroups : function() {
			groups = '';
		}
	};
})
.controller('fileController', function($scope, files) {
	$scope.roleList = '';

	$scope.$watch(function() {
		return $scope.mytree.currentNode;
	}, function() {
		if ($scope.mytree.currentNode != null
			&& $scope.mytree.currentNode.fullPath != null) {
			files.setSelectedFile($scope.mytree.currentNode.fullPath);
			files.setRetrieveFileButtonIsDisabled(false);
		} else {
			files.setRetrieveFileButtonIsDisabled(true);
		}
	});
	$scope.$watch(function() {
		return files.fileList;
	}, function() {
		$scope.roleList = files.fileList;
	});
})
.controller('DropdownCtrl', function($scope, $http, $location, files, hideMachinesDropdown) {
	$scope.machinesDropdownText = "Please Select the Machine";
	$scope.items = [];
	$scope.hideDropdown = hideMachinesDropdown;
	var sessionId = $location.search().sessionId;

	$scope.getMachines = function() {
		$http({
			method : 'GET',
			url : 'machines?sessionId=' + encodeURIComponent(sessionId)
		}).success(function(data, status, headers, config) {
			$scope.items = data;
		}).error(function(data, status, headers, config) {
			var i = 0;
			// called asynchronously if an error occurs
			// or server returns response with an error status.
		});
	};
	$scope.machineSelected = function() {
		var sessionId = $location.search().sessionId;
		var userId = $location.search().userId;
		files.selectedHost = this.choice;
		$scope.machinesDropdownText = this.choice;
		$http(
		{
			method : 'GET',
			url : 'logs?machine=' + files.selectedHost
			+ '&sessionId=' + encodeURIComponent(sessionId)
			+ '&userId=' + encodeURIComponent(userId)
		}).success(function(data, status, headers, config) {
			var tree = new Array();
			parseList(tree, data);
			files.setFileList(tree);
		}).error(function(data, status, headers, config) {
			// called asynchronously if an error occurs
			// or server returns response with an error status.
		});
	};
	if(hideMachinesDropdown){
		$scope.machineSelected();
	} else{
		$scope.getMachines();
	}
})
.controller('selectFileButton', function($scope, $http, $location,
	files) {
	$scope.retrieveFileButtonIsDisabled = files.getRetrieveFileButtonIsDisabled();

	$scope.fileSelected = function() {
		var sessionId = $location.search().sessionId;
		var userId = $location.search().userId;
		$scope.$parent.sidePaneToggle = !$scope.$parent.sidePaneToggle;
		$http(
		{
			method : 'GET',
			url : 'logs?sessionId='
			+ encodeURIComponent(sessionId) + '&userId='
			+ encodeURIComponent(userId) + '&path='
			+ files.selectedFile + '&machine='
			+ files.selectedHost
		}).success(function(data, status, headers, config) {
			files.file = data;
		}).error(function(data, status, headers, config) {
			// called asynchronously if an error occurs
			// or server returns response with an error status.
		});
	};
})
.controller('TabsDemoCtrl', [
	'$scope',
	'$http',
	'$location',
	'files',
	'accordian',
	'SearchResultsService',
	function($scope, $http, $location, files, accordian, SearchResultsService) {
		$scope.tabs = [ {
			shortTitle : "Short Sample Log File",
			longTitle : "Long Log File",
			content : "Sample Log Text"
		} ];
		$scope.isDisabled = true;
		$scope.$watch(function() {
			return files.file;
		}, function() {
			if (files.file != null && files.selectedFile != null) {
				file = new Object();
				if(files.selectedHost != null){
					file.longTitle = files.selectedHost + ":"
				} else {
					file.longTitle = new String();
				}
				file.longTitle = file.longTitle.concat(files.selectedFile);
				var splitFileName = files.selectedFile.split("/");
				var fileName = splitFileName[splitFileName.length - 1];
				
				if(files.selectedHost != null){
					file.shortTitle = files.selectedHost + ":"
				} else {
					file.shortTitle = new String();
				}
				file.shortTitle = file.shortTitle.concat(fileName);
				file.content = files.file;
				files.file = null;
				$scope.tabs.push(file);
			}
		});
		$scope.removeTab = function(index) {
			$scope.tabs.splice(index, 1);
		};

		$scope.checked = false; // This will be
		// binded using the
		// ps-open attribute

		$scope.diagnoseText = function() {
			$scope.isDisabled = true;
			if (!$scope.$parent.solutionsToggle) {
				$scope.$parent.solutionsToggle = !$scope.$parent.solutionsToggle;
			}
			var text = strata.utils.getSelectedText();
			if (text != "") {
				$scope.checked = !$scope.checked;
				SearchResultsService.diagnose(text, 5);
			}
			$scope.sleep(5000, $scope.checkTextSelection);
		};

		$scope.refreshTab = function(index){
			var sessionId = $location.search().sessionId;
			var userId = $location.search().userId;
			// $scope.tabs[index].content = '';
			//TODO reuse this code from above
			$http(
			{
				method : 'GET',
				url : 'logs?sessionId='
				+ encodeURIComponent(sessionId) + '&userId='
				+ encodeURIComponent(userId) + '&path='
				+ files.selectedFile + '&machine='
				+ files.selectedHost
			}).success(function(data, status, headers, config) {
				$scope.tabs[index].content = data;
			}).error(function(data, status, headers, config) {
		// called asynchronously if an error occurs
		// or server returns response with an error status.
			});
		};
		$scope.enableDiagnoseButton = function(){
			//Gotta wait for text to "unselect"
			$scope.sleep(1, $scope.checkTextSelection);
		};
		$scope.checkTextSelection = function(){
			if(strata.utils.getSelectedText()){
				$scope.isDisabled = false;
			} else{
				$scope.isDisabled = true;
			}
			$scope.$apply();
		};

		$scope.sleep = function(millis, callback) {
			setTimeout(function()
        		{ callback(); }
			, millis);
		};
		}])

.controller('AccordionDemoCtrl', function($scope, accordian) {
	$scope.oneAtATime = true;
	$scope.groups = accordian.getGroups();
})

.directive('fillDown', function($window, $timeout) {
	return {
		restrict: 'EA',
		link: function postLink(scope, element, attrs) {
			scope.onResizeFunction = function() {
				var distanceToTop = element[0].getBoundingClientRect().top;
				var height = $window.innerHeight - distanceToTop - 21;
				if(element[0].id == 'fileList'){
					height -= 34;
				}
				return scope.windowHeight = height;
			};
      // This might be overkill?? 
      //scope.onResizeFunction();
      angular.element($window).bind('resize', function() {
      	scope.onResizeFunction();
      	scope.$apply();
      });
      angular.element($window).bind('click', function() {
      	scope.onResizeFunction();
      	scope.$apply();
      });
      $timeout(scope.onResizeFunction, 100);
      // $(window).load(function(){
      // 	scope.onResizeFunction();
      // 	scope.$apply();
      // });
      // scope.$on('$viewContentLoaded', function() {
      // 	scope.onResizeFunction();
      // 	//scope.$apply();
      // });
  }
};
});

function parseList(tree, data) {
	var files = data.split("\n");
	for ( var i in files) {
		var file = files[i];
		var splitPath = file.split("/");
		returnNode(splitPath, tree, file);
	}
}

function returnNode(splitPath, tree, fullFilePath) {
	if (splitPath[0] != null) {
		if (splitPath[0] != "") {
			var node = splitPath[0];
			var match = false;
			var index = 0;
			for ( var i in tree) {
				if (tree[i].roleName == node) {
					match = true;
					index = i;
					break;
				}
			}
			if (!match) {
				var object = new Object();
				object.roleName = node;
				object.roleId = node;
				if (splitPath.length == 1) {
					object.fullPath = fullFilePath;
				}
				object.children = new Array();
				tree.push(object);
				index = tree.length - 1;
			}

			splitPath.shift();
			returnNode(splitPath, tree[index].children, fullFilePath);
		} else {
			splitPath.shift();
			returnNode(splitPath, tree, fullFilePath);
		}
	}
}
angular.module('RedhatAccess.template', ['common/views/treenode.html', 'common/views/treeview-selector.html', 'security/login_form.html', 'security/login_status.html', 'search/views/accordion_search.html', 'search/views/accordion_search_results.html', 'search/views/list_search_results.html', 'search/views/resultDetail.html', 'search/views/search.html', 'search/views/search_form.html', 'search/views/standard_search.html', 'cases/views/attachLocalFile.html', 'cases/views/attachProductLogs.html', 'cases/views/attachmentsSection.html', 'cases/views/commentsSection.html', 'cases/views/compact.edit.html', 'cases/views/compact.html', 'cases/views/compactCaseList.html', 'cases/views/descriptionSection.html', 'cases/views/detailsSection.html', 'cases/views/edit.html', 'cases/views/list.html', 'cases/views/listAttachments.html', 'cases/views/listFilter.html', 'cases/views/new.html', 'cases/views/pageHeader.html', 'log_viewer/views/log_viewer.html']);

angular.module("common/views/treenode.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("common/views/treenode.html",
    "<li class=\"rha-treeselector-node\">\n" +
    "    <div>\n" +
    "        <span class=\"icon\" ng-class=\"{collapsed: choice.collapsed, expanded: !choice.collapsed}\" ng-show=\"choice.children.length > 0\" ng-click=\"choice.collapsed = !choice.collapsed\">\n" +
    "        </span>\n" +
    "        <span class=\"label\" ng-if=\"choice.children.length > 0\" ng-class=\"folder\">{{choice.name}}\n" +
    "        </span>\n" +
    "        <span class=\"label\" ng-if=\"choice.children.length === 0\"  ng-click=\"choiceClicked(choice)\">\n" +
    "            <input type=\"checkbox\" ng-checked=\"choice.checked\">{{choice.name}}\n" +
    "        </span>\n" +
    "    </div>\n" +
    "</li>");
}]);

angular.module("common/views/treeview-selector.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("common/views/treeview-selector.html",
    "<div ng-controller=\"TreeViewSelectorCtrl\">\n" +
    "	<div> Choose File(s) To Attach: </div>\n" +
    "  <rha-choice-tree ng-model=\"attachmentTree\"></rha-choice-tree>\n" +
    "  <pre>{{attachmentTree| json}}</pre>\n" +
    "</div>");
}]);

angular.module("security/login_form.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("security/login_form.html",
    "<div class=\"modal-header\" id=\"rha-login-modal-header\">\n" +
    "    <h5>\n" +
    "    Sign into the Red Hat Customer Portal\n" +
    "    </h5>\n" +
    "</div>\n" +
    "<div class=\"modal-body form-horizontal\" id=\"rha-login-modal-body\" >\n" +
    "    <form ng-submit=\"modalOptions.ok()\">\n" +
    "        <div class=\"alert alert-info\" ng-show=\"authError\">\n" +
    "            {{authError}}\n" +
    "        </div>\n" +
    "        <div class=\"form-group\" id=\"rha-login-modal-user-id\">\n" +
    "            <label for=\"rha-login-user-id\" class=\" control-label\">User ID</label>\n" +
    "            <div >\n" +
    "                <input type=\"text\" class=\"form-control\" id=\"rha-login-user-id\" placeholder=\"User ID\" ng-model=\"user.user\" required autofocus >\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"form-group\" id=\"rha-login-modal-user-pass\">\n" +
    "            <label for=\"rha-login-password\" class=\"control-label\">Password</label>\n" +
    "            <div >\n" +
    "                <input type=\"password\" class=\"form-control\" id=\"rha-login-password\" placeholder=\"Password\" ng-model=\"user.password\" required>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"form-group\" id=\"rha-login-modal-buttons\">\n" +
    "            <div>\n" +
    "                <button class=\"btn btn-primary btn-md login\" ng-click=\"modalOptions.ok()\" type=\"submit\">Sign in</button> <button class=\"btn btn-primary btn-md cancel\" ng-click=\"modalOptions.close()\" type=\"submit\">Cancel</button>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </form>\n" +
    "</div>");
}]);

angular.module("security/login_status.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("security/login_status.html",
    "<div ng-controller = 'SecurityController'>\n" +
    "<span ng-show=\"isLoggedIn\" class=\"pull-right\"> Logged into the Red Hat Customer Portal as {{loggedInUser}} &nbsp;|&nbsp;\n" +
    "  <a href=\"\" ng-click=\"logout()\"> Log out</a>\n" +
    "</span>\n" +
    "<span ng-show=\"!isLoggedIn\" class=\"pull-right\"> Not Logged in &nbsp;|&nbsp;\n" +
    "	<a href=\"\" ng-click=\"login()\"> Log In</a>\n" +
    "</span>\n" +
    "</div>\n" +
    "");
}]);

angular.module("search/views/accordion_search.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/accordion_search.html",
    "<div class=\"container-fluid side-padding\">\n" +
    "    <div x-rha-login-status style=\"padding: 10px;\" />\n" +
    "    <div class=\"bottom-border\" style=\"padding-top: 10px;\"></div>\n" +
    "    <div class=\"row\" x-rha-search-form ng-controller='SearchController'></div>\n" +
    "    <div style=\"padding-top: 10px;\"></div>\n" +
    "    <div class='row'>\n" +
    "    	<div class=\"container\" x-rha-accordion-search-results='' ng-controller='SearchController' />\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("search/views/accordion_search_results.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/accordion_search_results.html",
    "<div class=\"row\">\n" +
    "    <div class=\"col-xs-12\">\n" +
    "        <div style=\"padding-bottom: 0\" class=\"bottom-border\">\n" +
    "            <span>\n" +
    "                <h4 style=\"padding-left: 10px; display: inline-block;\">Recommendations</h4>\n" +
    "            </span>\n" +
    "            <span ng-show=\"searchInProgress.value\" class=\"rha-search-spinner\">\n" +
    "                &nbsp;\n" +
    "            </span>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "<div class=\"row \">\n" +
    "    <accordion>\n" +
    "        <accordion-group is-open=\"isopen\" ng-repeat=\"result in results\">\n" +
    "            <accordion-heading>\n" +
    "                <span class=\"pull-right glyphicon\" ng-class=\"{'glyphicon-chevron-down': isopen, 'glyphicon-chevron-right': !isopen}\"></span>\n" +
    "                <span>{{result.title}}</span>\n" +
    "            </accordion-heading>\n" +
    "            <x-rha-result-detail-display result='result' />\n" +
    "        </accordion-group>\n" +
    "    </accordion>\n" +
    "</div>");
}]);

angular.module("search/views/list_search_results.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/list_search_results.html",
    "<div class=\"col-sm-4\">\n" +
    "    <div class=\"alert alert-info\" ng-show=\"searchResultInfo.msg\">\n" +
    "        <a class=\"close\" ng-click=\"searchResultInfo.msg=null\">×</a>\n" +
    "        {{searchResultInfo.msg}}\n" +
    "    </div>\n" +
    "    <div class=\"panel panel-default\" ng-show='results.length > 0'>\n" +
    "        <!--pagination on-select-page=\"pageChanged(page)\" total-items=\"totalItems\" page=\"currentPage\" max-size=\"maxSize\"></pagination-->\n" +
    "\n" +
    "        <div class=\"panel-heading\">\n" +
    "            <h4 class=\"panel-title\">\n" +
    "                Recommendations\n" +
    "            </h4>\n" +
    "        </div>\n" +
    "        <div id='solutions' class=\"list-group\">\n" +
    "            <a href=\"\" ng-click=\"solutionSelected($index)\" class='list-group-item' ng-class=\"{'active': selectedSolution.index===$index}\" ng-repeat=\"result in results\" style=\"word-wrap: break-word;\"> {{ result.title }}</a>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "<div class=\"col-sm-8\">\n" +
    "    <div class=\"alert alert-info\" ng-show='selectedSolution.index === -1 && results.length > 0' >\n" +
    "        Please select a recommendation to view.\n" +
    "    </div>\n" +
    "    <x-rha-result-detail-display result='selectedSolution.data' />\n" +
    "</div>");
}]);

angular.module("search/views/resultDetail.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/resultDetail.html",
    "<div class='panel' style='border:0' ng-model=\"result\" >\n" +
    "	<div ng-if=\"isSolution()\">\n" +
    "		<h3>Environment</h3>\n" +
    "		<div ng-bind-html='result.environment.html'></div>\n" +
    "		<h3>Issue</h3>\n" +
    "		<div ng-bind-html='result.issue.html'></div>\n" +
    "		<h3 ng-if=\"getSolutionResolution() !== ''\" >Resolution</h3>\n" +
    "		<div ng-bind-html='getSolutionResolution()'></div>\n" +
    "	</div>\n" +
    "	<div ng-if=\"isArticle()\">\n" +
    "		<div ng-bind-html='getArticleHtml()'></div>\n" +
    "	</div>\n" +
    "</div>\n" +
    "\n" +
    "");
}]);

angular.module("search/views/search.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/search.html",
    "<x-rha-standard-search/>\n" +
    "");
}]);

angular.module("search/views/search_form.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/search_form.html",
    "<div class='container col-sm-4 pull-left'>\n" +
    "    <form role=\"form\" id=\"rh-search\">\n" +
    "        <div ng-class=\"{'col-sm-8': searchInProgress.value}\">\n" +
    "            <div class=\"input-group\">\n" +
    "                <input type=\"text\" class=\"form-control\" id=\"rhSearchStr\" name=\"searchString\" ng-model=\"searchStr\" class=\"input-xxlarge\" placeholder=\"Search Articles and Solutions\">\n" +
    "                <span class=\"input-group-btn\">\n" +
    "                    <button ng-disabled=\"searchInProgress.value === true\" class=\"btn btn-default btn-primary\" type='submit' ng-click=\"search(searchStr)\">Search</button>\n" +
    "                </span>\n" +
    "\n" +
    "            </div>\n" +
    "        </div>\n" +
    "        <div class=\"col-sm-4 \" ng-show=\"searchInProgress.value\">\n" +
    "            <span class=\"rha-search-spinner\">\n" +
    "                &nbsp;\n" +
    "            </span>\n" +
    "        </div>\n" +
    "\n" +
    "    </form>\n" +
    "</div>");
}]);

angular.module("search/views/standard_search.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/standard_search.html",
    "<div class=\"container-fluid side-padding\" ng-controller='SearchController'>\n" +
    "    <!--div class=\"row\">\n" +
    "		<div class=\"col-xs-12\">\n" +
    "			<h3>Red Hat Access: Search</h3>\n" +
    "		</div>\n" +
    "	</div-->\n" +
    "    <div x-rha-login-status style=\"padding: 10px;\" />\n" +
    "    <div class=\"bottom-border\" style=\"padding-top: 10px;\"></div>\n" +
    "    <div class=\"row\" x-rha-search-form ></div>\n" +
    "    <div style=\"padding-top: 10px;\"></div>\n" +
    "    <div class='row' x-rha-list-search-results='' ng-controller='SearchController' />\n" +
    "</div>");
}]);

angular.module("cases/views/attachLocalFile.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/attachLocalFile.html",
    "<div class=\"container-fluid\"><div class=\"row create-field\"><div class=\"col-xs-6\"><button style=\"float: left;\" ng-click=\"getFile()\" class=\"btn\">Attach local file</button><div style=\"height: 0px; width:0px; overflow:hidden;\"><input id=\"fileUploader\" type=\"file\" value=\"upload\" rha-on-change=\"selectFile\" ng-model=\"file\"/></div></div><div class=\"col-xs-6\"><div style=\"float: left; word-wrap: break-word; width: 100%;\">{{fileName}}</div></div></div><div class=\"row create-field\"><div style=\"font-size: 80%;\" class=\"col-xs-12\"><span>File names must be less than 80 characters. Maximum file size for web-uploaded attachments is 250 MB. Please FTP larger files to dropbox.redhat.com.&nbsp;</span><span><a href=\"https://access.devgssci.devlab.phx1.redhat.com/knowledge/solutions/2112\">(More info)</a></span></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><input style=\"float: left;\" placeholder=\"File description\" ng-model=\"fileDescription\" class=\"form-control\"/></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><button ng-disabled=\"fileName == NO_FILE_CHOSEN\" style=\"float: right;\" ng-click=\"addFile(fileUploaderForm)\" class=\"btn\">Add</button></div></div></div>");
}]);

angular.module("cases/views/attachProductLogs.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/attachProductLogs.html",
    "<div class=\"container-fluid\"><div class=\"row create-field\"><div class=\"col-xs-12\"><div style=\"padding-bottom: 4px;\">Attach Foreman logs:</div><select multiple=\"multiple\" class=\"form-control\"><option>Log1</option><option>Log2</option><option>Log3</option><option>Log4</option><option>Log5</option><option>Log6</option></select></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><button ng-disabled=\"true\" style=\"float: right;\" class=\"btn\">Add</button></div></div></div>");
}]);

angular.module("cases/views/attachmentsSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/attachmentsSection.html",
    "<h4 class=\"section-header\">Attachments</h4><div class=\"container-fluid side-padding\"><div class=\"row side-padding\"><div class=\"col-xs-12 col-no-padding\"><rha-list-attachments></rha-list-attachments></div></div><div class=\"row\"><div class=\"col-xs-12\"><rha-attach-local-file></rha-attach-local-file></div></div><div class=\"row\"><div class=\"col-xs-12\"><div class=\"server-attach-header\">Server File(s) To Attach:</div><rha-choice-tree ng-model=\"attachmentTree\" ng-controller=\"BackEndAttachmentsCtrl\"></rha-choice-tree></div></div><div class=\"row side-padding\"><div style=\"padding-bottom: 14px;\" class=\"col-xs-12 col-no-padding bottom-border\"><div style=\"float: right\"><div ng-show=\"updatingAttachments\">Updating Attachments...</div><button ng-hide=\"updatingAttachments\" ng-click=\"doUpdate()\" class=\"btn btn-primary\">Update Attachments</button></div></div></div></div>");
}]);

angular.module("cases/views/commentsSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/commentsSection.html",
    "<h4 class=\"section-header\">Case Discussion</h4><div class=\"container-fluid side-padding\"><div class=\"row create-field\"><div class=\"col-xs-12\"><textarea ng-disabled=\"addingComment\" rows=\"5\" ng-model=\"newComment\" style=\"max-width: 100%\" class=\"form-control\"></textarea></div></div><div style=\"margin-left: 0px; margin-right: 0px;\" class=\"row create-field\"><div class=\"col-xs-12 col-no-padding\"><div style=\"float: right;\"><div ng-hide=\"!addingComment\">Adding comment...</div><button ng-hide=\"addingComment\" ng-disabled=\"false\" ng-click=\"addComment()\" style=\"float: right;\" class=\"btn btn-primary\">Add Comment</button></div></div></div><div ng-hide=\"comments.length &lt;= 0 || comments === undefined\" style=\"border-top: 1px solid #dddddd;\"><div class=\"row\"><div class=\"col-xs-12\"><pagination style=\"float: right;\" boundary-links=\"true\" total-items=\"comments.length\" on-select-page=\"selectPage(page)\" items-per-page=\"itemsPerPage\" page=\"currentPage\" rotate=\"false\" max-size=\"maxPagerSize\" previous-text=\"&lt;\" next-text=\"&gt;\" first-text=\"&lt;&lt;\" last-text=\"&gt;&gt;\" class=\"pagination-sm\"></pagination></div></div><div ng-repeat=\"comment in commentsOnScreen\"><div style=\"padding-bottom: 10px;\" class=\"row\"><div class=\"col-md-2\"><div class=\"bold\">{{comment.created_by}}</div><div>{{comment.created_date | date:'mediumDate'}}</div><div>{{comment.created_date | date:'mediumTime'}}</div></div><div class=\"col-md-10\"><pre>{{comment.text}}</pre></div></div></div></div></div>");
}]);

angular.module("cases/views/compact.edit.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/compact.edit.html",
    "<!DOCTYPE html><div id=\"redhat-access-case\"><div ng-show=\"caseLoading\" class=\"container-fluid\"><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><div>Loading...</div></div></div></div><div ng-hide=\"caseLoading\" rha-resizable rha-dom-ready=\"domReady\" style=\"overflow: auto; padding-left: 15px;border-top: 1px solid #dddddd; border-left: 1px solid #dddddd;\" class=\"container-fluid\"><div style=\"margin-right: 0px; padding-top: 10px;\" class=\"row\"><div class=\"col-xs-12\"><rha-case-details compact=\"true\"></rha-case-details></div></div><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><rha-case-description></rha-case-description></div></div><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><rha-case-attachments></rha-case-attachments></div></div><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><rha-case-comments></rha-case-comments></div></div></div></div>");
}]);

angular.module("cases/views/compact.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/compact.html",
    "<!DOCTYPE html><div id=\"redhat-access-case\"><div ng-show=\"caseLoading\" class=\"container-fluid\"><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><div>Loading...</div></div></div></div><div ng-hide=\"caseLoading\" rha-resizable rha-dom-ready=\"domReady\" style=\"overflow: auto; padding-left: 15px;border-top: 1px solid #dddddd; border-left: 1px solid #dddddd;\" class=\"container-fluid\"><div style=\"margin-right: 0px; padding-top: 10px;\" class=\"row\"><div class=\"col-xs-12\"><rha-case-details compact=\"true\"></rha-case-details></div></div><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><rha-case-description></rha-case-description></div></div><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><rha-case-attachments></rha-case-attachments></div></div><div style=\"margin-right: 0px;\" class=\"row\"><div class=\"col-xs-12\"><rha-case-comments></rha-case-comments></div></div></div></div>");
}]);

angular.module("cases/views/compactCaseList.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/compactCaseList.html",
    "<div id=\"redhat-access-case\"><div class=\"container-fluid\"><div class=\"row\"><div class=\"col-xs-12 col-no-padding\"><rha-list-filter postfilter=\"filterCallback\" prefilter=\"onFilter\"></rha-list-filter></div></div><div class=\"row\"><div class=\"col-xs-12\"><div ng-show=\"CaseListService.cases.length == 0 &amp;&amp; !loadingCaseList\">No cases found with given filters.</div><div ng-show=\"loadingCaseList\">Loading...</div></div></div><div ng-hide=\"CaseListService.cases.length ==0 || loadingCaseList\" style=\"border-top: 1px solid #dddddd;\" class=\"row\"><div style=\"overflow: auto;\" rha-resizable=\"rha-resizable\" rha-dom-ready=\"domReady\" class=\"col-xs-12 col-no-padding\"><div style=\"margin-bottom: 0px; overflow: auto;\"><ul style=\"margin-bottom: 0px;\" class=\"list-group\"><a ng-repeat=\"case in CaseListService.cases\" ui-sref=\".edit({id: &quot;{{case.case_number}}&quot;})\" ng-class=\"{&quot;active&quot;: $index == selectedCaseIndex}\" ng-click=\"selectCase($index)\" class=\"list-group-item\">{{case.case_number}} {{case.summary}}</a></ul></div></div></div></div></div>");
}]);

angular.module("cases/views/descriptionSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/descriptionSection.html",
    "<h4 class=\"section-header\">Description</h4><div class=\"container-fluid side-padding\"><div class=\"row\"><div class=\"col-md-2\"><strong>{{CaseService.case.created_by}}</strong></div><div class=\"col-md-10\">{{CaseService.case.description}}</div></div></div>");
}]);

angular.module("cases/views/detailsSection.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/detailsSection.html",
    "<form name=\"caseDetails\"><div style=\"padding-bottom: 10px;\"><div><h3 style=\"margin-top: 0px;\">Case {{CaseService.case.case_number}}</h3></div><input style=\"width: 100%; display: inline-block;\" ng-model=\"CaseService.case.summary\" name=\"summary\" class=\"form-control\"/><span ng-show=\"caseDetails.summary.$dirty\" style=\"display: inline-block;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></div><div class=\"container-fluid side-padding\"><div id=\"rha-case-details\" class=\"row\"><h4 class=\"col-xs-12 section-header\">Details</h4><div class=\"container-fluid side-padding\"><div class=\"row\"><div class=\"col-md-4\"><table class=\"table details-table\"><tr ng-hide=\"compact\"><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Case Type:</div><span ng-show=\"caseDetails.type.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div><progressbar ng-hide=\"caseTypes !== undefined\" max=\"1\" value=\"1\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select ng-hide=\"caseTypes === undefined\" name=\"type\" style=\"width: 100%;\" ng-model=\"CaseService.case.type\" ng-options=\"c.name for c in caseTypes track by c.name\" class=\"form-control\"></select></div></td></tr><tr><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Severity:</div><span ng-show=\"caseDetails.severity.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div><progressbar ng-hide=\"severities !== undefined\" max=\"1\" value=\"1\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select ng-hide=\"severities === undefined\" name=\"severity\" style=\"width: 100%;\" ng-model=\"CaseService.case.severity\" ng-options=\"s.name for s in severities track by s.name\" class=\"form-control\"></select></div></td></tr><tr><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Status:</div><span ng-show=\"caseDetails.status.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div><progressbar ng-hide=\"statuses !== undefined\" max=\"1\" value=\"1\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select ng-hide=\"statuses === undefined\" name=\"status\" style=\"width: 100%;\" ng-model=\"CaseService.case.status\" ng-options=\"s.name for s in statuses track by s.name\" class=\"form-control\"></select></div></td></tr><tr ng-hide=\"compact\"><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Alternate ID:</div><span ng-show=\"caseDetails.alternate_id.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><input style=\"width: 100%\" ng-model=\"CaseService.case.alternate_id\" name=\"alternate_id\" class=\"form-control\"/></td></tr></table></div><div class=\"col-md-4\"><table class=\"table details-table\"><tr><th><div style=\"vertical-align: 50%; display: inline-block;\">Product:</div><span ng-show=\"caseDetails.product.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div><progressbar ng-hide=\"products !== undefined\" max=\"1\" value=\"1\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select ng-hide=\"products === undefined\" name=\"product\" style=\"width: 100%;\" ng-model=\"CaseService.case.product\" ng-change=\"getProductVersions()\" ng-options=\"s.name for s in products track by s.name\" required=\"required\" class=\"form-control\"></select></div></td></tr><tr><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Product Version:</div><span ng-show=\"caseDetails.version.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div><progressbar ng-hide=\"CaseService.versions.length !== 0 || CaseService.case.product.name == null\" max=\"1\" value=\"1\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select ng-hide=\"CaseService.versions.length === 0\" name=\"version\" style=\"width: 100%;\" ng-options=\"v for v in CaseService.versions track by v\" ng-model=\"CaseService.case.version\" required=\"required\" class=\"form-control\"></select></div></td></tr><tr ng-hide=\"compact\"><th class=\"details-table-header\">Support Level:</th><td>{{CaseService.case.entitlement.sla}}</td></tr><tr ng-hide=\"compact\"><th class=\"details-table-header\">Owner:</th><td>{{CaseService.case.contact_name}}</td></tr><tr ng-hide=\"compact\"><th class=\"details-table-header\">Red Hat Owner:</th><td>{{CaseService.case.owner}}</td></tr></table></div><div class=\"col-md-4\"><table class=\"table details-table\"><tr ng-hide=\"compact\"><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Group:</div><span ng-show=\"caseDetails.group.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><div><progressbar ng-hide=\"groups !== undefined\" max=\"1\" value=\"1\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select ng-hide=\"groups === undefined\" name=\"group\" style=\"width: 100%;\" ng-options=\"g.name for g in groups track by g.number\" ng-model=\"CaseService.case.group\" class=\"form-control\"></select></div></td></tr><tr ng-hide=\"compact\"><th class=\"details-table-header\">Opened:</th><td><div>{{CaseService.case.created_date | date:'medium'}}</div><div>{{CaseService.case.created_by}}</div></td></tr><tr ng-hide=\"compact\"><th class=\"details-table-header\">Last Updated:</th><td><div>{{CaseService.case.last_modified_date | date:'medium'}}</div><div>{{CaseService.case.last_modified_by}}</div></td></tr><tr ng-hide=\"compact\"><th class=\"details-table-header\">Account Number:</th><td>{{CaseService.case.account_number}}</td></tr><tr ng-hide=\"compact\"><th class=\"details-table-header\">Account Name:</th><td>{{CaseService.account.name}}</td></tr></table></div></div><div style=\"padding-top: 10px;\" class=\"row\"><div class=\"col-xs-12\"><div style=\"float: right;\"><button name=\"updateButton\" ng-disabled=\"!caseDetails.$dirty\" ng-hide=\"updatingDetails\" ng-click=\"updateCase()\" class=\"btn btn-primary\">Update Details</button><div ng-show=\"updatingDetails\">Updating Case...</div></div></div></div></div></div></div></form>");
}]);

angular.module("cases/views/edit.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/edit.html",
    "<!DOCTYPE html><div id=\"redhat-access-case\" class=\"container-offset\"><rha-page-header></rha-page-header><div class=\"container-fluid side-padding\"><div class=\"row\"><div ng-hide=\"caseLoading\" class=\"col-xs-12\"><rha-case-details compact=\"false\"></rha-case-details></div><div ng-show=\"caseLoading\" class=\"col-xs-12\"><div>Loading Details...</div></div></div><div class=\"row\"><div ng-hide=\"caseLoading\" class=\"col-xs-12\"><rha-case-description></rha-case-description></div></div><div class=\"row\"><div ng-hide=\"attachmentsLoading\" class=\"col-xs-12\"><rha-case-attachments></rha-case-attachments></div><div ng-show=\"attachmentsLoading\" class=\"col-xs-12\"><div>Loading Attachments...</div></div></div><div ng-controller=\"Recommendations\" class=\"row\"><div class=\"col-xs-12\"><h4 class=\"section-header\">Recommendations</h4><div class=\"container-fluid side-padding\"><div class=\"row\"><div ng-repeat=\"recommendation in recommendationsOnScreen\"><div class=\"col-xs-3\"><div class=\"bold\">{{recommendation.title}}</div><div style=\"padding: 8px 0;\">{{recommendation.solution_abstract}}</div><a href=\"{{recommendation.resource_view_uri}}\" target=\"_blank\">View full article in new window</a></div></div></div><div class=\"row\"><div class=\"col-xs-12\"><pagination boundary-links=\"true\" total-items=\"recommendations.length\" on-select-page=\"selectPage(page)\" items-per-page=\"itemsPerPage\" page=\"currentPage\" max-size=\"maxSize\" previous-text=\"&lt;\" next-text=\"&gt;\" first-text=\"&lt;&lt;\" last-text=\"&gt;&gt;\" class=\"pagination-sm\"></pagination></div></div></div></div></div><div class=\"row\"><div class=\"col-xs-12\"><rha-case-comments></rha-case-comments></div></div></div></div>");
}]);

angular.module("cases/views/list.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/list.html",
    "<div id=\"redhat-access-case\" class=\"container-offset\"><rha-page-header></rha-page-header><rha-list-filter prefilter=\"preFilter\" postfilter=\"postFilter\"></rha-list-filter><div style=\"margin-left: 10px; margin-right: 10px;\" class=\"bottom-border\"></div><div class=\"container-fluid side-padding\"><div class=\"row\"><div class=\"col-xs-12\"><div ng-show=\"CaseListService.cases.length == 0 &amp;&amp; !loadingCases\">No cases found with given filters.</div><div ng-show=\"loadingCases\">Loading...</div><div ng-hide=\"CaseListService.cases.length == 0 || loadingCases\"><table ng-table=\"tableParams\" style=\"text-align: center\" class=\"table table-bordered table-striped\"><tr ng-repeat=\"case in $data\"><td data-title=\"&quot;Case ID&quot;\" sortable=\"&quot;case_number&quot;\" style=\"width: 10%\"><a href=\"#/case/{{case.case_number}}\">{{case.case_number}}</a></td><td data-title=\"&quot;Summary&quot;\" sortable=\"&quot;summary&quot;\" style=\"width: 15%\">{{case.summary}}</td><td data-title=\"&quot;Product/Version&quot;\" sortable=\"&quot;product&quot;\">{{case.product}} / {{case.version}}</td><td data-title=\"&quot;Status&quot;\" sortable=\"&quot;status&quot;\">{{case.status}}</td><td data-title=\"&quot;Severity&quot;\" sortable=\"&quot;severity&quot;\">{{case.severity}}</td><td data-title=\"&quot;Owner&quot;\" sortable=\"&quot;owner&quot;\">{{case.owner}}</td><td data-title=\"&quot;Opened&quot;\" sortable=\"&quot;created_date&quot;\" style=\"width: 10%\">{{case.created_date | date:'medium'}}</td><td data-title=\"&quot;Updated&quot;\" sortable=\"&quot;last_modified_date&quot;\" style=\"width: 10%\">{{case.last_modified_date | date:'medium'}}</td></tr></table></div></div></div></div></div>");
}]);

angular.module("cases/views/listAttachments.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/listAttachments.html",
    "<div ng-show=\"AttachmentsService.updatedAttachments.length == 0\">No attachments added</div><table ng-show=\"AttachmentsService.updatedAttachments.length &gt; 0\" class=\"table table-hover table-bordered\"><thead><th>Filename</th><th>Description</th><th>Size</th><th>Attached</th><th>Attached By</th><th>Delete</th></thead><tbody><tr ng-repeat=\"attachment in AttachmentsService.updatedAttachments\"><td><a ng-hide=\"attachment.uri == null\" href=\"{{attachment.uri}}\">{{attachment.file_name}}</a><div ng-show=\"attachment.uri == null\">{{attachment.file_name}}</div></td><td>{{attachment.description}}</td><td>{{attachment.length | bytes}}</td><td>{{attachment.created_date | date:'medium'}}</td><td>{{attachment.created_by}}</td><td><a ng-click=\"AttachmentsService.removeAttachment($index)\">Delete</a></td></tr></tbody></table>");
}]);

angular.module("cases/views/listFilter.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/listFilter.html",
    "<div class=\"container-fluid side-padding\"><div class=\"row\"><div style=\"padding-bottom: 14px;\" class=\"col-lg-4\"><input placeholder=\"Search\" ng-model=\"keyword\" ng-keypress=\"onFilterKeyPress($event)\" class=\"form-control\"/></div><div style=\"padding-bottom: 14px;\" class=\"col-lg-4\"><!--label(for='rha-case-group-filter', style='padding-right: 4px; font-weight: normal;') Group:--><select id=\"rha-case-group-filter\" style=\"display: inline-block;\" ng-model=\"group\" ng-change=\"doFilter()\" ng-options=\"g.name for g in groups track by g.number\" class=\"form-control\"><option value=\"\">All Groups</option></select></div><div style=\"padding-bottom: 14px;\" class=\"col-lg-4\"><select ng-model=\"statusFilter\" ng-change=\"doFilter()\" class=\"form-control\"><option value=\"both\" selected=\"selected\">Open and Closed</option><option value=\"open\">Open</option><option value=\"closed\">Closed</option></select></div></div></div>");
}]);

angular.module("cases/views/new.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/new.html",
    "<!DOCTYPE html><div class=\"container-offset\"><div id=\"redhat-access-case\" class=\"container-fluid\"><rha-page-header></rha-page-header><div class=\"row\"><div style=\"border-right: 1px solid; border-color: #cccccc;\" class=\"col-xs-6\"><div class=\"container-fluid side-padding\"><div ng-class=\"{&quot;hidden&quot;: isPage2}\" id=\"rha-case-wizard-page-1\" class=\"create-case-section\"><div class=\"row create-field\"><div class=\"col-md-4\"><div>Product:</div></div><div class=\"col-md-8\"><progressbar ng-hide=\"!productsLoading\" max=\"1\" value=\"1\" animate=\"false\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select ng-hide=\"productsLoading\" style=\"width: 100%;\" ng-model=\"product\" ng-change=\"getProductVersions(product)\" ng-options=\"p.name for p in products track by p.code\" ng-blur=\"getRecommendations()\" class=\"form-control\"></select></div></div><div class=\"row create-field\"><div class=\"col-md-4\"><div>Product Version:</div></div><div class=\"col-md-8\"><div><progressbar ng-hide=\"!versionLoading\" max=\"1\" value=\"1\" animate=\"false\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select style=\"width: 100%;\" ng-model=\"version\" ng-options=\"v for v in versions\" ng-change=\"validateForm()\" ng-disabled=\"versionDisabled\" ng-hide=\"versionLoading\" ng-blur=\"getRecommendations()\" class=\"form-control\"></select></div></div></div><div class=\"row create-field\"><div class=\"col-md-4\"><div>Summary:</div></div><div class=\"col-md-8\"><input id=\"rha-case-summary\" style=\"width: 100%;\" ng-change=\"validateForm()\" ng-model=\"summary\" ng-blur=\"getRecommendations()\" class=\"form-control\"></div></div><div class=\"row create-field\"><div class=\"col-md-4\"><div>Description:</div></div><div class=\"col-md-8\"><textarea style=\"width: 100%; height: 200px;\" ng-model=\"description\" ng-change=\"validateForm()\" ng-blur=\"getRecommendations()\" class=\"form-control\"></textarea></div></div><div class=\"row\"><div ng-class=\"{&quot;hidden&quot;: isPage2}\" class=\"col-xs-12\"><button style=\"float: right\" ng-click=\"doNext()\" ng-disabled=\"incomplete\" class=\"btn btn-primary\">Next</button></div></div></div><div ng-class=\"{&quot;hidden&quot;: isPage1}\" id=\"rha-case-wizard-page-1\" class=\"create-case-section\"><div class=\"bottom-border\"><div class=\"row\"><div class=\"col-xs-12\"><div style=\"margin-bottom: 10px;\" class=\"bold\">{{product.name}} {{version}}</div></div></div><div class=\"row\"><div class=\"col-xs-12\"><div style=\"font-size: 90%; margin-bottom: 4px;\" class=\"bold\">{{summary}}</div></div></div><div class=\"row\"><div class=\"col-xs-12\"><div style=\"font-size: 85%\">{{description}}</div></div></div></div><div class=\"row create-field\"><div class=\"col-md-4\">Severity:</div><div class=\"col-md-8\"><progressbar ng-hide=\"!severitiesLoading\" max=\"1\" value=\"1\" animate=\"false\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select ng-hide=\"severitiesLoading\" style=\"width: 100%;\" ng-model=\"severity\" ng-change=\"validatePage2()\" ng-options=\"s.name for s in severities track by s.name\" class=\"form-control\"></select></div></div><div class=\"row create-field\"><div class=\"col-md-4\">Case Group:</div><div class=\"col-md-8\"><progressbar ng-hide=\"!groupsLoading\" max=\"1\" value=\"1\" animate=\"false\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select ng-hide=\"groupsLoading\" style=\"width: 100%;\" ng-model=\"caseGroup\" ng-change=\"validatePage2()\" ng-options=\"g.name for g in groups track by g.number\" class=\"form-control\"></select></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><div>Attachments:</div></div></div><div class=\"bottom-border\"><div style=\"overflow: auto\" class=\"row create-field\"><div class=\"col-xs-12\"><rha-list-attachments></rha-list-attachments></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><rha-attach-local-file></rha-attach-local-file></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><div class=\"server-attach-header\">Server File(s) To Attach:<rha-choice-tree ng-model=\"attachmentTree\" ng-controller=\"BackEndAttachmentsCtrl\"></rha-choice-tree></div></div></div></div><div style=\"margin-top: 20px;\" class=\"row\"><div class=\"col-xs-6\"><button style=\"float: left\" ng-click=\"doPrevious()\" class=\"btn btn-primary\">Previous</button></div><div class=\"col-xs-6\"><button style=\"float: right\" ng-disabled=\"submittingCase\" ng-click=\"doSubmit()\" class=\"btn btn-primary\">Submit</button></div></div></div></div></div><div class=\"col-xs-6\"><div style=\"padding-right: 15px;\" class=\"container-fluid\"><div class=\"row\"><div class=\"col-xs-12\"><div x-rha-accordion-search-results ng-controller=\"SearchController\" style=\"padding: 0 15px;\"></div></div></div></div></div></div></div></div>");
}]);

angular.module("cases/views/pageHeader.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/pageHeader.html",
    "<div class=\"container-fluid\"><div class=\"row\"><div class=\"col-xs-12\"><div x-rha-login-status=\"x-rha-login-status\"></div></div></div></div><div class=\"bottom-border\"></div>");
}]);

angular.module("log_viewer/views/log_viewer.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("log_viewer/views/log_viewer.html",
    "<div id=\"log_view_main\" style=\"max-height: 500px;\" >\n" +
    "	<div x-rha-login-status style=\"padding: 10px;\"></div>\n" +
    "	<div class=\"bottom-border\" style=\"padding-top: 10px;\"></div>\n" +
    "	<div class=\"row-fluid\">\n" +
    "		<div class=\"nav-side-bar col-xs-3\" ng-class=\"{ showMe: sidePaneToggle }\" fill-down ng-style=\"{height: windowHeight }\">\n" +
    "			<div class=\"hideable-side-bar\" ng-class=\"{ showMe: sidePaneToggle }\">\n" +
    "				<div class=\"btn-group\" ng-class=\"{ hideMe: hideDropdown}\" ng-controller=\"DropdownCtrl\" ng-init=\"init()\">\n" +
    "					<button type=\"button\" class=\"dropdown-toggle btn btn-sm btn-primary\"\n" +
    "					data-toggle=\"dropdown\">\n" +
    "					{{machinesDropdownText}} <span class=\"caret\"></span>\n" +
    "					</button>\n" +
    "					<ul class=\"dropdown-menu\">\n" +
    "						<li ng-repeat=\"choice in items\" ng-click=\"machineSelected()\"><a>{{choice}}</a></li>\n" +
    "					</ul>\n" +
    "				</div>\n" +
    "				<div id=\"fileList\" fill-down ng-style=\"{ height: windowHeight }\" class=\"fileList\" ng-controller=\"fileController\">\n" +
    "					<div data-angular-treeview=\"true\" data-tree-id=\"mytree\"\n" +
    "					data-tree-model=\"roleList\" data-node-id=\"roleId\"\n" +
    "					data-node-label=\"roleName\" data-node-children=\"children\">\n" +
    "					</div>\n" +
    "				</div>\n" +
    "				<button ng-disabled=\"retrieveFileButtonIsDisabled.check\" type=\"button\" class=\"pull-right btn btn-sm btn-primary\"\n" +
    "				ng-controller=\"selectFileButton\" ng-click=\"fileSelected()\">\n" +
    "				Select File</button>\n" +
    "			</div>\n" +
    "			<a ng-click=\"sidePaneToggle = !sidePaneToggle\"><span ng-class=\"{ showMe: sidePaneToggle }\"\n" +
    "								class=\"pull-right glyphicon glyphicon-chevron-left left-side-glyphicon\"></span></a>\n" +
    "		</div>\n" +
    "		<div class=col-fluid> \n" +
    "			<div class=\"col-xs-6 pull-right solutions\" fill-down ng-style=\"{height: windowHeight }\" ng-class=\"{ showMe: solutionsToggle }\">\n" +
    "				<div id=\"resizeable-solution-view\" fill-down class=\"resizeable-solution-view\" ng-class=\"{ showMe: solutionsToggle }\" ng-style=\"{height: windowHeight }\" \n" +
    "					x-rha-accordion-search-results='' ng-controller='SearchController' >\n" +
    "				</div>\n" +
    "				<a ng-click=\"solutionsToggle = !solutionsToggle\"><span ng-class=\"{ showMe: solutionsToggle }\"\n" +
    "							class=\"glyphicon glyphicon-chevron-left right-side-glyphicon\"></span></a>\n" +
    "			</div>\n" +
    "			<div class=\"col-fluid\">\n" +
    "				<div ng-controller=\"TabsDemoCtrl\" ng-class=\"{ showMe: solutionsToggle }\">\n" +
    "					<tabset > \n" +
    "						<tab ng-repeat=\"tab in tabs\"> \n" +
    "							<tab-heading>{{tab.shortTitle}}\n" +
    "								<a ng-click=\"removeTab($index)\" href=''> \n" +
    "									<span class=\"glyphicon glyphicon-remove\"></span>\n" +
    "								</a> \n" +
    "							</tab-heading>\n" +
    "							<div active=\"tab.active\" disabled=\"tab.disabled\">\n" +
    "								<div class=\"panel panel-default\" >\n" +
    "									<div class=\"panel-heading\">\n" +
    "										<a popover=\"Click to refresh log file.\" popover-trigger=\"mouseenter\" popover-placement=\"right\" ng-click=\"refreshTab($index)\">\n" +
    "											<span class=\"glyphicon glyphicon-refresh\"></span>\n" +
    "										</a>\n" +
    "										<h3 class=\"panel-title\" style=\"display: inline\">{{tab.longTitle}}</h3>\n" +
    "										<div class=\"pull-right\" id=\"overlay\" popover=\"Select text and click to perform Red Hat Diagnose\" popover-trigger=\"mouseenter\" popover-placement=\"left\" > \n" +
    "											<button ng-disabled=\"isDisabled\" id=\"diagnoseButton\" type=\"button\" class=\"btn btn-sm btn-primary diagnoseButton\" ng-click=\"diagnoseText()\">Red Hat Diagnose</button>\n" +
    "										</div>\n" +
    "										<br> \n" +
    "										<br>\n" +
    "									</div>\n" +
    "									<div  class=\"panel-body\" ng-mouseup=\"enableDiagnoseButton()\" fill-down ng-style=\"{ height: windowHeight }\">\n" +
    "										<pre id=\"resizeable-file-view\" class=\"no-line-wrap\">{{tab.content}}</pre>\n" +
    "									</div>\n" +
    "								</div>\n" +
    "							</div>\n" +
    "						</tab> \n" +
    "					</tabset>\n" +
    "				</div>\n" +
    "			</div>\n" +
    "		</div>\n" +
    "	</div>\n" +
    "</div>");
}]);
