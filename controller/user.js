'use strict';

var path = require('path'),
    Utilities = require('periodicjs.core.utilities'),
    ControllerHelper = require('periodicjs.core.controllerhelper'),
    CoreMailer = require('periodicjs.core.mailer'),
    userHelper,
    appSettings,
    mongoose,
    User,
    logger,
    welcomeemailtemplate,
    emailtransport,
    CoreUtilities,
    CoreController;

var login = function(req,res) {
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

var newuser = function(req, res) {
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

var create = function(req, res ) {
    var userdata = CoreUtilities.removeEmptyObjectValues(req.body);
    userHelper.createNewUser({
        userdata:userdata,
        User:User,
        res:res,
        req:req,
        applicationController:CoreController
    });
};

var finishregistration = function(req, res) {
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

var updateuserregistration = function(req, res) {
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
                    redirecturl:'/user/finishregistration'
                });
            }
            else if (!userToUpdate) {
                userError = new Error('could not find user, couldn\'t complate registration');
                CoreController.handleDocumentQueryErrorResponse({
                    err:userError,
                    res:res,
                    req:req,
                    errorflash:userError.message,
                    redirecturl:'/user/finishregistration'
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
                            redirecturl:'/user/finishregistration'
                        });
                    }
                    else {
                        var forwardUrl = (req.session.return_url) ? req.session.return_url : '/';
                        req.flash('info', 'updated user account');
                        res.redirect(forwardUrl);

                        if(welcomeemailtemplate && emailtransport){
                            User.sendWelcomeUserEmail({
                                subject: appSettings.name+' New User Registration',
                                user:userSaved,
                                hostname:req.headers.host,
                                appname:appSettings.name,
                                emailtemplate:welcomeemailtemplate,
                                // bcc:'yje2@cornell.edu',
                                mailtransport:emailtransport
                            },function(err,status){
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    console.info('email status',status);
                                }
                            });
                        }
                    }
                });
            }
    });
};

var controller = function(resources){
    logger = resources.logger;
    mongoose = resources.mongoose;
    appSettings = resources.settings;
    userHelper = require(path.join(process.cwd(),'app/controller/helpers/user'))(resources);
    User = mongoose.model('User');
    CoreController = new ControllerHelper(resources);
    CoreUtilities = new Utilities(resources);
    CoreController.getPluginViewDefaultTemplate(
        {
            viewname:'email/user/welcome',
            themefileext:appSettings.templatefileextension
        },
        function(err,templatepath){
            if(templatepath ==='email/user/welcome'){
                templatepath = path.resolve(process.cwd(),'app/views',templatepath+'.'+appSettings.templatefileextension);
            }
            User.getWelcomeEmailTemplate({templatefile:templatepath},function(err,emailtemplate){
                if(err){
                    console.error(err);
                }
                else{
                    welcomeemailtemplate = emailtemplate;                                   
                }
            });
        }
    );
    CoreMailer.getTransport({appenvironment : appSettings.application.environment},function(err,transport){
        if(err){
            console.error(err);
        }
        else{
            emailtransport = transport;                                 
        }
    });

    return{
        login:login,
        newuser:newuser,
        create:create,
        finishregistration:finishregistration,
        updateuserregistration:updateuserregistration
    };
};

module.exports = controller;