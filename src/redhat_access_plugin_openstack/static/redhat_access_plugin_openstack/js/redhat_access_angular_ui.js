/*! redhat_access_angular_ui - v0.0.0 - 2014-04-07
 * Copyright (c) 2014 ;
 * Licensed 
 */
angular.module('RedhatAccess.security', ['ui.bootstrap', 'templates.app'])
    .constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    })
    .directive('loginStatus', function () {
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
                        //$scope.loggedInUser = securityService.getLoggedInUserName();
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
    .service('securityService', ['$modal',
        function ($modal) {

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
                                //console.log($scope.user);
                                strata.setCredentials($scope.user.user, $scope.user.password,
                                    function (passed, authedUser) {
                                        if (passed) {
                                            $scope.user.password = '';
                                            $scope.authError = null;
                                            $modalInstance.close(authedUser);
                                        } else {
                                            // alert("Login failed!");
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
	'templates.app',
	'RedhatAccess.security',
	'ui.bootstrap',
	'ngSanitize'
])
	.constant('RESOURCE_TYPES', {
		article: 'Article',
		solution: 'Solution',

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
		'SearchResultsService',
		function ($scope, SearchResultsService) {
			$scope.results = SearchResultsService.results;
			$scope.selectedSolution = SearchResultsService.currentSelection;
			//////////////////////
			$scope.totalItems = $scope.results.length;
			$scope.currentPage = 1;
			$scope.maxSize = 5;

			$scope.setPage = function (pageNo) {
				$scope.currentPage = pageNo;
			};

			//$scope.bigTotalItems = 175;
			//$scope.bigCurrentPage = 1;
			$scope.pageChanged = function (page) {
				$scope.currentPage = page;
				console.log("selected page is " + page);
				console.log("currentpage is " + $scope.currentPage);

				//$scope.watchPage = newPage;
			};
			///////////////////////////////////////////
			clearResults = function () {
				//SearchResultsService.setSelected({});
				SearchResultsService.clear();
			};


			// addResult = function(result) {
			// 	$scope.$apply(function() {
			// 		SearchResultsService.add(result);
			// 	});

			// };

			$scope.solutionSelected = function (index) {
				var response = $scope.results[index];
				SearchResultsService.setSelected(response);

			};

			$scope.search = function (searchStr, limit) {
				SearchResultsService.search(searchStr, limit);
				/*clearResults();
				strata.search($scope.searchStr,
					function(resourceType, response) {
						//console.log(response);
						response.resource_type = resourceType; //do this only for chained
						addResult(response);
					},
					onFailure,
					10,
					true
				);*/

			};

			$scope.$watch(function () {
					return SearchResultsService.currentSelection
				},
				function (newVal) {
					$scope.selectedSolution = newVal;
				}
			);
			// $scope.$watch(function () {
			// 		return SearchResultsService.results
			// 	},
			// 	function (newVal) {
			// 		console.log("set new result");
			// 		$scope.results = newVal;
			// 		$scope.totalItems = SearchResultsService.results.length;
			// 	}
			// );


		}
	])
	.directive('accordionSearchResults', function () {
		return {
			restrict: 'AE',
			scope: false,
			templateUrl: 'search/views/accordion_search_results.html'
		};
	})
	.directive('listSearchResults', function () {
		return {
			restrict: 'AE',
			scope: false,
			templateUrl: 'search/views/list_search_results.html'
		};
	})
	.directive('searchForm', function () {
		return {
			restrict: 'AE',
			scope: false,
			templateUrl: 'search/views/search_form.html'
		};
	})
	.directive('standardSearch', function () {
		return {
			restrict: 'AE',
			scope: false,
			templateUrl: 'search/views/standard_search.html'
		};
	})
	.directive('resultDetailDisplay', ['RESOURCE_TYPES',
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
	.factory('SearchResultsService', ['$rootScope', 'AUTH_EVENTS', 'RESOURCE_TYPES',

		function ($rootScope, AUTH_EVENTS, RESOURCE_TYPES) {
			var service = {
				results: [],
				currentSelection: {},
				add: function (result) {
					this.results.push(result);
				},
				clear: function () {
					this.results.length = 0;
					this.setSelected({});
				},
				setSelected: function (selection) {
					this.currentSelection = selection;
				},
				search: function (searchString, limit) {
					var that = this;
					if ((limit === undefined) || (limit < 1)) limit = 5;
					this.clear();
					strata.search(
						searchString,
						function (resourceType, response) {
							response.resource_type = resourceType;
							$rootScope.$apply(function () {
								that.add(response);
							});
						},
						function (error) {
							console.log("search failed");
						},
						limit,
						true
					);
				},
				searchSolutions: function (searchString, limit) {
					var that = this;
					if ((limit === undefined) || (limit < 1)) limit = 5;
					this.clear();
					strata.solutions.search(
						searchString,
						function (response) {
							//console.log(angular.toJson(response));
							$rootScope.$apply(function () {
								//console.log(angular.toJson(response));
								response.forEach(function (entry) {
									entry.resource_type = RESOURCE_TYPES.solution;
									that.add(entry);
									//console.log(angular.toJson(entry, true));
								});
							});
						},
						function (error) {
							console.log("search failed");
						},
						limit,
						false
					);
				},
				searchArticles: function (searchString, limit) {
					var that = this;
					if ((limit === undefined) || (limit < 1)) limit = 5;
					this.clear();
					strata.articles.search(
						searchString,
						function (response) {
							response.resource_type = RESOURCE_TYPES.article;
							$rootScope.$apply(function () {
								that.add(response);
							});
						},
						function (error) {
							console.log("search failed");
						},
						limit,
						true
					);
				},
				diagnose: function (searchString, limit) {
					var that = this;
					if ((limit === undefined) || (limit < 1)) limit = 5;
					this.clear();
					strata.diagnose(
						searchString,
						function (response) {
							//response.resource_type = resourceType;
							response.resource_type = RESOURCE_TYPES.solution;
							$rootScope.$apply(function () {
								that.add(response);
							});
						},
						function (error) {
							console.log("search failed");
						},
						limit,
						true
					);
				}



			};

			$rootScope.$on(AUTH_EVENTS.logoutSuccess, function () {
				service.clear.apply(service);
			});
			return service;
		}
	]);
angular.module('RedhatAccessCases', [
  'ui.router',
  'ui.bootstrap',
  'ngTable',
  'templates.app',
  'RedhatAccess.security'
])
.constant('STATUS', {
  open: 'open',
  closed: 'closed',
  both: 'both'
})
.config([
  '$stateProvider',
  function ($stateProvider) {
    $stateProvider.state('case', {
      url: '/case/{id:[0-9]{1,8}}',
      templateUrl: 'cases/views/details.html',
      controller: 'Details',
      resolve: {
        caseJSON: function(strataService, $stateParams) {
          return strataService.cases.get($stateParams.id);
        },
        accountJSON: function(strataService, caseJSON) {
          var accountNumber = caseJSON.account_number;

          if (angular.isString(accountNumber)) {
            return strataService.accounts.get(caseJSON.account_number);
          } else {
            return null;
          }
        },
        attachmentsJSON: function (strataService, $stateParams) {
          return strataService.cases.attachments.list($stateParams.id);
        },
        commentsJSON: function (strataService, $stateParams) {
          return strataService.cases.comments.get($stateParams.id);
        },
        caseTypesJSON: function (strataService) {
          return strataService.values.cases.types();
        },
        severitiesJSON: function (strataService) {
          return strataService.values.cases.severity();
        },
        groupsJSON: function(strataService) {
          return strataService.groups.list();
        },
        productsJSON: function(strataService) {
          return strataService.products.list();
        },
        statusesJSON: function (strataService) {
          return strataService.values.cases.status();
        }
      }
    });

    $stateProvider.state('new', {
      url: '/case/new',
      templateUrl: 'cases/views/new.html',
      controller: 'New',
      resolve: {
        productsJSON: function(strataService) {
          return strataService.products.list();
        },
        severityJSON: function (strataService) {
          return strataService.values.cases.severity();
        },
        groupsJSON: function(strataService) {
          return strataService.groups.list();
        }
      }
    });

    $stateProvider.state('list', {
      url: '/case/list',
      templateUrl: 'cases/views/list.html',
      controller: 'List',
      resolve: {
        casesJSON: function (strataService) {
          return strataService.cases.filter();
        },
        groupsJSON: function(strataService) {
          return strataService.groups.list();
        }
      }
    });
  }
])
.run([
  '$rootScope',
  'securityService',
  '$state',
  function (
    $rootScope,
    securityService,
    $state) {

    //TODO: find a better way to inject a loading message
    var showLoading = function() {
      if ($('#rha-loading').length === 0) {
        $('#rha-content').after('<h1 id="rha-loading" class="text-center">Loading...</h1>');
      }
      $('#rha-content').toggleClass('rha-hidden', true);
    };

    var hideLoading = function() {
      $('#rha-loading').remove();
      $('#rha-content').toggleClass('rha-hidden', false);
    };

    $rootScope.$on('$stateChangeSuccess',
      function(event, toState, toParams, fromState, fromParams) {
        hideLoading();
      }
    );

    $rootScope.$on('$stateChangeStart',
      function (event, toState, toParams, fromState, fromParams) {

        showLoading();

        if (!securityService.isLoggedIn) {
          event.preventDefault();

          strata.checkLogin(
            function (isLoggedIn, user) {

              if (!isLoggedIn) {
                securityService.login().then(
                  function (authedUser) {
                    if (authedUser) {
                      securityService.isLoggedIn = true;
                      $state.transitionTo(toState, toParams);
                    } else {
                      securityService.isLoggedIn = false;
                      console.log('Not logged in.');
                    }
                  });
              } else {
                securityService.isLoggedIn = true;
                $state.transitionTo(toState, toParams);
              }

            }
          );
        }
      }
    );

  }
]);
'use strict';

angular.module('RedhatAccessCases')
.controller('AttachLocalFile', [
  '$scope',
  'attachments',
  'securityService',
  function ($scope, attachments, securityService) {
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

      attachments.items.push({
        file_name: $scope.fileName,
        description: $scope.fileDescription,
        length: $scope.fileSize,
        created_by: securityService.loggedInUser, //TODO: use Lindani's login service to get username
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

angular.module('RedhatAccessCases')
.controller('Details', [
  '$scope',
  '$stateParams',
  '$filter',
  '$q',
  'attachments',
  'caseJSON',
  'attachmentsJSON',
  'accountJSON',
  'commentsJSON',
  'caseTypesJSON',
  'severitiesJSON',
  'groupsJSON',
  'productsJSON',
  'statusesJSON',
  function(
      $scope,
      $stateParams,
      $filter,
      $q,
      attachments,
      caseJSON,
      attachmentsJSON,
      accountJSON,
      commentsJSON,
      caseTypesJSON,
      severitiesJSON,
      groupsJSON,
      productsJSON,
      statusesJSON) {

    if (caseJSON) {
      $scope.details = {};
      $scope.details.caseId = $stateParams.id;
      $scope.details.summary = caseJSON.summary;
      $scope.details.description = caseJSON.description;
      $scope.details.type = {'name': caseJSON.type};
      $scope.details.severity = {'name': caseJSON.severity};
      $scope.details.status = {'name': caseJSON.status};
      $scope.details.alternate_id = caseJSON.alternate_id;
      $scope.details.product = {'name': caseJSON.product};
      $scope.details.sla = caseJSON.entitlement.sla;
      $scope.details.contact_name = caseJSON.contact_name;
      $scope.details.owner = caseJSON.owner;
      $scope.details.created_date = caseJSON.created_date;
      $scope.details.created_by = caseJSON.created_by;
      $scope.details.last_modified_date = caseJSON.last_modified_date;
      $scope.details.last_modified_by = caseJSON.last_modified_by;
      $scope.details.account_number = caseJSON.account_number;
      $scope.details.group = {'number': caseJSON.folder_number};

      if (accountJSON !== null) {
        $scope.details.account_name = accountJSON.name;
      }

      $scope.bugzillas = caseJSON.bugzillas;
      $scope.hasBugzillas = Object.getOwnPropertyNames($scope.bugzillas).length != 0;

      if (caseJSON.recommendations) {
        if (Object.getOwnPropertyNames(caseJSON.recommendations).length != 0) {
          $scope.recommendations = caseJSON.recommendations.recommendation;
        }
      }

      $scope.title = 'Case ' + $scope.details.caseId;
    }

    if (angular.isArray(attachmentsJSON)) {
      attachments.items = attachmentsJSON;
      $scope.attachments = attachmentsJSON;
    } else {
      attachments.items = [];
    }

    if (commentsJSON) {
      $scope.comments = commentsJSON;
    }

    if (caseTypesJSON) {
      $scope.caseTypes = caseTypesJSON;
    }

    if (severitiesJSON) {
      $scope.severities = severitiesJSON;
    }

    if (groupsJSON) {
      $scope.groups = groupsJSON;
    }

    if (productsJSON) {
      $scope.products = productsJSON;
    }

    if (statusesJSON) {
      $scope.statuses = statusesJSON;
    }

    $scope.originalAttachments = angular.copy(attachments.items);
    $scope.updatingAttachments = false;
    $scope.disableUpdateAttachmentsButton = false;
//
//    $scope.$watch('attachments', function(newValue, oldValue) {
//      if (!angular.equals($scope.originalAttachments, $scope.attachments)) {
//        $scope.disableUpdateAttachmentsButton = false;
//      } else {
//        $scope.disableUpdateAttachmentsButton = true;
//      }
//    });

    $scope.updateAttachments = function() {
      if (!angular.equals($scope.originalAttachments, attachments.items)) {
        var promises = [];

        //find new attachments
        for (var i in attachments.items) {
          if (!attachments.items[i].hasOwnProperty('uuid')) {
            var promise = attachments.post(
                attachments.items[i].file,
                $scope.details.caseId
            )

            promise.then(function(uri) {
              attachments.items[i].uri = uri;
            });

            promises.push(promise);
          }
        }

        //find removed attachments
        jQuery.grep($scope.originalAttachments, function(origAttachment) {
          var attachment =
              $filter('filter')(attachments.items, {'uuid': origAttachment.uuid});

          if (attachment.length == 0) {
            promises.push(
                attachments.delete(
                    origAttachment.uuid,
                    $scope.details.caseId
                )
            );
          }
        });

        $scope.updatingAttachments = true;
        var parentPromise = $q.all(promises);
        parentPromise.then(
            function() {
              $scope.originalAttachments = angular.copy(attachments.items);
              $scope.updatingAttachments = false;
            },
            function(error) {
              console.log("Problem creating attachments");
              console.log(error);
            }
        );
      }
    };

    $scope.updatingDetails = false;

    $scope.updateCase = function() {
      $scope.updatingDetails = true;

      var caseJSON = {
        'type': $scope.details.type.name,
        'severity': $scope.details.severity.name,
        'status': $scope.details.status.name,
        'alternateId': $scope.details.alternate_id,
//        'notes': $scope.details.notes,
        'product': $scope.details.product.name,
        'version': $scope.details.version,
        'summary': $scope.details.summary,
        'folderNumber': $scope.details.group.number
      };

      strata.cases.put(
          $scope.details.caseId,
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

    };

    $scope.newComment = '';
    $scope.addingComment = false;

    $scope.addComment = function() {
      $scope.addingComment = true;

      strata.cases.comments.post(
        $scope.details.caseId,
        {'text': $scope.newComment},
        function(response) {

          //refresh the comments list
          strata.cases.comments.get(
            $scope.details.caseId,
            function(comments) {
              $scope.newComment = '';
              $scope.comments = comments;
              $scope.addingComment = false;
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

    $scope.getProductVersions = function(product) {
      $scope.version = "";

      strata.products.versions(
          product.name,
          function(response){
            $scope.versions = response;
            $scope.$apply();
          },
          function(error){
            console.log(error);
          });
    };

    $scope.getProductVersions($scope.details.product);
    $scope.details.version = caseJSON.version;

  }]);


'use strict';

angular.module('RedhatAccessCases')
.controller('List', [
  '$scope',
  '$filter',
  'casesJSON',
  'groupsJSON',
  'ngTableParams',
  'STATUS',
  function ($scope, $filter, casesJSON, groupsJSON, ngTableParams, STATUS) {
    $scope.statusFilter = STATUS.open;

    $scope.cases = casesJSON;
    $scope.groups = groupsJSON;

    $scope.tableParams = new ngTableParams({
      page: 1,
      count: 10,
      sorting: {
        last_modified_date: 'desc'
      }
    }, {
      total: $scope.cases.length,
      getData: function($defer, params) {
        var orderedData = params.sorting() ?
            $filter('orderBy')($scope.cases, params.orderBy()) : $scope.cases;

        orderedData = $filter('filter')(orderedData, $scope.keyword);
        var pageData = orderedData.slice(
            (params.page() - 1) * params.count(), params.page() * params.count());

        $scope.tableParams.total(orderedData.length);
        $defer.resolve(pageData);
      }
    });

    var doCaseFilter = function(params) {
      strata.cases.filter(
          params,
          function(filteredCases) {
            if (filteredCases === undefined) {
              $scope.cases = [];
            } else {
              $scope.cases = filteredCases;
            }
            $scope.tableParams.reload();
          },
          function(error) {
            console.log(error);
          }
      );
    };

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

    $scope.doFilter = function() {
      var params = {
        include_closed: getIncludeClosed()
      };

      if ($scope.group !== undefined) {
        params.group_numbers = {
          group_number: [$scope.group.number]
        };
      }

      if ($scope.statusFilter === STATUS.closed) {
        params.status = STATUS.closed;
      }

      doCaseFilter(params);
    };

  }
]);

'use strict';

angular.module('RedhatAccessCases')
.controller('ListAttachments', [
  '$scope',
  'attachments',
  function ($scope, attachments) {

    $scope.attachments = attachments.items;

    $scope.removeAttachment = function() {
      attachments.items.splice(this.$index, 1);
    };
  }
]);

'use strict';

angular.module('RedhatAccessCases')
.controller('New', [
  '$scope',
  '$state',
  '$q',
  'SearchResultsService',
  'attachments',
  'productsJSON',
  'severityJSON',
  'groupsJSON',
  function ($scope, $state, $q, SearchResultsService, attachments, productsJSON, severityJSON, groupsJSON) {
    $scope.products = productsJSON;
    $scope.versions = [];
    $scope.versionDisabled = true;
    $scope.versionLoading = false;
    $scope.incomplete = true;
    $scope.severities = severityJSON;
    $scope.severity = severityJSON[severityJSON.length - 1];
    $scope.groups = groupsJSON;
    $scope.submitProgress = 0;
    attachments.clear();

    $scope.validateForm = function() {
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

    $scope.setCurrentData = function() {
      $scope.currentData = {
        product: $scope.product,
        version: $scope.version,
        summary: $scope.summary,
        description: $scope.description
      };
    };

    $scope.setCurrentData();

    $scope.getRecommendations = function() {

      var newData = {
        product: $scope.product,
        version: $scope.version,
        summary: $scope.summary,
        description: $scope.description
      };

      if (!angular.equals($scope.currentData, newData) && !$scope.loadingRecommendations) {
        $scope.loadingRecommendations = true;

        var data = {
          product: $scope.product,
          version: $scope.version,
          summary: $scope.summary,
          description: $scope.desecription
        };
        $scope.setCurrentData();

        var deferreds = [];

        strata.problems(
          data,
          function(solutions) {
            //retrieve details for each solution
            solutions.forEach(function (solution) {
              var deferred = $q.defer();
              deferreds.push(deferred.promise);

              strata.solutions.get(
                solution.uri,
                function(solution) {
                  deferred.resolve(solution);
                },
                function(error) {
                  deferred.resolve();
                });
            });

            $q.all(deferreds).then(
                function(solutions) {
                  SearchResultsService.clear();

                  solutions.forEach(function(solution) {
                    if (solution !== undefined) {
                      solution.resource_type = "Solution";
                      SearchResultsService.add(solution);
                    }
                  });
                  $scope.loadingRecommendations = false;
                },
                function(error) {
                  $scope.loadingRecommendations = false;
                }
            );
          },
          function(error) {
            $scope.loadingRecommendations = false;
            console.log(error);
          },
          5
        );
      }
    };

    /**
     * Retrieve product's versions from strata
     *
     * @param product
     */
    $scope.getProductVersions = function(product) {
      $scope.version = "";
      $scope.versionDisabled = true;
      $scope.versionLoading = true;

      strata.products.versions(
          product.code,
          function(response){
            $scope.versions = response;
            $scope.validateForm();
            $scope.versionDisabled = false;
            $scope.versionLoading = false;
            $scope.$apply();
          },
          function(error){
            console.log(error);
          });
    };

    /**
     * Go to a page in the wizard
     *
     * @param page
     */
    $scope.setPage = function(page) {
      $scope.isPage1 = page == 1 ? true : false;
      $scope.isPage2 = page == 2 ? true : false;
    };

    /**
     * Navigate forward in the wizard
     */
    $scope.doNext = function() {
      $scope.setPage(2);
    };

    /**
     * Navigate back in the wizard
     */
    $scope.doPrevious = function() {
      $scope.setPage(1);
    };

    /**
     * Return promise for a single attachment
     */
    var postAttachment = function(caseNumber, attachment, progressIncrement) {

      var singleAttachmentSuccess = function(response) {
        $scope.submitProgress = $scope.submitProgress + progressIncrement;
      };

      var deferred = $q.defer();
      deferred.promise.then(singleAttachmentSuccess);

      strata.cases.attachments.post(
          attachment,
          caseNumber,
          function(response) {
            deferred.resolve(response);
          },
          function(error, error2, error3, error4) {
            console.log(error);
            deferred.reject(error);
          }
      );

      return deferred.promise;
    };

    /**
     * Create the case with attachments
     */
    $scope.doSubmit = function() {

      $scope.submitProgress = 10;

      var caseJSON = {
        'product': $scope.product.code,
        'version': $scope.version,
        'summary': $scope.summary,
        'description': $scope.description,
        'severity': $scope.severity.name,
        'folderNumber': $scope.caseGroup == null ? '' : $scope.caseGroup.number
      };

      strata.cases.post(
          caseJSON,
          function(caseNumber) {
            if ($scope.attachments.length > 0) {
              var progressIncrement = 90 / $scope.attachments.length;

              var promises = [];
              for (var i in $scope.attachments) {
                promises.push(
                    postAttachment(
                        caseNumber,
                        $scope.attachments[i].file,
                        progressIncrement));
              }

              var parentPromise = $q.all(promises);
              parentPromise.then(
                function() {
                  $scope.submitProgress = '100';
                  $state.go('case', {id: caseNumber});
                },
                function(error) {
                  console.log("Problem creating attachment: " + error);
                }
              );
            } else {
              $scope.submitProgress = '100';
              $state.go('case', {id: caseNumber});
            }
          },
          function(error) {
            console.log(error);
          }
      );

    };

    $scope.setPage(1);
  }]);


'use strict';
/**
 * Child of Details controller
 **/

angular.module('RedhatAccessCases')
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

      console.log($scope.recommendations);
      console.log($scope.recommendationsOnScreen);
    };

    if ($scope.recommendations != null) {
      $scope.selectPage(1);
    }
  }]);


'use strict';

angular.module('RedhatAccessCases')
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

angular.module('RedhatAccessCases')
.directive('rhaAttachProductLogs', function () {
  return {
    templateUrl: 'cases/views/attachProductLogs.html',
    restrict: 'EA',
    link: function postLink(scope, element, attrs) {
    }
  };
});

'use strict';

angular.module('RedhatAccessCases')
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

angular.module('RedhatAccessCases')
.directive('rhaOnChange', function () {
  return {
    restrict: "A",
    link: function (scope, element, attrs) {
      element.bind('change', element.scope()[attrs.rhaOnChange]);
    }
  };
});
'use strict';

angular.module('RedhatAccessCases')
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

angular.module('RedhatAccessCases')
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

angular.module('RedhatAccessCases')
.factory('attachments', ['$q', function ($q) {
  return {
    items: [],
    clear: function() {
      this.items = [];
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
  };
}]);

'use strict';

angular.module('RedhatAccessCases')
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
      filter: function() {
        var deferred = $q.defer();

        strata.cases.filter(
            {},
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

 // var testURL = 'http://localhost:8080/LogCollector/';
// angular module
angular.module('RedhatAccess.logViewer',
		[ 'angularTreeview', 'ui.bootstrap', 'RedhatAccess.search'])

.config(function($urlRouterProvider) {
		}).config([ '$stateProvider', function($stateProvider) {
			$stateProvider.state('logviewer', {
				url : "/logviewer",
				templateUrl : 'log_viewer/views/log_viewer.html'
			})
		} ])

.factory('files', function() {
	var fileList = '';
	var selectedFile = '';
	var selectedHost = '';
	var file = '';
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
	$scope.updateSelected = function() {
		if ($scope.mytree.currentNode != null
				&& $scope.mytree.currentNode.fullPath != null) {
			files.setSelectedFile($scope.mytree.currentNode.fullPath);
			// files.setSelectedFile($scope.mytree.currentNode.roleName);
		}
	};
	$scope.$watch(function() {
		return files.fileList;
	}, function() {
		$scope.roleList = files.fileList;
	});
})
.controller('DropdownCtrl', function($scope, $http, $location, files) {
	$scope.blah = "Please Select the Machine";
	$scope.items = [];
	var sessionId = $location.search().sessionId;
	$scope.init = function() {
		$http({
			method : 'GET',
			url : 'GetMachineList?sessionId=' + encodeURIComponent(sessionId)
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
		$scope.blah = this.choice;
		$http(
				{
					method : 'GET',
					url : 'GetFileList?hostName=' + files.selectedHost
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
})
.controller('selectFileButton', function($scope, $http, $location,
		files) {
	$scope.fileSelected = function() {
		var sessionId = $location.search().sessionId;
		var userId = $location.search().userId;
		$scope.$parent.opens = !$scope.$parent.opens;
		$http(
				{
					method : 'GET',
					url : 'GetLogFile?sessionId='
							+ encodeURIComponent(sessionId) + '&userId='
							+ encodeURIComponent(userId) + '&filePath='
							+ files.selectedFile + '&hostName='
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
		'files',
		'accordian',
		'SearchResultsService',
		function($scope, files, accordian, SearchResultsService) {
			$scope.tabs = [ {
				shortTitle : "Short Sample Log File",
				longTitle : "Long Log File",
				content : "Sample Log Text"
			} ];

			$scope.$watch(function() {
				return files.file;
			}, function() {
				if (files.file != null && files.selectedFile != null) {
					file = new Object();
					file.longTitle = files.selectedHost + " : "
							+ files.selectedFile;
					var splitFileName = files.selectedFile.split("/");
					var fileName = splitFileName[splitFileName.length - 1];
					file.shortTitle = files.selectedHost + ":" + fileName;
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
				if (!$scope.$parent.open) {
					$scope.$parent.open = !$scope.$parent.open;
				}
				var text = "";
				if (window.getSelection) {
					text = window.getSelection().toString();
				} else if (document.selection
						&& document.selection.type != "Control") {
					text = document.selection.createRange().text;
				}
				if (text != "") {
					$scope.checked = !$scope.checked;
					SearchResultsService.diagnose(text, 5);
					// strata.diagnose(text, onSuccess = function(response) {
					// var group = new Object();
					// group.title = response.title;
					// group.content = response.issue.text;
					// accordian.addGroup(group);
					// $scope.$apply();
					// }, onFailure = function(response) {
					// // Iterate over the response array
					// // response.forEach(someHandler);
					// console.log(response);
					// }, 5);
				}
			};
		} ])

.controller('AccordionDemoCtrl', function($scope, accordian) {
	$scope.oneAtATime = true;
	$scope.groups = accordian.getGroups();
})
.directive('resizeableFileView', function($window) {
  return function($scope) {
    $scope.initializeWindowSize = function() {
      return $scope.windowHeight = $window.innerHeight - 225;
    };
    $scope.initializeWindowSize();
    return angular.element($window).bind('resize', function() {
      $scope.initializeWindowSize();
      return $scope.$apply();
    });
  };
})

.directive('resizeableSolutionView', function($window) {
  return function($scope) {
    $scope.initializeWindowSize = function() {
      return $scope.windowHeight = $window.innerHeight - 140;

    };
    $scope.initializeWindowSize();
    return angular.element($window).bind('resize', function() {
      $scope.initializeWindowSize();
      return $scope.$apply();
    });
  };
})

.directive('resizeableDemoLeftView', function($window) {
  return function($scope) {
    $scope.initializeWindowSize = function() {
      return $scope.windowHeight = $window.innerHeight - 35;

    };
    $scope.initializeWindowSize();
    return angular.element($window).bind('resize', function() {
      $scope.initializeWindowSize();
      return $scope.$apply();
    });
  };
});



angular.element(document).ready(function() {

	c = angular.element(document.querySelector('#controller-demo')).scope();
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
				var blah = new Object();
				blah.roleName = node;
				blah.roleId = node;
				if (splitPath.length == 1) {
					blah.fullPath = fullFilePath;
				}
				blah.children = new Array();
				tree.push(blah);
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
angular.module('templates.app', ['security/login_form.html', 'security/login_status.html', 'search/views/accordion_search.html', 'search/views/accordion_search_results.html', 'search/views/list_search_results.html', 'search/views/resultDetail.html', 'search/views/search.html', 'search/views/search_form.html', 'search/views/standard_search.html', 'cases/views/attachLocalFile.html', 'cases/views/attachProductLogs.html', 'cases/views/details.html', 'cases/views/list.html', 'cases/views/listAttachments.html', 'cases/views/new.html', 'cases/views/pageHeader.html', 'log_viewer/views/log_viewer.html']);

angular.module("security/login_form.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("security/login_form.html",
    "<div class=\"modal-header\" id=\"rha-login-modal-header\">\n" +
    "    <h5>\n" +
    "    Sign into the Red Hat Customer Portal\n" +
    "    </h5>\n" +
    "</div>\n" +
    "<div class=\"modal-body form-horizontal\" id=\"rha-login-modal-body\" role=\"form\">\n" +
    "    <div class=\"alert alert-error\" ng-show=\"authError\">\n" +
    "        {{authError}}\n" +
    "    </div>\n" +
    "    <div class=\"form-group\" id=\"rha-login-modal-user-id\">\n" +
    "        <label for=\"user-id\" class=\" control-label\">User ID</label>\n" +
    "        <div >\n" +
    "            <input type=\"text\" class=\"form-control\" id=\"user-id\" placeholder=\"User ID\" ng-model=\"user.user\" required autofocus >\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"form-group\" id=\"rha-login-modal-user-pass\">\n" +
    "        <label for=\"password\" class=\"control-label\">Password</label>\n" +
    "        <div >\n" +
    "            <input type=\"password\" class=\"form-control\" id=\"password\" placeholder=\"Password\" ng-model=\"user.password\" required>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "    <div class=\"form-group\" id=\"rha-login-modal-buttons\">\n" +
    "        <div>\n" +
    "            <button class=\"btn btn-primary btn-md login\" ng-click=\"modalOptions.ok()\">Sign in</button> <button class=\"btn btn-primary btn-md cancel\" ng-click=\"modalOptions.close()\" type=\"submit\">Cancel</button>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>");
}]);

angular.module("security/login_status.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("security/login_status.html",
    "<div ng-controller = 'SecurityController'>\n" +
    "<span ng-show=\"isLoggedIn\" class=\"pull-right\"> Logged into the customer portal as {{loggedInUser}} &nbsp;|&nbsp;\n" +
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
    "<div class ='row ' x-login-status/>\n" +
    "<div class=\"row panel panel-default\">\n" +
    "   <div class=\"panel-body\" x-search-form ng-controller='SearchController'>\n" +
    "   </div>\n" +
    "</div>\n" +
    "<div class='row' x-accordion-search-results='' ng-controller='SearchController'/>\n" +
    "");
}]);

angular.module("search/views/accordion_search_results.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/accordion_search_results.html",
    "<div class=\"row \" >\n" +
    "    <accordion > \n" +
    "      <accordion-group is-open=\"isopen\" ng-repeat=\"result in results\">\n" +
    "        <accordion-heading>\n" +
    "            {{result.title}}<i class=\"pull-right glyphicon\" ng-class=\"{'glyphicon-chevron-down': isopen, 'glyphicon-chevron-right': !isopen}\"></i>\n" +
    "        </accordion-heading>\n" +
    "        <x-result-detail-display result='result'/>\n" +
    "      </accordion-group>\n" +
    "    </accordion>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "\n" +
    "");
}]);

angular.module("search/views/list_search_results.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/list_search_results.html",
    "<div class=\"col-lg-4\">  \n" +
    "  <div class=\"panel panel-default\" ng-show='results.length > 0'>\n" +
    "    <!--pagination on-select-page=\"pageChanged(page)\" total-items=\"totalItems\" page=\"currentPage\" max-size=\"maxSize\"></pagination-->\n" +
    "    <div class=\"panel-heading\">\n" +
    "      <h3 class=\"panel-title\">\n" +
    "       Recommendations\n" +
    "     </h3>\n" +
    "   </div>\n" +
    "   <div id='solutions' class=\"panel-body list-group\">\n" +
    "    <div class='list-group-item '  ng-repeat=\"result in results\">\n" +
    "      <a href=\"\" ng-click=\"solutionSelected($index)\"> {{ result.title }}</a>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "</div>\n" +
    "<div class=\"col-lg-8\">\n" +
    "  <x-result-detail-display result='selectedSolution'/>\n" +
    "</div>\n" +
    "\n" +
    "");
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
    "<x-standard-search/>\n" +
    "");
}]);

angular.module("search/views/search_form.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/search_form.html",
    "<div class='container col-lg-4 pull-left'>\n" +
    "    <form role=\"form\" id= \"rh-search\">\n" +
    "    <div class=\"input-group\" >\n" +
    "      <input type=\"text\" class=\"form-control\" id=\"rhSearchStr\" name=\"searchString\" ng-model=\"searchStr\" class=\"input-xxlarge\" placeholder=\"Search Articles and Solutions\">\n" +
    "      <span class=\"input-group-btn\">\n" +
    "        <button class=\"btn btn-default\"  type='submit' ng-click=\"search(searchStr)\">Search</button>\n" +
    "      </span>\n" +
    "    </div>\n" +
    "  </form>\n" +
    "</div>\n" +
    "  ");
}]);

angular.module("search/views/standard_search.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("search/views/standard_search.html",
    "<div class=\"container-fluid side-padding\">\n" +
    "	<!--div class=\"row\">\n" +
    "		<div class=\"col-xs-12\">\n" +
    "			<h3>Red Hat Access: Search</h3>\n" +
    "		</div>\n" +
    "	</div-->\n" +
    "	<div x-login-status style=\"padding: 10px;\"/>\n" +
    "	<div class=\"bottom-border\" style=\"padding-top: 10px;\"></div>\n" +
    "	<div class=\"row\" x-search-form ng-controller='SearchController'></div>\n" +
    "	<div style=\"padding-top: 10px;\"></div>\n" +
    "	<div class='row' x-list-search-results='' ng-controller='SearchController'/>\n" +
    "</div>\n" +
    "\n" +
    "\n" +
    "");
}]);

angular.module("cases/views/attachLocalFile.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/attachLocalFile.html",
    "<div class=\"container-fluid\"><div class=\"row create-field\"><div class=\"col-xs-6\"><button style=\"float: left;\" ng-click=\"getFile()\" class=\"btn\">Attach local file</button><div style=\"height: 0px; width:0px; overflow:hidden;\"><input id=\"fileUploader\" type=\"file\" value=\"upload\" rha-on-change=\"selectFile\" ng-model=\"file\"/></div></div><div class=\"col-xs-6\"><div style=\"float: left; word-wrap: break-word; width: 100%;\">{{fileName}}</div></div></div><div class=\"row create-field\"><div style=\"font-size: 80%;\" class=\"col-xs-12\"><span>File names must be less than 80 characters. Maximum file size for web-uploaded attachments is 250 MB. Please FTP larger files to dropbox.redhat.com.&nbsp;</span><span><a href=\"https://access.devgssci.devlab.phx1.redhat.com/knowledge/solutions/2112\">(More info)</a></span></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><input style=\"float: left;\" placeholder=\"File description\" ng-model=\"fileDescription\" class=\"form-control\"/></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><button ng-disabled=\"fileName == NO_FILE_CHOSEN\" style=\"float: right;\" ng-click=\"addFile(fileUploaderForm)\" class=\"btn\">Add</button></div></div></div>");
}]);

angular.module("cases/views/attachProductLogs.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/attachProductLogs.html",
    "<div class=\"container-fluid\"><div class=\"row create-field\"><div class=\"col-xs-12\"><div style=\"padding-bottom: 4px;\">Attach Foreman logs:</div><select multiple=\"multiple\" class=\"form-control\"><option>Log1</option><option>Log2</option><option>Log3</option><option>Log4</option><option>Log5</option><option>Log6</option></select></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><button ng-disabled=\"true\" style=\"float: right;\" class=\"btn\">Add</button></div></div></div>");
}]);

angular.module("cases/views/details.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/details.html",
    "<!DOCTYPE html><div id=\"redhat-access-case\" class=\"container-offset\"><rha-page-header title=\"title\"></rha-page-header><div class=\"container-fluid side-padding\"><div class=\"row\"><div class=\"col-xs-12\"><form name=\"caseDetails\"><div style=\"padding-bottom: 10px;\"><input style=\"width: 50%; display: inline-block;\" ng-model=\"details.summary\" name=\"summary\" class=\"form-control\"><span ng-show=\"caseDetails.summary.$dirty\" style=\"display: inline-block;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></div><div class=\"container-fluid side-padding\"><div id=\"rha-case-details\" class=\"row\"><h4 class=\"col-xs-12 section-header\">Case Details</h4><div class=\"container-fluid side-padding\"><div class=\"row\"><div class=\"col-md-4\"><table class=\"table details-table\"><tr><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Case Type:</div><span ng-show=\"caseDetails.type.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><select name=\"type\" style=\"width: 100%;\" ng-model=\"details.type\" ng-options=\"c.name for c in caseTypes track by c.name\" class=\"form-control\"></select></td></tr><tr><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Severity:</div><span ng-show=\"caseDetails.severity.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><select name=\"severity\" style=\"width: 100%;\" ng-model=\"details.severity\" ng-options=\"s.name for s in severities track by s.name\" class=\"form-control\"></select></td></tr><tr><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Status:</div><span ng-show=\"caseDetails.status.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><select name=\"status\" style=\"width: 100%;\" ng-model=\"details.status\" ng-options=\"s.name for s in statuses track by s.name\" class=\"form-control\"></select></td></tr><tr><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Alternate ID:</div><span ng-show=\"caseDetails.alternate_id.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><input style=\"width: 100%\" ng-model=\"details.alternate_id\" name=\"alternate_id\" class=\"form-control\"></td></tr></table></div><div class=\"col-md-4\"><table class=\"table details-table\"><tr><th><div style=\"vertical-align: 50%; display: inline-block;\">Product:</div><span ng-show=\"caseDetails.product.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><select name=\"product\" style=\"width: 100%;\" ng-model=\"details.product\" ng-change=\"getProductVersions(details.product)\" ng-options=\"s.name for s in products track by s.name\" required class=\"form-control\"></select></td></tr><tr><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Product Version:</div><span ng-show=\"caseDetails.version.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><select name=\"version\" style=\"width: 100%;\" ng-options=\"v for v in versions track by v\" ng-model=\"details.version\" required class=\"form-control\"></select></td></tr><tr><th class=\"details-table-header\">Support Level:</th><td>{{details.sla}}</td></tr><tr><th class=\"details-table-header\">Owner:</th><td>{{details.contact_name}}</td></tr><tr><th class=\"details-table-header\">Red Hat Owner:</th><td>{{details.owner}}</td></tr></table></div><div class=\"col-md-4\"><table class=\"table details-table\"><tr><th class=\"details-table-header\"><div style=\"vertical-align: 50%; display: inline-block;\">Group:</div><span ng-show=\"caseDetails.group.$dirty\" style=\"display: inline-block;float: right; vertical-align: 50%;\" class=\"glyphicon glyphicon-asterisk form-control-feedback\"></span></th><td><select name=\"group\" style=\"width: 100%;\" ng-options=\"g.name for g in groups track by g.number\" ng-model=\"details.group\" class=\"form-control\"></select></td></tr><tr><th class=\"details-table-header\">Opened:</th><td><div>{{details.created_date | date:'medium'}}</div><div>{{details.created_by}}</div></td></tr><tr><th class=\"details-table-header\">Last Updated:</th><td><div>{{details.last_modified_date | date:'medium'}}</div><div>{{details.last_modified_by}}</div></td></tr><tr><th class=\"details-table-header\">Account Number:</th><td>{{details.account_number}}</td></tr><tr><th class=\"details-table-header\">Account Name:</th><td>{{details.account_name}}</td></tr></table></div></div><div style=\"padding-top: 10px;\" class=\"row\"><div class=\"col-xs-12\"><div style=\"float: right;\"><button name=\"updateButton\" ng-disabled=\"!caseDetails.$dirty\" ng-hide=\"updatingDetails\" ng-click=\"updateCase()\" class=\"btn btn-primary\">Update Details</button><div ng-show=\"updatingDetails\">Updating Case...</div></div></div></div></div></div></div></form></div></div><div class=\"row\"><div class=\"col-xs-12\"><h4 class=\"section-header\">Description</h4><div class=\"container-fluid side-padding\"><div class=\"row\"><div class=\"col-md-2\"><strong>{{details.created_by}}</strong></div><div class=\"col-md-10\">{{details.description}}</div></div></div></div></div><!--div.row--><!--  div.col-xs-12--><!--    h4.section-header Bugzilla Tickets--><!--    div.container-fluid.side-padding--><!--      div.row--><!--        div(ng-if='!hasBugzillas')--><!--          div.col-xs-12 No Bugzillas linked to case.--><!--        div(ng-if='hasBugzillas')--><!--          div.col-xs-12 Yes Bugzillas--><div class=\"row\"><div class=\"col-xs-12\"><h4 class=\"section-header\">Attachments</h4><div class=\"container-fluid side-padding\"><div class=\"row side-padding\"><div class=\"col-xs-12 col-no-padding\"><rha-list-attachments></rha-list-attachments></div></div><div class=\"row side-padding\"><div style=\"padding-bottom: 14px;\" class=\"col-xs-12 col-no-padding bottom-border\"><div style=\"float: right\"><div ng-hide=\"!updatingAttachments\">Updating Attachments...</div><button ng-disabled=\"disableUpdateAttachmentsButton\" ng-hide=\"updatingAttachments\" ng-click=\"updateAttachments()\" class=\"btn btn-primary\">Update Attachments</button></div></div></div><div class=\"row\"><div class=\"col-xs-12\"><rha-attach-local-file></rha-attach-local-file></div></div></div></div></div><div ng-controller=\"Recommendations\" class=\"row\"><div class=\"col-xs-12\"><h4 class=\"section-header\">Recommendations</h4><div class=\"container-fluid side-padding\"><div class=\"row\"><div ng-repeat=\"recommendation in recommendationsOnScreen\"><div class=\"col-xs-3\"><div class=\"bold\">{{recommendation.title}}</div><div style=\"padding: 8px 0;\">{{recommendation.solution_abstract}}</div><a href=\"{{recommendation.resource_view_uri}}\" target=\"_blank\">View full article in new window</a></div></div></div><div class=\"row\"><div class=\"col-xs-12\"><pagination boundary-links=\"true\" total-items=\"recommendations.length\" on-select-page=\"selectPage(page)\" items-per-page=\"itemsPerPage\" page=\"currentPage\" max-size=\"maxSize\" previous-text=\"&lt;\" next-text=\"&gt;\" first-text=\"&lt;&lt;\" last-text=\"&gt;&gt;\" class=\"pagination-sm\"></pagination></div></div></div></div></div><div class=\"row\"><div class=\"col-xs-12\"><h4 class=\"section-header\">Case Discussion</h4><div class=\"container-fluid side-padding\"><div class=\"row create-field\"><div class=\"col-xs-12\"><textarea ng-disabled=\"addingComment\" rows=\"5\" ng-model=\"newComment\" style=\"max-width: 100%\" class=\"form-control\"></textarea></div></div><div style=\"margin-left: 0px; margin-right: 0px;\" class=\"row create-field bottom-border\"><div class=\"col-xs-12 col-no-padding\"><div style=\"float: right;\"><div ng-hide=\"!addingComment\">Adding comment...</div><button ng-hide=\"addingComment\" ng-disabled=\"false\" ng-click=\"addComment()\" style=\"float: right;\" class=\"btn btn-primary\">Add Comment</button></div></div></div><div ng-repeat=\"comment in comments\"><div style=\"padding-bottom: 10px;\" class=\"row\"><div class=\"col-md-2\"><div class=\"bold\">{{comment.created_by}}</div><div>{{comment.created_date | date:'mediumDate'}}</div><div>{{comment.created_date | date:'mediumTime'}}</div></div><div class=\"col-md-10\"><pre>{{comment.text}}</pre></div></div></div></div></div></div></div></div>");
}]);

angular.module("cases/views/list.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/list.html",
    "<div id=\"redhat-access-case\" class=\"container-offset\"><rha-page-header title=\"&quot;Support Cases&quot;\"></rha-page-header><div class=\"container-fluid side-padding\"><div style=\"padding-bottom: 14px;\" class=\"row\"><div class=\"col-xs-4\"><!--label(for='rha-case-group-filter', style='padding-right: 4px; font-weight: normal;') Group:--><select id=\"rha-case-group-filter\" style=\"display: inline-block;\" ng-model=\"group\" ng-change=\"doFilter()\" ng-options=\"g.name for g in groups track by g.number\" class=\"form-control\"><option value=\"\">All Groups</option></select></div><div class=\"col-xs-4\"><select ng-model=\"statusFilter\" ng-change=\"doFilter()\" class=\"form-control\"><option value=\"open\" selected=\"selected\">Open</option><option value=\"closed\">Closed</option><option value=\"both\">Open and Closed</option></select></div><div class=\"col-xs-4\"><input placeholder=\"Filter\" ng-model=\"keyword\" ng-change=\"tableParams.reload()\" class=\"form-control\"/></div></div><div class=\"row\"><div class=\"col-xs-12\"><table ng-table=\"tableParams\" style=\"text-align: center\" class=\"table table-bordered table-striped\"><tr ng-repeat=\"case in $data\"><td data-title=\"&quot;Case ID&quot;\" sortable=\"&quot;case_number&quot;\" style=\"width: 10%\"><a href=\"#/case/{{case.case_number}}\">{{case.case_number}}</a></td><td data-title=\"&quot;Summary&quot;\" sortable=\"&quot;summary&quot;\" style=\"width: 15%\">{{case.summary}}</td><td data-title=\"&quot;Product/Version&quot;\" sortable=\"&quot;product&quot;\">{{case.product}} / {{case.version}}</td><td data-title=\"&quot;Status&quot;\" sortable=\"&quot;status&quot;\">{{case.status}}</td><td data-title=\"&quot;Severity&quot;\" sortable=\"&quot;severity&quot;\">{{case.severity}}</td><td data-title=\"&quot;Owner&quot;\" sortable=\"&quot;owner&quot;\">{{case.owner}}</td><td data-title=\"&quot;Opened&quot;\" sortable=\"&quot;created_date&quot;\" style=\"width: 10%\">{{case.created_date | date:'medium'}}</td><td data-title=\"&quot;Updated&quot;\" sortable=\"&quot;last_modified_date&quot;\" style=\"width: 10%\">{{case.last_modified_date | date:'medium'}}</td></tr></table></div></div></div></div>");
}]);

angular.module("cases/views/listAttachments.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/listAttachments.html",
    "<div ng-show=\"attachments.length == 0\">No attachments added</div><table ng-show=\"attachments.length &gt; 0\" class=\"table table-hover table-bordered\"><thead><th>Filename</th><th>Description</th><th>Size</th><th>Attached</th><th>Attached By</th><th>Delete</th></thead><tbody><tr ng-repeat=\"attachment in attachments\"><td><a ng-hide=\"attachment.uri == null\" href=\"{{attachment.uri}}\">{{attachment.file_name}}</a><div ng-show=\"attachment.uri == null\">{{attachment.file_name}}</div></td><td>{{attachment.description}}</td><td>{{attachment.length | bytes}}</td><td>{{attachment.created_date | date:'medium'}}</td><td>{{attachment.created_by}}</td><td><a ng-click=\"removeAttachment()\">Delete</a></td></tr></tbody></table>");
}]);

angular.module("cases/views/new.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/new.html",
    "<!DOCTYPE html><div class=\"container-offset\"><div id=\"redhat-access-case\" class=\"container-fluid\"><rha-page-header title=\"&quot;Open a New Support Case&quot;\"></rha-page-header><div ng-hide=\"submitProgress == 0\" class=\"row\"><div class=\"col-xs-12\"><progressbar animate=\"true\" type=\"success\" value=\"submitProgress\" max=\"100\"></progressbar></div></div><div class=\"row\"><div style=\"border-right: 1px solid; border-color: #cccccc;\" class=\"col-xs-6\"><div class=\"container-fluid side-padding\"><div ng-class=\"{&quot;hidden&quot;: isPage2}\" id=\"rha-case-wizard-page-1\" class=\"create-case-section\"><div class=\"row create-field\"><div class=\"col-md-4\"><div>Product:</div></div><div class=\"col-md-8\"><select style=\"width: 100%;\" ng-model=\"product\" ng-change=\"getProductVersions(product)\" ng-options=\"p.name for p in products track by p.code\" ng-blur=\"getRecommendations()\" class=\"form-control\"></select></div></div><div class=\"row create-field\"><div class=\"col-md-4\"><div>Product Version:</div></div><div class=\"col-md-8\"><div><progressbar ng-hide=\"!versionLoading\" max=\"1\" value=\"1\" style=\"height: 34px; margin-bottom: 0px;\" class=\"progress-striped active\"></progressbar><select style=\"width: 100%;\" ng-model=\"version\" ng-options=\"v for v in versions\" ng-change=\"validateForm()\" ng-disabled=\"versionDisabled\" ng-hide=\"versionLoading\" ng-blur=\"getRecommendations()\" class=\"form-control\"></select></div></div></div><div class=\"row create-field\"><div class=\"col-md-4\"><div>Summary:</div></div><div class=\"col-md-8\"><input id=\"rha-case-summary\" style=\"width: 100%;\" ng-change=\"validateForm()\" ng-model=\"summary\" ng-blur=\"getRecommendations()\" class=\"form-control\"></div></div><div class=\"row create-field\"><div class=\"col-md-4\"><div>Description:</div></div><div class=\"col-md-8\"><textarea style=\"width: 100%; height: 200px;\" ng-model=\"description\" ng-change=\"validateForm()\" ng-blur=\"getRecommendations()\" class=\"form-control\"></textarea></div></div><div class=\"row\"><div ng-class=\"{&quot;hidden&quot;: isPage2}\" class=\"col-xs-12\"><button style=\"float: right\" ng-click=\"doNext()\" ng-disabled=\"incomplete\" class=\"btn btn-primary\">Next</button></div></div></div><div ng-class=\"{&quot;hidden&quot;: isPage1}\" id=\"rha-case-wizard-page-1\" class=\"create-case-section\"><div class=\"bottom-border\"><div class=\"row\"><div class=\"col-xs-12\"><div style=\"margin-bottom: 10px;\" class=\"bold\">{{product.name}} {{version}}</div></div></div><div class=\"row\"><div class=\"col-xs-12\"><div style=\"font-size: 90%; margin-bottom: 4px;\" class=\"bold\">{{summary}}</div></div></div><div class=\"row\"><div class=\"col-xs-12\"><div style=\"font-size: 85%\">{{description}}</div></div></div></div><div class=\"row create-field\"><div class=\"col-md-4\">Severity:</div><div class=\"col-md-8\"><select style=\"width: 100%;\" ng-model=\"severity\" ng-change=\"validatePage2()\" ng-options=\"s.name for s in severities track by s.name\" class=\"form-control\"></select></div></div><div class=\"row create-field\"><div class=\"col-md-4\">Case Group:</div><div class=\"col-md-8\"><select style=\"width: 100%;\" ng-model=\"caseGroup\" ng-change=\"validatePage2()\" ng-options=\"g.name for g in groups track by g.number\" class=\"form-control\"></select></div></div><div class=\"row create-field\"><div class=\"col-xs-12\"><div>Attachments:</div></div></div><div class=\"bottom-border\"><div style=\"overflow: auto\" class=\"row create-field\"><div class=\"col-xs-12\"><rha-list-attachments></rha-list-attachments></div></div></div><div class=\"bottom-border\"><div class=\"row create-field\"><div class=\"col-xs-12\"><rha-attach-local-file></rha-attach-local-file></div></div></div><div style=\"margin-top: 20px;\" class=\"row\"><div class=\"col-xs-6\"><button style=\"float: left\" ng-click=\"doPrevious()\" class=\"btn btn-primary\">Previous</button></div><div class=\"col-xs-6\"><button style=\"float: right\" ng-disabled=\"submitProgress &gt; 0\" ng-click=\"doSubmit()\" class=\"btn btn-primary\">Submit</button></div></div></div></div></div><div class=\"col-xs-6\"><div style=\"padding-right: 15px;\" class=\"container-fluid\"><div class=\"row\"><div class=\"col-xs-12\"><div style=\"padding-bottom: 0\" class=\"bottom-border\"><h4 style=\"padding-left: 10px; display: inline-block;\">Recommendations</h4><span ng-hide=\"!loadingRecommendations\" style=\"float: right; display: inline-block;\">Loading...</span></div></div></div><div class=\"row\"><div class=\"col-xs-12\"><div x-accordion-search-results ng-controller=\"SearchController\" style=\"padding: 0 15px;\"></div></div></div></div></div></div></div></div>");
}]);

angular.module("cases/views/pageHeader.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("cases/views/pageHeader.html",
    "<div class=\"container-fluid\"><div class=\"row\"><div class=\"col-xs-12\"><h3>Red Hat Access: {{title}}</h3></div></div><div class=\"row\"><div class=\"col-xs-12\"><div x-login-status=\"x-login-status\"></div></div></div></div><div class=\"bottom-border\"></div>");
}]);

angular.module("log_viewer/views/log_viewer.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("log_viewer/views/log_viewer.html",
    "<div id=\"log_view_main\" style=\"max-height: 500px;\" >\n" +
    "	<!--div class=\"row\">\n" +
    "		<div class=\"col-xs-12\">\n" +
    "			<h3>Red Hat Access: Diagnose</h3>\n" +
    "		</div>\n" +
    "	</div-->\n" +
    "	<div x-login-status style=\"padding: 10px;\"/>\n" +
    "	<div class=\"bottom-border\" style=\"padding-top: 10px;\"></div>\n" +
    "	<div ng-class=\"{ showMe: opens }\" class=\"left\">\n" +
    "			<div id=\"controller-demo\">\n" +
    "				<div id=\"blah\">\n" +
    "					<a ng-click=\"opens = !opens\"><span ng-class=\"{ showMe: opens }\"\n" +
    "						class=\"glyphicon glyphicon-chevron-right custom-glyphicon-right\"></span></a>\n" +
    "				</div>\n" +
    "			</div>\n" +
    "		</div>\n" +
    "		<div style=\"padding: 5px\" ng-class=\"{ showMe: opens }\"\n" +
    "			class=\"demo-left\" >\n" +
    "			<div resizeable-demo-left-view ng-style=\"{ height: windowHeight }\"> \n" +
    "				<div class=\"btn-group\" ng-controller=\"DropdownCtrl\" ng-init=\"init()\">\n" +
    "					<button type=\"button\" class=\"btn btn-default dropdown-toggle\"\n" +
    "						data-toggle=\"dropdown\">\n" +
    "						{{blah}} <span class=\"caret\"></span>\n" +
    "					</button>\n" +
    "					<ul class=\"dropdown-menu\">\n" +
    "						<li ng-repeat=\"choice in items\" ng-click=\"machineSelected()\"><a>{{choice}}</a></li>\n" +
    "					</ul>\n" +
    "				</div>\n" +
    "				<div ng-controller=\"fileController\" ng-click=\"updateSelected()\">\n" +
    "					<div data-angular-treeview=\"true\" data-tree-id=\"mytree\"\n" +
    "						data-tree-model=\"roleList\" data-node-id=\"roleId\"\n" +
    "						data-node-label=\"roleName\" data-node-children=\"children\"></div>\n" +
    "				</div>\n" +
    "\n" +
    "				<button type=\"button\" class=\"btn btn-default\"\n" +
    "					ng-controller=\"selectFileButton\" ng-click=\"fileSelected()\">\n" +
    "					Select File</button>\n" +
    "				<a ng-click=\"opens = !opens\"><span ng-class=\"{ showMe: opens }\"\n" +
    "					class=\"glyphicon glyphicon-chevron-left custom-glyphicon-left\"></span></a>\n" +
    "			</div>\n" +
    "		</div>\n" +
    "\n" +
    "\n" +
    "		<div id=\"right\">\n" +
    "			<div ng-controller=\"TabsDemoCtrl\" ng-class=\"{ showMe: open }\"\n" +
    "				class=\"main-right height\">\n" +
    "				<tabset class=\"height\"> <tab ng-repeat=\"tab in tabs\"\n" +
    "					class=\"height\"> <tab-heading>{{tab.shortTitle}}\n" +
    "				<a ng-click=\"removeTab($index)\" href=''> <span\n" +
    "					class=\"glyphicon glyphicon-remove\"></span>\n" +
    "				</a> </tab-heading>\n" +
    "				<div active=\"tab.active\" disabled=\"tab.disabled\" class=\"height\">\n" +
    "					<div class=\"panel panel-default height\">\n" +
    "						<div class=\"panel-heading\">\n" +
    "							<h3 class=\"panel-title\" style=\"display: inline\">{{tab.longTitle}}</h3>\n" +
    "							<button id=\"diagnoseButton\" type=\"button\" class=\"btn btn-default\"\n" +
    "								ng-click=\"diagnoseText()\">Red Hat Diagnose</button>\n" +
    "							<br> <br>\n" +
    "						</div>\n" +
    "						<div  class=\"panel-body height\" id=\"right-side\">\n" +
    "							<pre resizeable-file-view ng-style=\"{ height: windowHeight }\" class=\"no-line-wrap\">{{tab.content}}</pre>\n" +
    "						</div>\n" +
    "					</div>\n" +
    "				</div>\n" +
    "				</tab> </tabset>\n" +
    "			</div>\n" +
    "\n" +
    "			<div id=\"collapser\" ng-class=\"{ showMe: open }\" class=\"collapser\">\n" +
    "				<a ng-click=\"open = !open\"><span ng-class=\"{ showMe: open }\"\n" +
    "					class=\"glyphicon glyphicon-chevron-left bigger-button\"></span></a>\n" +
    "			</div>\n" +
    "\n" +
    "\n" +
    "			<div id=\"controller-demo\" ng-class=\"{ showMe: open }\"\n" +
    "				class=\"controller-demo\">\n" +
    "				<div class=\"collapsable\">\n" +
    "					<a ng-click=\"open = !open\"><span ng-class=\"{ showMe: open }\"\n" +
    "						class=\"glyphicon glyphicon-chevron-right bigger-button\"></span></a>\n" +
    "					<div ng-class=\"{ showMe: open }\" class=\"demo-right\">\n" +
    "						<div resizeable-solution-view class=\"resizeable-solution-view\" ng-style=\"{ width: windowWidth, height: windowHeight }\" x-accordion-search-results=''\n" +
    "							ng-controller='SearchController' /></div>\n" +
    "					</div>\n" +
    "				</div>\n" +
    "			</div>\n" +
    "		</div>\n" +
    "</div>");
}]);
