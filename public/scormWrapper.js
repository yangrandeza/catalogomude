/* ===========================================================

pipwerks SCORM Wrapper for JavaScript
v1.1.20180906

Created by Philip Hutchison, January 2008-2018
https://github.com/pipwerks/scorm-api-wrapper

Copyright (c) Philip Hutchison
MIT-style license: http://pipwerks.mit-license.org/

This wrapper works with both SCORM 1.2 and SCORM 2004.

Inspired by APIWrapper.js, created by the ADL and
Concurrent Technologies Corporation, distributed by
the ADL (http://www.adlnet.gov/scorm).

SCORM.API.find() and SCORM.API.get() functions based
on ADL code, modified by Mike Rustici
(http://www.scorm.com/resources/apifinder/SCORMAPIFinder.htm),
further modified by Philip Hutchison

=============================================================== */

var pipwerks = {};

pipwerks.UTILS = {};
pipwerks.debug = { isActive: true };

pipwerks.SCORM = {
    version: null,
    handleCompletionStatus: true,
    handleExitMode: true,
    API: {
        handle: null,
        isFound: false
    },
    connection: { isActive: false },
    data: {
        completionStatus: null,
        exitStatus: null
    },
    debug: {}
};

pipwerks.SCORM.isAvailable = function() {
    return true;
};

pipwerks.SCORM.API.find = function(win) {
    var API = null,
        findAttempts = 0,
        findAttemptLimit = 500,
        traceMsgPrefix = "SCORM.API.find",
        trace = pipwerks.UTILS.trace,
        scorm = pipwerks.SCORM;

    while ((!win.API && !win.API_1484_11) &&
        (win.parent) &&
        (win.parent != win) &&
        (findAttempts <= findAttemptLimit)) {

        findAttempts++;
        win = win.parent;
    }

    if (scorm.version) {
        switch (scorm.version) {
            case "2004":
                if (win.API_1484_11) {
                    API = win.API_1484_11;
                } else {
                    trace(traceMsgPrefix + ": SCORM version 2004 was specified by user, but API_1484_11 cannot be found.");
                }
                break;
            case "1.2":
                if (win.API) {
                    API = win.API;
                } else {
                    trace(traceMsgPrefix + ": SCORM version 1.2 was specified by user, but API cannot be found.");
                }
                break;
        }
    } else {
        if (win.API_1484_11) {
            scorm.version = "2004";
            API = win.API_1484_11;
        } else if (win.API) {
            scorm.version = "1.2";
            API = win.API;
        }
    }

    if (API) {
        trace(traceMsgPrefix + ": API found. Version: " + scorm.version);
        trace("API: " + API);
    } else {
        trace(traceMsgPrefix + ": Error finding API. \nFind attempts: " + findAttempts + ". \nFind attempt limit: " + findAttemptLimit);
    }

    return API;
};

pipwerks.SCORM.API.get = function() {
    var API = null,
        win = window,
        scorm = pipwerks.SCORM,
        find = scorm.API.find,
        trace = pipwerks.UTILS.trace;

    API = find(win);

    if (!API && win.parent && win.parent != win) {
        API = find(win.parent);
    }

    if (!API && win.top && win.top.opener) {
        API = find(win.top.opener);
    }

    if (!API && win.top && win.top.opener && win.top.opener.document) {
        API = find(win.top.opener.document);
    }

    if (API) {
        scorm.API.isFound = true;
    } else {
        trace("API.get failed: Can't find the API!");
    }

    return API;
};

pipwerks.SCORM.API.getHandle = function() {
    var API = pipwerks.SCORM.API;

    if (!API.handle && !API.isFound) {
        API.handle = API.get();
    }

    return API.handle;
};

pipwerks.SCORM.connection.initialize = function() {
    var success = false,
        scorm = pipwerks.SCORM,
        completionStatus = scorm.data.completionStatus,
        trace = pipwerks.UTILS.trace,
        makeBoolean = pipwerks.UTILS.StringToBoolean,
        debug = scorm.debug,
        traceMsgPrefix = "SCORM.connection.initialize ";

    trace("connection.initialize called.");

    if (!scorm.connection.isActive) {
        var API = scorm.API.getHandle(),
            errorCode = 0;

        if (API) {
            switch (scorm.version) {
                case "1.2":
                    success = makeBoolean(API.LMSInitialize(""));
                    break;
                case "2004":
                    success = makeBoolean(API.Initialize(""));
                    break;
            }

            if (success) {
                errorCode = debug.getCode();

                if (errorCode !== null && errorCode === 0) {
                    scorm.connection.isActive = true;

                    if (scorm.handleCompletionStatus) {
                        completionStatus = scorm.status("get");

                        if (completionStatus) {
                            switch (completionStatus) {
                                case "not attempted":
                                    scorm.status("set", "incomplete");
                                    break;
                                case "unknown":
                                    scorm.status("set", "incomplete");
                                    break;
                            }
                            scorm.save();
                        }
                    }
                } else {
                    success = false;
                    trace(traceMsgPrefix + "failed. \nError code: " + errorCode + " \nError info: " + debug.getInfo(errorCode));
                }
            } else {
                errorCode = debug.getCode();

                if (errorCode !== null && errorCode !== 0) {
                    trace(traceMsgPrefix + "failed. \nError code: " + errorCode + " \nError info: " + debug.getInfo(errorCode));
                } else {
                    trace(traceMsgPrefix + "failed: No response from server.");
                }
            }
        } else {
            trace(traceMsgPrefix + "failed: API is null.");
        }
    } else {
        trace(traceMsgPrefix + "aborted: Connection already active.");
    }

    return success;
};

pipwerks.SCORM.connection.terminate = function() {
    var success = false,
        scorm = pipwerks.SCORM,
        exitStatus = scorm.data.exitStatus,
        completionStatus = scorm.data.completionStatus,
        trace = pipwerks.UTILS.trace,
        makeBoolean = pipwerks.UTILS.StringToBoolean,
        debug = scorm.debug,
        traceMsgPrefix = "SCORM.connection.terminate ";

    if (scorm.connection.isActive) {
        var API = scorm.API.getHandle(),
            errorCode = 0;

        if (API) {
            if (scorm.handleExitMode && !exitStatus) {
                if (completionStatus !== "completed" && completionStatus !== "passed") {
                    switch (scorm.version) {
                        case "1.2":
                            success = scorm.set("cmi.core.exit", "suspend");
                            break;
                        case "2004":
                            success = scorm.set("cmi.exit", "suspend");
                            break;
                    }
                } else {
                    switch (scorm.version) {
                        case "1.2":
                            success = scorm.set("cmi.core.exit", "logout");
                            break;
                        case "2004":
                            success = scorm.set("cmi.exit", "normal");
                            break;
                    }
                }
            }

            success = (scorm.version === "1.2") ? scorm.save() : true;

            if (success) {
                switch (scorm.version) {
                    case "1.2":
                        success = makeBoolean(API.LMSFinish(""));
                        break;
                    case "2004":
                        success = makeBoolean(API.Terminate(""));
                        break;
                }

                if (success) {
                    scorm.connection.isActive = false;
                } else {
                    errorCode = debug.getCode();
                    trace(traceMsgPrefix + "failed. \nError code: " + errorCode + " \nError info: " + debug.getInfo(errorCode));
                }
            }
        } else {
            trace(traceMsgPrefix + "failed: API is null.");
        }
    } else {
        trace(traceMsgPrefix + "aborted: Connection already terminated.");
    }

    return success;
};

pipwerks.SCORM.data.get = function(parameter) {
    var value = null,
        scorm = pipwerks.SCORM,
        trace = pipwerks.UTILS.trace,
        debug = scorm.debug,
        traceMsgPrefix = "SCORM.data.get('" + parameter + "') ";

    if (scorm.connection.isActive) {
        var API = scorm.API.getHandle(),
            errorCode = 0;

        if (API) {
            switch (scorm.version) {
                case "1.2":
                    value = API.LMSGetValue(parameter);
                    break;
                case "2004":
                    value = API.GetValue(parameter);
                    break;
            }

            errorCode = debug.getCode();

            if (value !== "" || errorCode === 0) {
                switch (parameter) {
                    case "cmi.core.lesson_status":
                    case "cmi.completion_status":
                        scorm.data.completionStatus = value;
                        break;
                    case "cmi.core.exit":
                    case "cmi.exit":
                        scorm.data.exitStatus = value;
                        break;
                }
            } else {
                trace(traceMsgPrefix + "failed. \nError code: " + errorCode + "\nError info: " + debug.getInfo(errorCode));
            }
        } else {
            trace(traceMsgPrefix + "failed: API is null.");
        }
    } else {
        trace(traceMsgPrefix + "failed: API connection is inactive.");
    }

    trace(traceMsgPrefix + " value: " + value);

    return String(value);
};

pipwerks.SCORM.data.set = function(parameter, value) {
    var success = false,
        scorm = pipwerks.SCORM,
        trace = pipwerks.UTILS.trace,
        makeBoolean = pipwerks.UTILS.StringToBoolean,
        debug = scorm.debug,
        traceMsgPrefix = "SCORM.data.set('" + parameter + "') ";

    if (scorm.connection.isActive) {
        var API = scorm.API.getHandle(),
            errorCode = 0;

        if (API) {
            switch (scorm.version) {
                case "1.2":
                    success = makeBoolean(API.LMSSetValue(parameter, value));
                    break;
                case "2004":
                    success = makeBoolean(API.SetValue(parameter, value));
                    break;
            }

            if (success) {
                if (parameter === "cmi.core.lesson_status" || parameter === "cmi.completion_status") {
                    scorm.data.completionStatus = value;
                }
            } else {
                errorCode = debug.getCode();
                trace(traceMsgPrefix + "failed. \nError code: " + errorCode + ". \nError info: " + debug.getInfo(errorCode));
            }
        } else {
            trace(traceMsgPrefix + "failed: API is null.");
        }
    } else {
        trace(traceMsgPrefix + "failed: API connection is inactive.");
    }

    trace(traceMsgPrefix + " value: " + value);

    return success;
};

pipwerks.SCORM.data.save = function() {
    var success = false,
        scorm = pipwerks.SCORM,
        trace = pipwerks.UTILS.trace,
        makeBoolean = pipwerks.UTILS.StringToBoolean,
        traceMsgPrefix = "SCORM.data.save failed";

    if (scorm.connection.isActive) {
        var API = scorm.API.getHandle();

        if (API) {
            switch (scorm.version) {
                case "1.2":
                    success = makeBoolean(API.LMSCommit(""));
                    break;
                case "2004":
                    success = makeBoolean(API.Commit(""));
                    break;
            }
        } else {
            trace(traceMsgPrefix + ": API is null.");
        }
    } else {
        trace(traceMsgPrefix + ": API connection is inactive.");
    }

    return success;
};

pipwerks.SCORM.status = function(action, status) {
    var success = false,
        scorm = pipwerks.SCORM,
        trace = pipwerks.UTILS.trace,
        traceMsgPrefix = "SCORM.getStatus failed",
        cmi = "";

    if (action !== null) {
        switch (scorm.version) {
            case "1.2":
                cmi = "cmi.core.lesson_status";
                break;
            case "2004":
                cmi = "cmi.completion_status";
                break;
        }

        switch (action) {
            case "get":
                success = scorm.data.get(cmi);
                break;
            case "set":
                if (status !== null) {
                    success = scorm.data.set(cmi, status);
                } else {
                    success = false;
                    trace(traceMsgPrefix + ": status was not specified.");
                }
                break;
            default:
                success = false;
                trace(traceMsgPrefix + ": no valid action was specified.");
        }
    } else {
        trace(traceMsgPrefix + ": action was not specified.");
    }

    return success;
};

pipwerks.SCORM.debug.getCode = function() {
    var scorm = pipwerks.SCORM,
        API = scorm.API.getHandle(),
        trace = pipwerks.UTILS.trace,
        code = 0;

    if (API) {
        switch (scorm.version) {
            case "1.2":
                code = parseInt(API.LMSGetLastError(), 10);
                break;
            case "2004":
                code = parseInt(API.GetLastError(), 10);
                break;
        }
    } else {
        trace("SCORM.debug.getCode failed: API is null.");
    }

    return code;
};

pipwerks.SCORM.debug.getInfo = function(errorCode) {
    var scorm = pipwerks.SCORM,
        API = scorm.API.getHandle(),
        trace = pipwerks.UTILS.trace,
        result = "";

    if (API) {
        switch (scorm.version) {
            case "1.2":
                result = API.LMSGetErrorString(errorCode.toString());
                break;
            case "2004":
                result = API.GetErrorString(errorCode.toString());
                break;
        }
    } else {
        trace("SCORM.debug.getInfo failed: API is null.");
    }

    return String(result);
};

pipwerks.SCORM.debug.getDiagnosticInfo = function(errorCode) {
    var scorm = pipwerks.SCORM,
        API = scorm.API.getHandle(),
        trace = pipwerks.UTILS.trace,
        result = "";

    if (API) {
        switch (scorm.version) {
            case "1.2":
                result = API.LMSGetDiagnostic(errorCode);
                break;
            case "2004":
                result = API.GetDiagnostic(errorCode);
                break;
        }
    } else {
        trace("SCORM.debug.getDiagnosticInfo failed: API is null.");
    }

    return String(result);
};

pipwerks.SCORM.init = pipwerks.SCORM.connection.initialize;
pipwerks.SCORM.get = pipwerks.SCORM.data.get;
pipwerks.SCORM.set = pipwerks.SCORM.data.set;
pipwerks.SCORM.save = pipwerks.SCORM.data.save;
pipwerks.SCORM.quit = pipwerks.SCORM.connection.terminate;

pipwerks.UTILS.StringToBoolean = function(value) {
    var t = typeof value;
    switch (t) {
        case "object":
        case "string":
            return (/(true|1)/i).test(value);
        case "number":
            return !!value;
        case "boolean":
            return value;
        case "undefined":
            return null;
        default:
            return false;
    }
};

pipwerks.UTILS.trace = function(msg) {
    if (pipwerks.debug.isActive) {
        if (window.console && window.console.log) {
            window.console.log(msg);
        }
    }
};