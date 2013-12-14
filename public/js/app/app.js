'use strict';


// Declare app level module which depends on filters, and services
var elipsisApp = angular.module('elipsisApp', ['ngRoute', 'elipsisApp.filters', 'elipsisApp.directives']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.
      when('/app/register',             {templateUrl: '/partials/register.html',   controller: "RegisterCtrl"}).
      when('/app/login',                {templateUrl: '/partials/login.html',      controller: "LoginCtrl"}).
      when('/app/logout',               {templateUrl: '/partials/logout.html',     controller: "LogoutCtrl"}).
      when('/app/account',              {templateUrl: '/partials/account.html',    controller: "AccountCtrl"}).
      when('/app/vault',                {templateUrl: '/partials/vault.html',      controller: "VaultCtrl"}).
      otherwise({redirectTo: '/app/login'});
  }]).
  config(function($locationProvider) {
    $locationProvider.html5Mode(true)
  });