'use strict';


// Declare app level module which depends on filters, and services
var app = angular.module('myApp', ['ngSanitize', 'ngRoute', 'myApp.filters', 'myApp.directives']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.
      when('/register',             {templateUrl: '/partials/register.html',   controller: "RegisterCtrl"}).
      when('/login',                {templateUrl: '/partials/login.html',      controller: "LoginCtrl"}).
      when('/account',              {templateUrl: '/partials/account.html',    controller: "AccountCtrl"}).
      when('/vault',                {templateUrl: '/partials/vault.html',      controller: "VaultCtrl"}).
      otherwise({redirectTo: '/login'});
  }]).
  config(function($locationProvider) {
    $locationProvider.html5Mode(true)
  });