'use strict';

var path = require('path'),
    bcrypt = require('bcrypt'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    Extensions = require('periodicjs.core.extensions'),
    Utilities = require('periodicjs.core.utilities'),
    ControllerHelper = require('periodicjs.core.controllerhelper'),
    userHelper,
    appSettings,
    mongoose,
    User,
    logger,
    CoreExtension,
    CoreUtilities,
    CoreController;

var login = function(req,res,next) {
    CoreController.getPluginViewDefaultTemplate(
        {
            viewname:'user/login',
            themefileext:appSettings.templatefileextension,
            extname: 'periodicjs.ext.login'
        },
        function(err,templatepath){
            CoreController.handleDocumentQueryRender({
                res:res,
                req:req,
                renderView:templatepath,
                responseData:{
                    pagedata:{
                        title:'Login'
                    },
                    user:req.user
                }
            });
        }
    );
};

var newuser = function(req, res, next) {
    CoreController.getPluginViewDefaultTemplate(
        {
            viewname:'user/new',
            themefileext:appSettings.templatefileextension,
            extname: 'periodicjs.ext.login'
        },
        function(err,templatepath){
            CoreController.handleDocumentQueryRender({
                res:res,
                req:req,
                renderView:templatepath,
                responseData:{
                    pagedata:{
                        title:'Register'
                    },
                    user:req.user
                }
            });
        }
    );
};

var create = function(req, res ,next) {
    var userdata = CoreUtilities.removeEmptyObjectValues(req.body);
    userHelper.createNewUser({
        userdata:userdata,
        User:User,
        res:res,
        req:req,
        applicationController:CoreController
    });
};

var finishregistration = function(req, res, next) {
    CoreController.getPluginViewDefaultTemplate(
        {
            viewname:'user/finishregistration',
            themefileext:appSettings.templatefileextension,
            extname: 'periodicjs.ext.login'
        },
        function(err,templatepath){
            CoreController.handleDocumentQueryRender({
                res:res,
                req:req,
                renderView:templatepath,
                responseData:{
                    pagedata:{
                        title:'complete registration'
                    },
                    user:req.user
                }
            });
        }
    );
};

var updateuserregistration = function(req, res, next) {
    var userError;

    User.findOne({
            email: req.user.email
        },
        function(err, userToUpdate) {
            if (err) {
                userError = err;
                CoreController.handleDocumentQueryErrorResponse({
                    err:userError,
                    res:res,
                    req:req,
                    errorflash:userError.message,
                    redirecturl:"/user/finishregistration"
                });
            }
            else if (!userToUpdate) {
                userError = new Error("could not find user, couldn't complate registration");
                CoreController.handleDocumentQueryErrorResponse({
                    err:userError,
                    res:res,
                    req:req,
                    errorflash:userError.message,
                    redirecturl:"/user/finishregistration"
                });
            }
            else {
                userToUpdate.username = req.body.username;
                userToUpdate.save(function(err, userSaved) {
                    if (err) {
                        userError =err;
                        CoreController.handleDocumentQueryErrorResponse({
                            err:userError,
                            res:res,
                            req:req,
                            errorflash:userError.message,
                            redirecturl:"/user/finishregistration"
                        });
                    }
                    else {
                        var forwardUrl = (req.session.return_url) ? req.session.return_url : '/';
                        req.flash('info', "updated user account");
                        res.redirect(forwardUrl);

                        User.sendAsyncWelcomeEmail(userSaved, function() {});
                    }
                });
            }
    });
};

var controller = function(resources){
    logger = resources.logger;
    mongoose = resources.mongoose;
    appSettings = resources.settings;
    // applicationController = new appController(resources);
    userHelper = require(path.join(process.cwd(),'app/controller/helpers/user'))(resources);
    User = mongoose.model('User');
    CoreController = new ControllerHelper(resources);
    CoreExtension = new Extensions(appSettings);
    CoreUtilities = new Utilities(resources);

    return{
        login:login,
        newuser:newuser,
        create:create,
        finishregistration:finishregistration,
        updateuserregistration:updateuserregistration
    };
};

module.exports = controller;