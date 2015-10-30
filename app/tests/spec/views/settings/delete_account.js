/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define([
  'chai',
  'jquery',
  'sinon',
  'views/settings/delete_account',
  'lib/fxa-client',
  'lib/promise',
  'lib/auth-errors',
  'lib/metrics',
  'lib/channels/null',
  'models/reliers/relier',
  'models/auth_brokers/base',
  'models/user',
  'lib/channels/notifier',
  '../../../mocks/router',
  '../../../lib/helpers',
  'lib/key-codes'
],
function (chai, $, sinon, View, FxaClient, p, AuthErrors, Metrics, NullChannel,
    Relier, Broker, User, Notifier, RouterMock, TestHelpers, KeyCodes) {
  'use strict';

  var assert = chai.assert;
  var wrapAssertion = TestHelpers.wrapAssertion;

  describe('views/settings/delete_account', function () {
    var UID = '123';
    var account;
    var broker;
    var email;
    var fxaClient;
    var metrics;
    var notifier;
    var password = 'password';
    var relier;
    var routerMock;
    var tabChannelMock;
    var user;
    var view;

    beforeEach(function () {
      fxaClient = new FxaClient();
      metrics = new Metrics();
      relier = new Relier();
      routerMock = new RouterMock();
      tabChannelMock = new NullChannel();
      user = new User();

      broker = new Broker({
        relier: relier
      });

      notifier = new Notifier({
        tabChannel: tabChannelMock
      });

      view = new View({
        broker: broker,
        fxaClient: fxaClient,
        metrics: metrics,
        notifier: notifier,
        relier: relier,
        router: routerMock,
        user: user
      });
    });

    afterEach(function () {
      $(view.el).remove();
      view.destroy();
      view = null;
      routerMock = null;
    });

    describe('with session', function () {
      beforeEach(function () {
        email = TestHelpers.createEmail();
        sinon.stub(view.fxaClient, 'isSignedIn', function () {
          return true;
        });

        account = user.initAccount({
          email: email,
          sessionToken: 'abc123',
          verified: true
        });
        account.set('uid', UID);

        sinon.stub(view, 'getSignedInAccount', function () {
          return account;
        });
        sinon.spy(notifier, 'trigger', function () { });

        return view.render()
          .then(function () {
            $('body').append(view.el);
          });
      });

      describe('isValid', function () {
        it('returns true if password is filled out', function () {
          $('form input[type=password]').val(password);

          assert.equal(view.isValid(), true);
        });

        it('returns false if password is too short', function () {
          $('form input[type=password]').val('passwor');

          assert.equal(view.isValid(), false);
        });
      });

      describe('showValidationErrors', function () {
        it('shows an error if the password is invalid', function (done) {
          view.$('[type=email]').val('testuser@testuser.com');
          view.$('[type=password]').val('passwor');

          view.on('validation_error', function (which, msg) {
            wrapAssertion(function () {
              assert.ok(msg);
            }, done);
          });

          view.showValidationErrors();
        });
      });

      it('has floating labels on input', function () {
        view.$('#password').val('a');
        var event = new $.Event('input');
        event.which = KeyCodes.ENTER;

        assert.isFalse(view.$('.label-helper').text().length > 0);
        view.$('#password').trigger(event);
        assert.isTrue(view.$('.label-helper').text().length > 0);
      });

      describe('submit', function () {
        it('deletes the users account, redirect to signup', function () {
          $('form input[type=email]').val(email);
          $('form input[type=password]').val(password);

          sinon.stub(view.fxaClient, 'deleteAccount', function () {
            return p();
          });

          sinon.stub(user, 'removeAccount', function () {
          });

          sinon.spy(broker, 'afterDeleteAccount');
          sinon.stub(view, 'navigate', function () {
          });

          return view.submit()
              .then(function () {
                assert.equal(view.navigate.args[0][0], 'signup');
                assert.ok(view.navigate.args[0][1].success);
                assert.isTrue(view.fxaClient.deleteAccount
                  .calledWith(email, password));
                assert.isTrue(user.removeAccount.calledWith(account));
                assert.isTrue(broker.afterDeleteAccount.calledWith(account));
                assert.isTrue(TestHelpers.isEventLogged(metrics, 'settings.delete-account.deleted'));
                assert.isTrue(notifier.trigger.calledWith(Notifier.DELETE, { uid: UID }));
              });
        });

        it('shows error message to locked out users', function () {
          sinon.stub(view.fxaClient, 'deleteAccount', function () {
            return p.reject(AuthErrors.toError('ACCOUNT_LOCKED'));
          });

          $('form input[type=email]').val(email);
          $('form input[type=password]').val(password);
          return view.submit()
            .then(function () {
              assert.isTrue(view.isErrorVisible());
              assert.include(view.$('.error').text().toLowerCase(), 'locked');
              var err = view._normalizeError(AuthErrors.toError('ACCOUNT_LOCKED'));
              assert.isTrue(TestHelpers.isErrorLogged(metrics, err));
              assert.isTrue(account.has('password'));
            });
        });

        it('re-throws other errors', function () {
          sinon.stub(view.fxaClient, 'deleteAccount', function () {
            return p.reject(AuthErrors.toError('UNEXPECTED_ERROR'));
          });

          $('form input[type=email]').val(email);
          $('form input[type=password]').val(password);
          return view.submit()
            .then(assert.fail, function (err) {
              assert.isTrue(AuthErrors.is(err, 'UNEXPECTED_ERROR'));
            });
        });
      });

    });
  });
});
