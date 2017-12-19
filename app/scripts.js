'use strict';

var myApp = angular.module('myApp', ['ngRoute', 'angularFileUpload', 'angular-js-xlsx', 'ymaps']);


// for auth
myApp.constant('AUTH_EVENTS', {
    loginSuccess: 'auth-login-success',
    loginFailed: 'auth-login-failed',
    logoutSuccess: 'auth-logout-success',
    sessionTimeout: 'auth-session-timeout',
    notAuthenticated: 'auth-not-authenticated',
    notAuthorized: 'auth-not-authorized'
});

// for auth
myApp.constant('USER_ROLES', {
    admin: 'admin',
    user: 'user'
});


myApp.service('Session', function () {
    this.create = function (token, email, role) {
        this.token = token;
        this.email = email;
        this.role = role;
    };
    this.destroy = function () {
        this.token = null;
        this.email = null;
        this.role = null;
    };
});



//auth service
myApp.factory('AuthService', function ($http, $location, $rootScope, Session, AUTH_EVENTS) {
    var authService = {};

    authService.login = function (credentials) {

        return $http
            .post('/api/auth/login', credentials)
            .then(function (res) {

                console.log(res);

                if (res.data.token) {

                    console.log('token was received');

                    // LocalStoradge strategy
                    // window.localStorage.setItem('CurrentUser.token', res.data.token); // store token in localstorage
                    // window.localStorage.setItem('CurrentUser.email', res.data.user.email); // store User in localstorage
                    // window.localStorage.setItem('CurrentUser.role', res.data.user.role); // store User in localstorage
                    // $http.defaults.headers.common['token'] = window.localStorage.getItem('CurrentUser.token'); // set token to default headers

                    // Session strategy
                    $http.defaults.headers.common['token'] = res.data.token; // set token to default headers

                    return res;
                }


            }, function (err) {
                console.log("AuthService factory error:");
                console.log(err);
            })
            .then(function (res) {
                Session.create(res.data.token, res.data.user.email, res.data.user.role);
                return res.data.user;
            });
    }; // end Login

    authService.logout = function () {

        $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);

        delete $http.defaults.headers.common.token;
        console.log('logout ' + $http.defaults.headers);
        Session.destroy();
        $location.path('/login'); // redirect to login

    };


    authService.isAuthorized = function (authorizedRoles) {
        if (!angular.isArray(authorizedRoles)) { // check if input data is array
            authorizedRoles = [authorizedRoles];
        }
        return (authService.isAuthenticated() && // return boolean
            authorizedRoles.indexOf(Session.role) !== -1); // check if input data = current user role
    };


    authService.isAuthenticated = function () {
        return !!Session.token;
    };


    return authService;
});

// share data between two controllers
myApp.service("sharePO", function () {

    var _PO = {};

    return {
        getPO: function () {
            return _PO;
        },
        setPO: function (value) {
            _PO = value;
        }
    };

});


// share data between two controllers
myApp.service("share1C", function () {

    var _1c = {};

    return {
        get: function () {
            return _1c;
        },
        set: function (value) {
            _1c = value;
        }
    };

});














// configure our routes
myApp.config(function ($routeProvider, USER_ROLES) {


    $routeProvider

        // route for the home page
        .when('/', {
            templateUrl: 'views/pages/PO.html',
            // controller: 'mainController' - not work with Currentuser (hide admin role not work)
        })

        .when('/login', {
            templateUrl: 'views/pages/login.html',

        })


        .when('/payment', {
            templateUrl: 'views/pages/payment.html',
            controller: 'contactController',
            authorize: [USER_ROLES.admin] // allow admin only
        })

        // PO -> detail
        .when('/:param1', {
            templateUrl: 'views/pages/detail.html',
            controller: 'urlattrController'
        })


        // route to maps
        .when('/:param1/:param2/:param3', {
            templateUrl: 'views/pages/maps.html',
            controller: 'ymapsCtrl'
        })

        // route to 1c
        .when('/:param1/:param2', { //https://namitamalik.github.io/routeParams-in-AngularJS/
            templateUrl: 'views/pages/1c.html',
            controller: '1cController'
        })

});


myApp.controller('testtController', function ($scope) {
    console.log('____________testCtrl______________');
});


myApp.run(function ($http, $rootScope, $location, AUTH_EVENTS, AuthService, USER_ROLES, Session) {

    $rootScope.$on('$routeChangeStart', function (event, to, from) {

        if (!AuthService.isAuthenticated()) {
            $location.path('/login');
        }

        if (to.authorize) {
            console.log(to);

            if (!AuthService.isAuthorized(to.authorize)) { // if vasya was not allowed
                event.preventDefault(); // revoke action
                console.log('access denied');
                $rootScope.$broadcast(AUTH_EVENTS.notAuthorized);
            }

        }


    });
});








//  This is a container for a lot of global application logic, and an alternative to Angular’s run function
//  Controller in body
myApp.controller('mainController', function ($scope, $rootScope, $http, USER_ROLES, AuthService, Session, $location, AUTH_EVENTS, $timeout) {
    // create a message to display in our view
    $scope.messageBody = 'message from mainController';

    // For alerts:
    // 401 Unauthorized:
    $scope.Unauthorized_401 = false;

    $rootScope.$on(AUTH_EVENTS.loginFailed, function (event, data) {
        $scope.Unauthorized_401 = true;
        $timeout(function () {
            $scope.Unauthorized_401 = false;
        }, 5000);

    });

    // 403 Forbidden:
    $scope.Forbidden_403 = false;

    $rootScope.$on(AUTH_EVENTS.notAuthorized, function (event, data) {
        $scope.Forbidden_403 = true;
        $timeout(function () {
            $scope.Forbidden_403 = false;
        }, 5000);

    });


    $scope.currentUser = null;
    $scope.userRoles = USER_ROLES;
    // $scope.isAuthorized = AuthService.isAuthorized;

    $scope.isAuthenticated = false; // default

    $rootScope.$on(AUTH_EVENTS.loginSuccess, function (event, data) {
        $scope.isAuthenticated = true;
    });
    $rootScope.$on(AUTH_EVENTS.logoutSuccess, function (event, data) {
        $scope.isAuthenticated = false;
    });

    $scope.setCurrentUser = function (user) {
        $scope.currentUser = user;
    };


    $scope.logoutCurrentUser = function () {

        AuthService.logout();
        $scope.setCurrentUser(null);

        // LocalStoradge strategy
        // window.localStorage.removeItem('CurrentUser.token');
        // window.localStorage.removeItem('CurrentUser.email');
        // window.localStorage.removeItem('CurrentUser.role');
        /*
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
                delete $http.defaults.headers.common.token;
                console.log('logout ' + $http.defaults.headers);
                Session.destroy();
                $scope.currentUser = null;
                $location.path('/login'); // redirect to login
        */
    };


    // LocalStoradge Strategy 
    /* if (window.localStorage.getItem('CurrentUser.token')) {

         $scope.currentUser = {
             email: window.localStorage.getItem('CurrentUser.email'),
             role: window.localStorage.getItem('CurrentUser.role'),
         };

     } */

}); // end mainController






myApp.controller('1cController', function ($scope, $http, $routeParams, share1C, sharePO, $timeout, FileUploader) {
    $scope.message = 'message from 1cController';

    console.log($http.defaults.headers);



    $scope.PONumber1 = $routeParams.param1;
    $scope.one1Number = $routeParams.param2;

    var PO = $routeParams.param1;
    var oneC = $routeParams.param2;


    // update CMR
    $scope.checkboxCMRUpdate = function (boolean) {

        var data = {
            project: PO,
            oneC: oneC,
            CMR: boolean
        };

        $http.put("/api/PO/1c/CMR", data).then(function (response) {
            console.log(response);

        }, function (err) {
            console.log(err);
        }).then(function () {

        });
    };

    // read CMR statusd
    $scope.CMRStatus = false;

    $scope.getCMRStatus = function () {

        var _PO = PO;
        var _oneC = oneC;

        $timeout(function () {

            $http.get("/api/" + _PO + "/" + _oneC + "/CMR").then(function (response) {
                $scope.CMRStatus = response.data.CMR;
                // console.log($scope.CMRStatus);
            }, function (err) {
                console.log(err);
            });

        }, 10);

    }; // end get

    $scope.getCMRStatus();


    // update PNR
    $scope.checkboxPNRUpdate = function (boolean) {

        var data = {
            project: PO,
            oneC: oneC,
            PNR: boolean
        };

        $http.put("/api/PO/1c/PNR", data).then(function (response) {
            console.log(response);

        }, function (err) {
            console.log(err);
        }).then(function () {

        });
    };

    // read PNR status
    $scope.PNRStatus = false;

    $scope.getPNRStatus = function () {

        var _PO = PO;
        var _oneC = oneC;

        $http.get("/api/" + _PO + "/" + _oneC + "/PNR").then(function (response) {
            $scope.PNRStatus = response.data.PNR;
        });

    }; // end get

    $scope.getPNRStatus();











    // update report for 1c
    $scope.report1CUpdate = function (boolean) {

        console.log('/////////////// start  $scope.report1CUpdate  ///////////////////////////////');
        var data = {
            project: PO,
            oneC: oneC,
            report: boolean
        };

        $http.put("/api/PO/1c/report", data).then(function (response) {
            console.log(response);

        }, function (err) {
            console.log(err);
        }).then(function () {

        });
    };






    // read PNR status
    $scope.report1CStatus = false;

    $scope.getreport1CStatus = function () {

        var _PO = PO;
        var _oneC = oneC;

        $http.get("/api/" + _PO + "/" + _oneC + "/report").then(function (response) {
            $scope.report1CStatus = response.data.report;
        });

    }; // end get

    $scope.getreport1CStatus();



    $scope.getListFilesFromCloud = function (PO, oneC) {

        console.log('start getListFilesFromCloud');

        $scope.ListFilesFromCloud = [];
        $http.get("/api/filescloud/" + PO + '/' + oneC).then(function (response) {

            console.log(response);

            $scope.ListFilesFromCloud = response.data;
        }, function (reject) {
            console.log(reject);
        });

    } // end getListFilesFromCloud


    $scope.getListFilesFromCloud(PO, oneC);




}); // end  1c controller

myApp.controller('contactController', function ($scope, sharePO) {

    $scope.test1 = 'message from contactController';
    $scope.message = sharePO.getPO();

    /*
    $scope.$watch(function() { return sharePO.getPO(); }, function(newValue, oldValue) {
        if (newValue != null) {
            //update Controller2's xxx value
            $scope.PONumber1 = newValue;
        }
    }, true);
*/





    $scope.searchItem = ''; // set the default search/filter term


}); // end contact controller

myApp.controller('urlattrController', function ($scope, $http, $routeParams, sharePO) {

    var PONumber1 = $routeParams.param1;

    $scope.message = "message from urlattrController"

    sharePO.setPO(PONumber1);



// list files in PO
    $scope.getListFilesFromCloudPO = function (PO) {

        console.log('______getListFilesFromCloudPO()____________');

        $scope.ListFilesFromCloudPO = [];
        $http.get("/api/filescloud/" + PO).then(function (response) {

            $scope.ListFilesFromCloudPO = response.data.filescloud;

        }, function (reject) {
            console.log(reject);
        });

    } // end getListFilesFromCloud


    $scope.getListFilesFromCloudPO(PONumber1);



    // project get id data
    $scope.getIdProjectData = function (PO) {
        $scope.IdProjectData = [];
        $http.get("/projects/" + PO).then(function (response) {
            $scope.IdProjectData = response.data;
        }).then(function (response) {});
    };

    $scope.getIdProjectData(PONumber1);

    // delete file
    $scope.hideBTN = false;
    $scope.deleteFile = function (id) {
        $http.delete("/download/" + id).then(function (response) {
            $scope.deleteFileResponse = response.data;
        }).then(function (response) {

        });
    };

    // delete row

    $scope.arr = [0, 1, 2, 3, 4, 5];

    $scope.deleteItem = function (array, item) {

        var index = array.indexOf(item);
        if (index > -1) {
            $scope.ind = index;
            array.splice(index, 1);
            $scope.newArray = array;

        } else {
            alert("error from slice");
        }
    };





});






// not work with ng route
/*
myApp.run(function(editableOptions, editableThemes) {
    editableThemes.bs3.inputClass = 'input-sm';
    editableThemes.bs3.buttonsClass = 'btn-sm';
    editableOptions.theme = 'bs3';
});

*/
myApp.controller('allPOCtrl', function ($scope, $http, $timeout, sharePO) {


    $scope.message = "allPOCtrl message";






    // OK   get PO from server and create table in PO.html   // return only  id PO
    $scope.getAllProjectData = function () {

        console.log('_________________       getAllProjectData         ________________');

        $scope.getProjectData = [];
        $scope.allTotalSummADV = 0;
        $http.get('/api/PO').then(function (response) { // old  $http.get("/projects").then(function(response) {


            console.log(response.data[1].totalSummADV);


            for (var i in response.data) {

                if (response.data[i].hasOwnProperty('totalSummADV')) {

                    if (!isNaN(parseFloat(response.data[i].totalSummADV))) {
                        response.data[i].totalSummADV = (parseFloat(response.data[i].totalSummADV)).toLocaleString('ru');

                    }


                }

                if (response.data[i].hasOwnProperty('totalSummSub')) {
                    if (!isNaN(parseFloat(response.data[i].totalSummSub))) {
                        response.data[i].totalSummSub = (parseFloat(response.data[i].totalSummSub)).toLocaleString('ru');
                    }
                }


            }


            $scope.getProjectData = response.data;

            console.log(response.data);

            // console.log(  (parseFloat($scope.getProjectData[0].totalSummADV)).toLocaleString('ru')       );


        }).then(function (response) {});
    };

    $scope.getAllProjectData();






    // OK  create new PO - PO.html
    $scope.postNewPO = function (numberPO) {

        function isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n) && n.length >= 2 && n.length <= 20;
        }


        if (isNumeric(numberPO)) { // check if input is number 

            var data = {
                project: numberPO
            };

            $http.post("/api/PO", data).then(function (response) { // api_project_route.js: apiRoutes.put('/PO', requireAuth, AuthenticationController.roleAuthorization(['admin']), function(req, res) {

                if (response.data.error) { // all error check

                    $scope.errmsg = response.data.error.errmsg; // show message

                    $timeout(function () { // hide error in 3,5 sec
                        $scope.errmsg = false;
                    }, 3500);
                }

                console.log(response.data);
                $scope.getAllProjectData();

            }, function (reject) {
                console.log(reject);
            });

        } // end if
        else {

            $scope.errmsg = 'введите корректный номер проекта'; // show message

            $timeout(function () { // hide error in 3,5 sec
                $scope.errmsg = false;
            }, 3500);

        }

    } // end function






    $scope.hideDeleteButton = true;
    $scope.confirmDeletePO = false;

    $scope.setConfirmDeletePO = function () {
        $scope.confirmDeletePO = true;
        $scope.hideDeleteButton = true;
    }



    // OK  delete item from array
    $scope.deleteItem = function (array, item) {

        var index = array.indexOf(item);

        if (index > -1) {
            $scope.ind = index;
            array.splice(index, 1);
            $scope.newArray = array;

        } else {
            alert("error from slice");
        }


    }; // end deleteItem




    // OK delete PO
    $scope.deletePO = function (PO) {



        $http.delete("/api/" + PO).then(function (response) {
            console.log(response);

        }, function (err) {
            console.log(err);
        }).then(function () {

        });


    };







    // OK  create new User - PO.html
    $scope.postNewUser = function (email, password, role) {

      

        var data = {
            email: email,
            password: password,
            role: role
        };

        $http.post("/api/auth/register", data).then(function (response) {

            if (response.data.error) { // all error check

                $scope.errmsg = response.data.error.errmsg; // show message

                $timeout(function () { // hide error in 3,5 sec
                    $scope.errmsg = false;
                }, 3500);
            }

            console.log(response.data);


        }, function (reject) {
            console.log(reject);
        });



    } // end function














}); // end  myApp.controller('allPOCtrl
myApp.controller('detailPOCtrl', function ($scope, $http, $timeout, sharePO) {






    $scope.getPODetailsOrderSumm = function (numberPO) {

        console.log('_____________________ getPODetailsOrderSumm ____________________');


        function isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n) && n.length >= 2 && n.length <= 20;
        }


        if (isNumeric(numberPO)) { // check if input is number 

            $http.get("/api/" + numberPO + "/detailsOrderSumm/").then(function (response) {


                if (response.data.error) { // all error check

                    console.log('error:  ', response.data.error);
                }

                $scope.orderNokiaVk.status = response.data[0].orderVkNokia;
                $scope.orderADVNokia.status = response.data[0].orderADVNokia;
                $scope.totalSummADV.status = response.data[0].totalSummADV;
                $scope.totalSummSub.status = response.data[0].totalSummSub;


            }, function (reject) {
                console.log(reject);
            });

        } // end if
        else {

            console.log('getOrderVkNokia: PO not number')
        }

    } // end function

    $scope.getPODetailsOrderSumm(sharePO.getPO());







    // for change:     Номер заказа ВК - Nokia      http://127.0.0.1:8080/#!/555

    $scope.orderNokiaVk = {
        value: '',
        inputColor: '',
        status: '',
        button: {
            style: 'btn-outline-primary',
            name: 'Изменить'
        }

    };


    $scope.$watch('orderNokiaVk.value', function (newValue, oldValue, scope) {
        if (newValue) {
            $scope.orderNokiaVk.button.style = 'btn-outline-primary';
            $scope.orderNokiaVk.inputColor = null;
            $scope.orderNokiaVk.button.name = 'Изменить';
        }
    });





    $scope.setOrderVkNokia = function (numberPO, orderNokiaVkFromAngular) {


        function isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n) && n.length >= 2 && n.length <= 20;
        }


        if (isNumeric(numberPO)) { // check if input is number 

            var data = {
                project: numberPO,
                orderNokiaVk: orderNokiaVkFromAngular
            };

            $http.post("/api/PO/orderVkNokia", data).then(function (response) { // api_project_route.js: apiRoutes.put('/PO', requireAuth, AuthenticationController.roleAuthorization(['admin']), function(req, res) {

                if (response.data.error) { // all error check

                    $scope.errmsg = response.data.error.errmsg; // show message

                    $timeout(function () { // hide error in 3,5 sec
                        $scope.errmsg = false;
                    }, 3500);
                }
                $scope.orderNokiaVk.status = orderNokiaVkFromAngular;
                $scope.orderNokiaVk.button.style = 'btn-outline-success';
                $scope.orderNokiaVk.inputColor = 'has-success';
                $scope.orderNokiaVk.button.name = 'Готово';

            }, function (reject) {
                console.log(reject);
            });

        } // end if
        else {

            $scope.errmsg = 'введите корректный номер заказа ВК - Nokia'; // show message

            $timeout(function () { // hide error in 3,5 sec
                $scope.errmsg = false;
            }, 3500);

        }

    } // end function































    // for change:     Заказ АДВ - Nokia     http://127.0.0.1:8080/#!/555

    $scope.orderADVNokia = {
        value: '',
        inputColor: '',
        status: '',
        button: {
            style: 'btn-outline-primary',
            name: 'Изменить'
        }

    };


    $scope.$watch('orderADVNokia.value', function (newValue, oldValue, scope) {
        if (newValue) {
            $scope.orderADVNokia.button.style = 'btn-outline-primary';
            $scope.orderADVNokia.inputColor = null;
            $scope.orderADVNokia.button.name = 'Изменить';
        }
    });



    $scope.setOrderADVNokia = function (numberPO, orderADVNokiaFromAngular) {


        function isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n) && n.length >= 2 && n.length <= 20;
        }


        if (isNumeric(numberPO)) { // check if input is number 

            var data = {
                project: numberPO,
                orderADVNokia: orderADVNokiaFromAngular
            };

            $http.post("/api/PO/orderADVNokia", data).then(function (response) {


                if (response.data.error) { // all error check

                    $scope.errmsg = response.data.error.errmsg; // show message

                    $timeout(function () { // hide error in 3,5 sec
                        $scope.errmsg = false;
                    }, 3500);
                }

                $scope.orderADVNokia.status = orderADVNokiaFromAngular;
                $scope.orderADVNokia.button.style = 'btn-outline-success';
                $scope.orderADVNokia.inputColor = 'has-success';
                $scope.orderADVNokia.button.name = 'Готово';

            }, function (reject) {
                console.log(reject);
            });

        } // end if
        else {

            $scope.errmsg = 'введите корректный номер заказа ВК - Nokia'; // show message

            $timeout(function () { // hide error in 3,5 sec
                $scope.errmsg = false;
            }, 3500);

        }

    } // end function






















    // for change:     Сумма АДВ с НДС     http://127.0.0.1:8080/#!/555

    $scope.totalSummADV = {
        value: '',
        inputColor: '',
        status: '',
        button: {
            style: 'btn-outline-primary',
            name: 'Изменить'
        }

    };


    $scope.$watch('totalSummADV.value', function (newValue, oldValue, scope) {
        if (newValue) {
            $scope.totalSummADV.button.style = 'btn-outline-primary';
            $scope.totalSummADV.inputColor = null;
            $scope.totalSummADV.button.name = 'Изменить';
        }
    });



    $scope.setTotalSummADV = function (numberPO, totalSummADVFromAngular) {


        function isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n) && n.length >= 2 && n.length <= 20;
        }


        if (isNumeric(numberPO)) { // check if input is number 

            var data = {
                project: numberPO,
                totalSummADV: totalSummADVFromAngular
            };

            $http.post("/api/PO/totalSummADV", data).then(function (response) {


                if (response.data.error) { // all error check

                    $scope.errmsg = response.data.error.errmsg; // show message

                    $timeout(function () { // hide error in 3,5 sec
                        $scope.errmsg = false;
                    }, 3500);
                }

                $scope.totalSummADV.status = totalSummADVFromAngular;
                $scope.totalSummADV.button.style = 'btn-outline-success';
                $scope.totalSummADV.inputColor = 'has-success';
                $scope.totalSummADV.button.name = 'Готово';

            }, function (reject) {
                console.log(reject);
            });

        } // end if
        else {

            $scope.errmsg = 'введите корректный номер заказа ВК - Nokia'; // show message

            $timeout(function () { // hide error in 3,5 sec
                $scope.errmsg = false;
            }, 3500);

        }

    } // end function
















    // for change:     Сумма суб.  подряд с НДС     http://127.0.0.1:8080/#!/555

    $scope.totalSummSub = {
        value: '',
        inputColor: '',
        status: '',
        button: {
            style: 'btn-outline-primary',
            name: 'Изменить'
        }

    };


    $scope.$watch('totalSummSub.value', function (newValue, oldValue, scope) {
        if (newValue) {
            $scope.totalSummSub.button.style = 'btn-outline-primary';
            $scope.totalSummSub.inputColor = null;
            $scope.totalSummSub.button.name = 'Изменить';
        }
    });



    $scope.setTotalSummSub = function (numberPO, totalSummSubFromAngular) {


        function isNumeric(n) {
            return !isNaN(parseFloat(n)) && isFinite(n) && n.length >= 2 && n.length <= 20;
        }


        if (isNumeric(numberPO)) { // check if input is number 

            var data = {
                project: numberPO,
                totalSummSub: totalSummSubFromAngular
            };

            $http.post("/api/PO/totalSummSub", data).then(function (response) {


                if (response.data.error) { // all error check

                    $scope.errmsg = response.data.error.errmsg; // show message

                    $timeout(function () { // hide error in 3,5 sec
                        $scope.errmsg = false;
                    }, 3500);
                }

                $scope.totalSummSub.status = totalSummSubFromAngular;
                $scope.totalSummSub.button.style = 'btn-outline-success';
                $scope.totalSummSub.inputColor = 'has-success';
                $scope.totalSummSub.button.name = 'Готово';

            }, function (reject) {
                console.log(reject);
            });

        } // end if
        else {

            $scope.errmsg = 'введите корректный номер заказа ВК - Nokia'; // show message

            $timeout(function () { // hide error in 3,5 sec
                $scope.errmsg = false;
            }, 3500);

        }

    } // end function




















}); // end Ctrl
//     nervgh/angular-file-upload


'use strict';

myApp.controller('fileCtrl', function($scope, $http, FileUploader, sharePO) {

    $scope.idPO = sharePO.getPO();


    var uploader = $scope.uploader = new FileUploader({
        url: 'upload',
        removeAfterUpload: 'true',
        // method: 'PUT'  for ya.ru
        // autoUpload: 'false'
    });



    // FILTERS

    // a sync filter
    uploader.filters.push({
        name: 'syncFilter',
        fn: function(item /*{File|FileLikeObject}*/ , options) {
            console.log('syncFilter');
            return this.queue.length < 10;
        }
    });

    // an async filter
    uploader.filters.push({
        name: 'asyncFilter',
        fn: function(item /*{File|FileLikeObject}*/ , options, deferred) {
            console.log('asyncFilter');
            setTimeout(deferred.resolve, 1e3);
        }
    });

    // CALLBACKS

    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter, options) {
        //console.info('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onAfterAddingFile = function(fileItem) {
        // console.info('onAfterAddingFile', fileItem);

    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        //console.info('onAfterAddingAll', addedFileItems);
    };


    uploader.onBeforeUploadItem = function(item) {

        console.log('!!!!!!!!onBeforeUploadItem');
        item.formData.push({ PO: sharePO.getPO() }); // get PO number from routecontroller
        console.info('onBeforeUploadItem', item);

    };
    uploader.onProgressItem = function(fileItem, progress) {
        // console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function(progress) {
        //console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        console.info('!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.info(fileItem._file.name);
        console.info(response);
        console.info('!!!!!!!!!!!!!!!!!!!!!');

    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        // console.info('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        //  console.info('onCompleteItem', fileItem, response, status, headers);
    };
    uploader.onCompleteAll = function() {
        // console.info('onCompleteAll');
        var completeAll = $scope.completeAll = "complete all";
        $scope.getIdProjectData(sharePO.getPO()); //update table
    };

    //  console.info('uploader', uploader);
});
'use strict';


myApp.controller('httpCtrl', function ($scope, $http, $timeout, sharePO) {



    $scope.message = "httpCtrl message";
    $scope.numberPO = sharePO.getPO();


    // OK  for delete item from Row in Table (list of 1c)   
    $scope.deteteRowFromTable = function (item) {

        $http.delete("/projects/" + item).then(function (response) {

        });
    };

























});
'use strict';


myApp.controller('loginCtrl', function($rootScope, $scope, $location, $http, AUTH_EVENTS, myService, AuthService, Session, myFactory) {

    $scope.credentials = {
        email: '',
        password: ''
    };

    $scope.login = function(credentials) {

        AuthService.login(credentials).then(function(user) {
            // console.log("user ");
            // console.log(user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            $scope.setCurrentUser(user);
            $location.path('/');


        }, function() {
            $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
        });
    };


    $scope.getAfterAuth = function() {
        // console.log($http.defaults.headers.common);
        // console.log('AuthService.isAuthenticated(): ' + AuthService.isAuthenticated());
        // console.log('Session:');
        // console.log(Session.token, Session.email, Session.role);

        $http.get('/api/todos').then(function(resp) {
            console.log(resp);
            $scope.respGetAfterAuth = resp;
        }, function(err) {
            $rootScope.$broadcast(AUTH_EVENTS.notAuthorized);
            console.log(err.data);
        }).then();
    };

}); // end controller
// USE angular-js-xlsx
//template: '<input type="file" style="display: none" />', // style="display: none"  - added by miroshnikov

'use strict';
myApp.controller('uploadXlsxCtrl', function($scope, $http, $timeout, sharePO) {
    $scope.message = "message from uploadXlsxCtrl";

    $scope.PO = sharePO.getPO();



    $scope.successHttpPutAlertMessage = false;
    $scope.showSuccessHttpPutAlertMessage = function(value) {
        $scope.successHttpPutAlertMessage = true;
        $timeout(function() {
            $scope.successHttpPutAlertMessage = false;
        }, 5000);
    };

    $scope.errorImportFromExcelAlertMessage = false;
    $scope.showErrorImportFromExcelAlertMessage = function(value) {
        $scope.errorImportFromExcelAlertMessage = true;
        $timeout(function() {
            $scope.errorImportFromExcelAlertMessage = false;
        }, 5000);
    };


    // for angular-js-xlsx
    $scope.read = function(workbook) {
        /* DO SOMETHING WITH workbook HERE */



        parseXLSX(workbook, function(arr) { // for testing
            //  console.log(JSON.stringify(arr));

            if (arr == 'err') {
                alert('error! -  проверьте формат данных в  xlxs');
                $scope.showErrorImportFromExcelAlertMessage();


            } else {

                arrayToObj(arr, function(obj) { // arr to obj
                    var tempToken = $http.defaults.headers.common['token']; //////  google api restrict header token

                    for (let i in obj) {

                        delete $http.defaults.headers.common['token']; /////////   google api restrict header token

                        // console.log(obj[i]);
                        getGeoData(obj[i].address, function(arr) {

                            $http.defaults.headers.common['token'] = tempToken; /////  google api restrict header token
                            // arr = [lat, lng]
                            addPropertytoObj(obj[i], arr, function(newObj) { // add geo coordinates to each 1c object

                                // Update CR'U'D
                                $http.put("/projects/" + sharePO.getPO(), newObj).then(function(response) {
                                    $scope.resFromPostData = response.data;
                                    $scope.showSuccessHttpPutAlertMessage();
                                    $scope.getIdProjectData(sharePO.getPO()); //update table
                                }, function(err) {
                                    $scope.xlsxHttpPutError = true;
                                    alert(err);
                                });

                            });
                        });
                    } // end for


                });
            } // end else
        }); // end parse


    }; // end $scope.read

    $scope.error = function(e) {
        /* DO SOMETHING WHEN ERROR IS THROWN */
        console.log(e);
        $scope.showErrorImportFromExcelAlertMessage();
    };
    // end for angular-js-xlsx









    function parseXLSX(file, callback) {

        var workbook = file;
        var sheet_name_list = workbook.SheetNames;
        var arr = [];
        var headers = {};

        sheet_name_list.forEach(function(y) {
            var worksheet = workbook.Sheets[y];

            var data = [];
            for (var z in worksheet) {

                if (z[0] === '!') continue;
                //parse out the column, row, and value

                var col = z.substring(0, 1);

                var row = parseInt(z.substring(1));

                var value = worksheet[z].v;

                //store header names
                if (row == 1) {
                    headers[col] = value;
                    continue;
                }

                //alert(JSON.stringify(headers));
                //{"A":"number","B":"code","C":"address"}


                if (!data[row]) data[row] = {};

                data[row][headers[col]] = value;

            } // end for
            //drop those first two rows which are empty
            data.shift();
            data.shift();


            for (var i in data) {
                //arr[i] = { oneC: data[i] };
                arr[i] = data[i];
            };

        }); // end ForEach

        // check correct file data
        if ((headers.A == 'number') && (headers.B == 'code') && (headers.C == 'address')) {

            callback(arr);
        } else {
            callback('err');
        }
    } // end function



    function getGeoData(address, callback) { // https://stackoverflow.com/questions/6847697/how-to-return-value-from-an-asynchronous-callback-function

        var URL = "https://maps.google.com/maps/api/geocode/json?address=";
        var key = "&key=AIzaSyA60pl7nin99-KeyAFHagTr3_ytn-fCndM";
        var encodeURL = encodeURI('Россия' + address);

        var globalArr = [];

        return $http.get(URL + encodeURL + key).then(function(response) {

            var lat, lng;
            var arr = []; // array 

            if (response.data.status == 'ZERO_RESULTS') { // address not found
                lat = 0; // 55.752023 + Math.random(); // set coordinates to Moscow Center - Kremlin
                lng = 0; //37.617499 + Math.random();
                arr.push(lat, lng);
                return arr; // return arr with coorditanes
            } // end if ZERO_RESULTS

            if (response.data.status == 'OK') {
                lat = response.data.results[0].geometry.location.lat;
                lng = response.data.results[0].geometry.location.lng;

                arr.push(lat, lng);
                return arr; // return arr with coorditanes
            } // end if OK

        }).then(function(arr) {
            // do something with arr
            callback(arr); // [lat,lng]
        });
    } // end getGeoData


    function arrayToObj(arr, callback) { // array to object
        var obj = {};
        for (var key in arr) {
            obj[key] = arr[key];
        }
        callback(obj);
    };

    function addPropertytoObj(obj, arrCoordinates, callback) {
        obj.geoAddress = {
            "lat": arrCoordinates[0],
            "lng": arrCoordinates[1]
        };
        callback(obj);
    };

}); // end controller
'use strict';


myApp.controller('yaCloudCtrl', function ($scope, $http, sharePO, yaApiService, $window, $routeParams, FileUploader) {
    $scope.message = "message from yaCloudCtrl";




    var PO = $routeParams.param1;
    var oneC = $routeParams.param2;



    ////////////////////////////////////////////////////////////////////////////
    // upload to ya api


    // 1. Create record in db:   filename: filename
    // 2. Get url from cloud, link alive for 30 min
    //    if ok -> nothing
    //    if error -> delete record in db
    // 3. Upload $http.put file to cloud
    //    if ok -> nothing
    //    if error -> delete record in db


    // section 1c.html

    var uploader = $scope.uploader1C = new FileUploader({
        url: '/test',
        removeAfterUpload: 'true',
        method: 'PUT' // for ya.ru
        //autoUpload: 'false'
    });


    var tempToken = $http.defaults.headers.common['token']; //////  ya api restrict header token


    uploader.onAfterAddingFile = function (fileItem) {
        console.log('onAfterAddingFile');


        // 1. Get url from cloud, link alive for 30 min


        $http.defaults.headers.common['Authorization'] = 'OAuth AQAAAAADISwSAASLJ7u-pbUtLkC-s3xtYcoUUo0'; // ya token
        delete $http.defaults.headers.common['token']; /////////   ya api restrict header token
        var path = encodeURIComponent(PO + '_' + oneC + '_' + fileItem._file.name);

        $http.get('https://cloud-api.yandex.net/v1/disk/resources/upload?path=' + path + '&overwrite=true').then(function (response) {

            fileItem.url = response.data.href;
            $http.defaults.headers.common['token'] = tempToken;

        }, function (reject) {
            console.log(reject);
            $http.defaults.headers.common['token'] = tempToken;
        });

    }; // end uploader1C.onAfterAddingFile = function(fileItem)         

    uploader.onProgressItem = function (fileItem, progress) {
        $scope.hideSpinner = false;

    };

    uploader.onSuccessItem = function (fileItem, response, status, headers) {
        console.info(fileItem._file.name);

        // if error upload to ya disk
        if (status != 201) {

            console.log('error upload to ya disk')
        } // end if

        switch (status) {
            case 201:
                console.log('201 файл был загружен без ошибок');

                $scope.spinner = true;

                // if success item -> create record in db
                var data1 = {
                    project: PO,
                    oneC: oneC,
                    filename: fileItem._file.name
                };

                $http.put("/api/PO/1c/filescloud", data1).then(function (response) {
                    console.log(response);
                    console.log(fileItem.url);

                    // update table
                    // $http.defaults.headers.common['token'] = tempToken;
                    $scope.getListFilesFromCloud(PO, oneC);
                    $scope.report1CUpdate(true);

                });


                break;
            case 202:
                console.log('202 Accepted— файл принят сервером, но еще не был перенесен непосредственно в Диск');
                break;
            case 412:
                console.log('412 Precondition Failed— при дозагрузке файла был передан неверный диапазон в заголовке Content - Range.');
                break;
            case 413:
                console.log('413 Payload Too Large— размер файла превышает 10 ГБ.');
                break;
            case 500:
                console.log('500 Internal Server Error или 503 Service Unavailable— ошибка сервера, попробуйте повторить загрузку.');
                break;
            case 507:
                console.log('507 Insufficient Storage— для загрузки файла не хватает места на Диске пользователя.');
                break;

        }


    };

    uploader.onErrorItem = function (fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };

    uploader.onCancelItem = function (fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };



    // end upload





    $scope.deleteFileFromCloud = function (filename) {

        $http.defaults.headers.common['Authorization'] = 'OAuth AQAAAAADISwSAASLJ7u-pbUtLkC-s3xtYcoUUo0'; // ya token
        delete $http.defaults.headers.common['token']; /////////   ya api restrict header token

        $http.delete('https://cloud-api.yandex.net/v1/disk/resources?path=' + encodeURIComponent(PO + '_' + oneC + '_' + filename) + '&permanently=true').then(function (response) {
            console.log(response);



            switch (response.status) {
                case 204:
                    console.log('204 OK удален');

                    $http.defaults.headers.common['token'] = tempToken;

                    var data1 = {
                        project: PO,
                        oneC: oneC,
                        filename: filename
                    };

                    // delete record in db
                    $http.put("/api/PO/1c/deleteFilescloud", data1).then(function (response) {
                        console.log(response);

                        $scope.report1CUpdate(false); // remove report state

                    }, function (err) {
                        console.log(err);
                    });

                    break;
            }


        }, function (reject) {
            console.log('reject');
            console.log(reject);

            $http.defaults.headers.common['token'] = tempToken;

            switch (reject.status) {

                case 202:
                    console.log('202 Операция выполняется асинхронно');
                    break;
                case 400:
                    console.log('400 Некорректные данные');
                    break;
                case 401:
                    console.log('401 	Не авторизован');
                    break;
                case 403:
                    console.log('403 Доступ запрещён. Возможно, у приложения недостаточно прав для данного действия');
                    break;
                case 404:
                    console.log('404 Не удалось найти запрошенный ресурс');

                    var data1 = {
                        project: PO,
                        oneC: oneC,
                        filename: filename
                    };

                    // delete record in db
                    $http.put("/api/PO/1c/deleteFilescloud", data1).then(function (response) {
                        console.log(response);

                    }, function (err) {
                        console.log(err);
                    });


                    break;

                case 429:
                    console.log('507 Слишком много запросов');
                    break;

                case 503:
                    console.log('507 Сервис временно недоступен');
                    break;

            }

        });

    }; // end deleteFileFromCloud



    // download from ya api
    /*
     Запросить URL для скачивания.
     Скачать файл по полученному адресу, указав тот же OAuth-токен, что и в исходном запросе.
    */

    $scope.downloadFromYaApi = function (item) {

        yaApiService.download(PO, oneC, item).then(function (response) {
            window.open(response, '_self');
        });

    }; // end downloadFromYaApi





















    // upload PO section  detail.html


    var uploaderPO = $scope.uploaderPO = new FileUploader({
        url: '/test',
        removeAfterUpload: 'true',
        method: 'PUT' // for ya.ru
        //autoUpload: 'false'
    });




    uploaderPO.onAfterAddingFile = function (fileItem) {
        console.log('onAfterAddingFile');


        // 1. Get url from cloud, link alive for 30 min


        $http.defaults.headers.common['Authorization'] = 'OAuth AQAAAAADISwSAASLJ7u-pbUtLkC-s3xtYcoUUo0'; // ya token
        delete $http.defaults.headers.common['token']; /////////   ya api restrict header token
        var path = encodeURIComponent(PO + '_' + fileItem._file.name);

        $http.get('https://cloud-api.yandex.net/v1/disk/resources/upload?path=' + path + '&overwrite=true').then(function (response) {

            fileItem.url = response.data.href;
            $http.defaults.headers.common['token'] = tempToken;

        }, function (reject) {
            console.log(reject);
            $http.defaults.headers.common['token'] = tempToken;
        });

    }; // end uploader1C.onAfterAddingFile = function(fileItem)         

    uploaderPO.onProgressItem = function (fileItem, progress) {
        $scope.hideSpinner = false;

    };

    uploaderPO.onSuccessItem = function (fileItem, response, status, headers) {
        console.info(fileItem._file.name);

        // if error upload to ya disk
        if (status != 201) {

            console.log('error upload to ya disk')
        } // end if

        switch (status) {
            case 201:
                console.log('201 файл был загружен без ошибок');

                $scope.spinner = true;

                // if success item -> create record in db
                var data1 = {
                    project: PO,
                    filename: fileItem._file.name
                };

                $http.put("/api/PO/filescloud", data1).then(function (response) {
                    console.log(response);
                    console.log(fileItem.url);

                    // update table
                    // $http.defaults.headers.common['token'] = tempToken;
                    $scope.getListFilesFromCloudPO(PO);

                });


                break;
            case 202:
                console.log('202 Accepted— файл принят сервером, но еще не был перенесен непосредственно в Диск');
                break;
            case 412:
                console.log('412 Precondition Failed— при дозагрузке файла был передан неверный диапазон в заголовке Content - Range.');
                break;
            case 413:
                console.log('413 Payload Too Large— размер файла превышает 10 ГБ.');
                break;
            case 500:
                console.log('500 Internal Server Error или 503 Service Unavailable— ошибка сервера, попробуйте повторить загрузку.');
                break;
            case 507:
                console.log('507 Insufficient Storage— для загрузки файла не хватает места на Диске пользователя.');
                break;

        }


    };

    uploaderPO.onErrorItem = function (fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };

    uploaderPO.onCancelItem = function (fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };



    // end upload



    $scope.deleteFileFromCloudPO = function (filename) {

        $http.defaults.headers.common['Authorization'] = 'OAuth AQAAAAADISwSAASLJ7u-pbUtLkC-s3xtYcoUUo0'; // ya token
        delete $http.defaults.headers.common['token']; /////////   ya api restrict header token

        $http.delete('https://cloud-api.yandex.net/v1/disk/resources?path=' + encodeURIComponent(PO + '_'  + filename) + '&permanently=true').then(function (response) {
            console.log(response);



            switch (response.status) {
                case 204:
                    console.log('204 OK удален');

                    $http.defaults.headers.common['token'] = tempToken;

                    var data1 = {
                        project: PO,
                        filename: filename
                    };

                    // delete record in db
                    $http.put("/api/PO/deleteFilescloud", data1).then(function (response) {
                        console.log(response);

                    }, function (err) {
                        console.log(err);
                    });

                    break;
            }


        }, function (reject) {
            console.log('reject');
            console.log(reject);

            $http.defaults.headers.common['token'] = tempToken;

            switch (reject.status) {

                case 202:
                    console.log('202 Операция выполняется асинхронно');
                    break;
                case 400:
                    console.log('400 Некорректные данные');
                    break;
                case 401:
                    console.log('401 	Не авторизован');
                    break;
                case 403:
                    console.log('403 Доступ запрещён. Возможно, у приложения недостаточно прав для данного действия');
                    break;
                case 404:
                    console.log('404 Не удалось найти запрошенный ресурс');

                    var data1 = {
                        project: PO,
                        filename: filename
                    };

                    // delete record in db
                    $http.put("/api/PO/deleteFilescloud", data1).then(function (response) {
                        console.log(response);

                    }, function (err) {
                        console.log(err);
                    });


                    break;

                case 429:
                    console.log('507 Слишком много запросов');
                    break;

                case 503:
                    console.log('507 Сервис временно недоступен');
                    break;

            }

        });

    }; // end deleteFileFromCloud





    $scope.downloadFromYaApiPO = function (item) {
        
                yaApiService.downloadPO(PO,item).then(function (response) {
                    window.open(response, '_self');
                });
        
            }; // end downloadFromYaApi





}); // end controller
'use strict';


myApp.controller('ymapsCtrl', function($scope, $http, sharePO) {
    $scope.message = "ya maps Ctrl";
    var PO = sharePO.getPO();




    ymaps.ready(function() {

        var myMap = new ymaps.Map('map', {
            center: [55.751574, 37.573856],
            zoom: 9,
            controls: ['mediumMapDefaultSet']
        }, {
            searchControlProvider: 'yandex#search'
        });

        /*
                var BalloonContentLayout = ymaps.templateLayoutFactory.createClass(
                    '<div>' +
                    '<i id="address">test</i> ' +
                    '<button class="btn btn-outline-danger btn-sm" id="save-button"> save </button>' +
                    '<button class="btn btn-outline-danger btn-sm" id="save-button"> no </button>' +
                    '</div>', {
                        build: function() {
                            // Сначала вызываем метод build родительского класса.
                            BalloonContentLayout.superclass.build.call(this);
                            // А затем выполняем дополнительные действия.
                            $('#save-button').bind('click', this.onCounterClick);
                        },
                        // Аналогично переопределяем функцию clear, чтобы снять
                        // прослушивание клика при удалении макета с карты.
                        clear: function() {
                            // Выполняем действия в обратном порядке - сначала снимаем слушателя,
                            // а потом вызываем метод clear родительского класса.
                            $('#save-button').unbind('click', this.onCounterClick);
                            BalloonContentLayout.superclass.clear.call(this);
                        },
                        onCounterClick: function() {
                            // alert('save ok');


                        }
                    }); // end ymaps.templateLayoutFactory.createClass

        */


        function templateLayoutFactorycreateClass(PO, number1C, lat, lng, address, element) {

            // alert(address);
            console.log(element);
            var BalloonContentLayout;
            return BalloonContentLayout = ymaps.templateLayoutFactory.createClass(
                '<div id="mydiv">' + '</div>' +
                '<button class="btn btn-outline-success btn-sm" id="save-button"> save </button>', {
                    build: function() {
                        // Сначала вызываем метод build родительского класса.
                        BalloonContentLayout.superclass.build.call(this);
                        // А затем выполняем дополнительные действия.
                        $('#save-button').bind('click', this.onCounterClick);
                        $('#mydiv').html(address);
                    },
                    // Аналогично переопределяем функцию clear, чтобы снять
                    // прослушивание клика при удалении макета с карты.
                    clear: function() {
                        // Выполняем действия в обратном порядке - сначала снимаем слушателя,
                        // а потом вызываем метод clear родительского класса.
                        $('#save-button').unbind('click', this.onCounterClick);
                        BalloonContentLayout.superclass.clear.call(this);
                    },
                    onCounterClick: function() {
                        // alert('save ok');
                        $('#mydiv').html('сохраняем...');
                        // $('#mydiv').append('test append');

                        var sendObj = {
                            "updateGeo": true, // for reason: i have many http.put for excel fo example
                            "number": number1C,
                            // "code": "VIMPELCOM BS-12120 ANGARSKAYA 20",
                            // "address": "Ангарская ул, д 20а",
                            "geoAddress": {
                                "lat": lat,
                                "lng": lng
                            }
                        };

                        // Update CR'U'D
                        $http.put("/projects/" + PO, sendObj).then(function(response) {
                            // var test = response.data;
                        }, function(err) {
                            alert(err);
                        }).then(function(response) {
                            element.get('target').options.set('preset', "islands#darkGreenIcon"); // set green color
                            element.get('target').balloon.close();
                            element.get('target').options.unset('balloonContentLayout'); // remove button save
                        }, function(err) {

                        });

                    }
                }); // end ymaps.templateLayoutFactory.createClass

        }; // end  function templateLayoutFactorycreateClass




        // get address and coorditanes from mongodb
        $http.get("/projects/" + PO).then(function(response) {
            var arr = [];
            arr = response.data.oneC; // array of 1c
            return arr;
        }).then(function(arr) {
            // we need: 
            // 1. address
            // 2. geo coordinates

            var placemarkColor;
            var randomLat;
            var randomLng;

            for (let i in arr) {

                if (arr[i].hasOwnProperty('geoAddress') && arr[i].geoAddress !== null) {

                    if (arr[i].geoAddress.lat !== null && arr[i].geoAddress.lng !== null) { //array of addresses

                        if (arr[i].geoAddress.lat == 0 && arr[i].geoAddress.lng == 0) {
                            placemarkColor = "islands#redIcon";
                            // if google api said coordinates were not found - group theese placemark near moscow 
                            randomLat = 55.752023 + Math.random(); // Kremlin + random  0 - 0,9 
                            randomLng = 37.617499 + Math.random(); // Kremlin + random  0 - 0,9

                        } //end if
                        else {
                            placemarkColor = "islands#darkGreenIcon";
                            randomLat = 0;
                            randomLng = 0;
                        }

                        var arrPlacemark = [];

                        arrPlacemark[i] = new ymaps.Placemark( // Placemark(geometry[, properties[, options]])
                            [arr[i].geoAddress.lat + randomLat, arr[i].geoAddress.lng + randomLng], { // lat, lng

                                balloonContent: arr[i].code,
                                hintContent: arr[i].address

                            }, {
                                //  balloonContentLayout: BalloonContentLayout,
                                draggable: true,
                                preset: placemarkColor
                            }); // end myPlacemark




                        arrPlacemark[i].events.add('drag', function(e) {
                            e.get('target').options.set('preset', "islands#redIcon");
                        });

                        arrPlacemark[i].events.add('dragend', function(e) {
                            var element = e;

                            e.get('target').balloon.open();

                            ymaps.geocode(e.get('target').geometry.getCoordinates(), {
                                results: 1
                            }).then(function(res) {
                                var newContent = res.geoObjects.get(0) ?
                                    res.geoObjects.get(0).properties.get('name') :
                                    'Не удалось определить адрес.';

                                // do simething  if address identofied successfully

                                var arrCoordinates = e.get('target').geometry.getCoordinates();
                                var lat = arrCoordinates[0];
                                var lng = arrCoordinates[1];

                                //PO, number1C, lat, lng
                                e.get('target').options.set('balloonContentLayout', templateLayoutFactorycreateClass(PO, arr[i].number, lat, lng, newContent, element)); //unset - delete
                                e.get('target').properties.set('hintContent', newContent);

                            });


                        }); // end drag






                        myMap.geoObjects.add(arrPlacemark[i]); //end myMap.add

                    } else {
                        // console.log('arr[i].geoAddress.lat and lng = null');
                    }

                } // if
                else {
                    // console.log('arr[i].geoAddress not exist or null');
                }
            } // end for
            /*
            
                                */

        }).then(function(addressArr) {
            // show in map
            //  myMap.geoObjects.add(placemark);
        });







    }); // end ready


    /////////////////////////////////////////////////////////////////////////////////////////

    //    addAddressesFromPOtoMap(sharePO.getPO());


    /*

        function getGeoData(address) {

            var URL = "https://maps.google.com/maps/api/geocode/json?address=";
            var key = "&key=AIzaSyA60pl7nin99-KeyAFHagTr3_ytn-fCndM";
            var encodeURL = encodeURI('Россия' + address);


            $http.get(URL + encodeURL + key).then(function(response) {

                var lat, lng;
                var obj = {};

                if (response.data.status == 'ZERO_RESULTS') { // address not found
                    lat = 55.752023 + Math.random(); // set coordinates to Moscow Center - Kremlin
                    lng = 37.617499 + Math.random();
                    obj.coordinates = [lat, lng];
                    // obj.properties = { balloonContent: "координаты адреса не найдены: " + address };
                    obj.properties = {
                        balloonContent: "координаты адреса не найдены: " + address,
                        hintContent: "координаты адреса не найдены: " + address,
                        draggable: "true",
                        iconShadow: "true"
                    };
                    obj.options = { preset: 'islands#icon', iconColor: '#a5260a' };

                    return obj;
                } // end if ZERO_RESULTS

                if (response.data.status == 'OK') {
                    lat = response.data.results[0].geometry.location.lat;
                    lng = response.data.results[0].geometry.location.lng;
                    obj.coordinates = [lat, lng];
                    obj.properties = {
                        balloonContent: address,
                        hintContent: address,
                        draggable: true
                    };

                    return obj;
                } // end if OK

            }).then(function(obj) {
                $scope.markers.push(obj);
            }).then(function() {

            });

        } // end getGeoData

    */

}); // end controller
myApp.service('myService', function () {
    this.summ = function (a) {
        return a + a;
    }
    this.publicProperty = "public";
    var privateProperty = "private";
    this.getPrivateProperty = function () {
        return privateProperty;
    }
});

myApp.factory('myFactory', function () {

    var factory = {};

    factory.method1 = function () {
        return 1;
    }

    factory.method2 = function () {
        return 2;
    }

    return factory;
});




myApp.factory('yaApiService', function ($http, $rootScope) {


    var yaApiService = {};

    yaApiService.token = 'OAuth AQAAAAADISwSAASLJ7u-pbUtLkC-s3xtYcoUUo0';

    var tempToken = $http.defaults.headers.common['token'];



    yaApiService.upload = function (PO, oneC, uploader) {


    } // end yaApiService.upload



    // download method - return  url or error
    yaApiService.download = function (PO, oneC, item) {

        console.log(encodeURIComponent(PO + '_' + oneC + '_' + item));


        $http.defaults.headers.common['Authorization'] = yaApiService.token; // set ya token
        delete $http.defaults.headers.common['token']; //  ya api restrict header token

        var path = encodeURIComponent(PO + '_' + oneC + '_' + item);

        return $http
            .get('https://cloud-api.yandex.net/v1/disk/resources/download?path=' + path)
            .then(function (response) {

                $http.defaults.headers.common['token'] = tempToken;
                return response.data.href;

            }, function (reject) {
                console.log(reject);
                $http.defaults.headers.common['token'] = tempToken;
                return reject;
            });

    }; //end yaApiService.download


    // download method - return  url or error
    yaApiService.downloadPO = function (PO, item) {

        console.log(encodeURIComponent(PO + '_'  + item));


        $http.defaults.headers.common['Authorization'] = yaApiService.token; // set ya token
        delete $http.defaults.headers.common['token']; //  ya api restrict header token

        var path = encodeURIComponent(PO + '_' +  item);

        return $http
            .get('https://cloud-api.yandex.net/v1/disk/resources/download?path=' + path)
            .then(function (response) {

                $http.defaults.headers.common['token'] = tempToken;
                return response.data.href;

            }, function (reject) {
                console.log(reject);
                $http.defaults.headers.common['token'] = tempToken;
                return reject;
            });

    }; //end yaApiService.download

    return yaApiService;
}); // end myApp.factory('yaApiService'