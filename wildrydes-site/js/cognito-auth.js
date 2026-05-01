(function scopeWrapper($) {
    var signinUrl = '/signin.html';
    var verifyUrl = '/verify.html';

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    var userPool;
    if (!(_config.cognito.userPoolId && _config.cognito.userPoolClientId && _config.cognito.region)) {
        $('#noCognitoMessage').show();
        return;
    }
    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    function register(email, password, onSuccess, onFailure) {
        var dataEmail = { Name: 'email', Value: email };
        var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
        userPool.signUp(email, password, [attributeEmail], null, function signUpCallback(err, result) {
            if (!err) { onSuccess(result); } else { onFailure(err); }
        });
    }

    function signin(email, password, onSuccess, onFailure) {
        var authenticationData = { Username: email, Password: password };
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    }

    function verify(email, code, onSuccess, onFailure) {
        createCognitoUser(email).confirmRegistration(code, true, function confirmCallback(err, result) {
            if (!err) { onSuccess(result); } else { onFailure(err); }
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });
    }

    function getCurrentUser() {
        return userPool.getCurrentUser();
    }

    function getIdToken(callback) {
        var currentUser = getCurrentUser();
        if (currentUser !== null) {
            currentUser.getSession(function sessionCallback(err, session) {
                if (err) { callback(err); }
                else if (!session.isValid()) { callback(new Error('Session is invalid')); }
                else { callback(null, session.getIdToken().getJwtToken()); }
            });
        } else { callback(new Error('No user logged in')); }
    }

    function signOut() {
        if (getCurrentUser()) { getCurrentUser().signOut(); }
    }

    window.WildRydes = window.WildRydes || {};
    window.WildRydes.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var currentUser = getCurrentUser();
        if (currentUser !== null) {
            currentUser.getSession(function sessionCallback(err, session) {
                if (err) { reject(err); }
                else if (!session.isValid()) { reject(new Error('Session is invalid')); }
                else { resolve(session.getIdToken().getJwtToken()); }
            });
        } else { resolve(null); }
    });

    $(function onDocReady() {
        $('#signOutButton').click(function onSignOutButtonClick() {
            signOut();
            window.location.href = signinUrl;
        });

        var registerForm = $('#registrationForm');
        if (registerForm.length) {
            registerForm.submit(function onRegSubmit(e) {
                e.preventDefault();
                var email = $('#emailInputRegister').val();
                var password = $('#passwordInputRegister').val();
                var password2 = $('#password2InputRegister').val();
                if (password !== password2) { alert('Passwords do not match'); return; }
                register(email, password,
                    function regSuccess(result) {
                        alert('Registration successful! Check your email for verification code.');
                        window.location.href = verifyUrl + '?email=' + encodeURIComponent(email);
                    },
                    function regFailure(err) { alert(err.message || JSON.stringify(err)); }
                );
            });
        }

        var verifyForm = $('#verifyForm');
        if (verifyForm.length) {
            var urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('email')) { $('#emailInputVerify').val(urlParams.get('email')); }
            verifyForm.submit(function onVerifySubmit(e) {
                e.preventDefault();
                verify($('#emailInputVerify').val(), $('#codeInputVerify').val(),
                    function verifySuccess(result) {
                        alert('Verification successful! You can now sign in.');
                        window.location.href = signinUrl;
                    },
                    function verifyFailure(err) { alert(err.message || JSON.stringify(err)); }
                );
            });
        }

        var signinForm = $('#signinForm');
        if (signinForm.length) {
            signinForm.submit(function onSignInSubmit(e) {
                e.preventDefault();
                signin($('#emailInputSignin').val(), $('#passwordInputSignin').val(),
                    function signinSuccess(result) { window.location.href = '/ride.html'; },
                    function signinFailure(err) { alert(err.message || JSON.stringify(err)); }
                );
            });
        }
    });
}(jQuery));
